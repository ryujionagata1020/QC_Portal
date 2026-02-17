// アクティビティセクション
var currentActivityLevel = (typeof defaultAccountLevel !== 'undefined') ? defaultAccountLevel : 4;
var currentActivityUnit = 'daily';
var activityChart = null;

// アクティビティタブ切り替え
function switchActivityTab(level) {
  currentActivityLevel = level;

  var tabs = document.querySelectorAll('.activity-tabs .account-tab');
  tabs.forEach(function(tab) {
    tab.classList.remove('active');
    if (parseInt(tab.dataset.level) === level) {
      tab.classList.add('active');
    }
  });

  loadActivityData(currentActivityLevel, currentActivityUnit);
}

// 時間単位切り替え
function switchActivityUnit(unit) {
  currentActivityUnit = unit;

  var buttons = document.querySelectorAll('.activity-unit-btn');
  buttons.forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.dataset.unit === unit) {
      btn.classList.add('active');
    }
  });

  loadActivityData(currentActivityLevel, currentActivityUnit);
}

// 期間ラベルの連続配列を生成（gap-filling用）
function generatePeriodLabels(unit) {
  var labels = [];
  var now = new Date();

  if (unit === 'daily') {
    for (var i = 29; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toISOString().slice(0, 10));
    }
  } else if (unit === 'weekly') {
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      var isoYear = getISOWeekYear(d);
      var isoWeek = getISOWeek(d);
      labels.push(isoYear + '-W' + String(isoWeek).padStart(2, '0'));
    }
  } else if (unit === 'monthly') {
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      labels.push(y + '-' + m);
    }
  } else if (unit === 'yearly') {
    for (var i = 4; i >= 0; i--) {
      labels.push(String(now.getFullYear() - i));
    }
  }

  return labels;
}

// ISO週番号を計算
function getISOWeek(date) {
  var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getISOWeekYear(date) {
  var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

// 表示用ラベルへの変換
function formatLabel(periodKey, unit) {
  if (unit === 'daily') {
    return periodKey.slice(5).replace('-', '/');
  } else if (unit === 'weekly') {
    var weekPart = periodKey.split('-W')[1];
    return '第' + parseInt(weekPart) + '週';
  } else if (unit === 'monthly') {
    var parts = periodKey.split('-');
    return parts[0] + '年' + parseInt(parts[1]) + '月';
  } else if (unit === 'yearly') {
    return periodKey + '年';
  }
  return periodKey;
}

// アクティビティデータを読み込み・描画
async function loadActivityData(testlevel, unit) {
  var loadingEl = document.getElementById('activityLoading');
  var emptyEl = document.getElementById('activityEmpty');
  var chartContainer = document.getElementById('activityChartContainer');

  loadingEl.style.display = 'flex';
  emptyEl.style.display = 'none';
  chartContainer.style.display = 'none';

  try {
    await loadChartJs();

    var response = await fetch('/account/activity/' + testlevel + '?unit=' + unit);
    var result = await response.json();

    loadingEl.style.display = 'none';

    // データをMapに変換（回答数 + 正解数）
    var answerMap = {};
    var correctMap = {};
    var hasData = false;
    result.data.forEach(function(row) {
      answerMap[row.period_key] = row.answer_count;
      correctMap[row.period_key] = row.correct_count || 0;
      if (row.answer_count > 0) hasData = true;
    });

    if (!hasData) {
      emptyEl.style.display = 'flex';
      return;
    }

    chartContainer.style.display = 'block';

    // 連続ラベルを生成してgap-fill
    var allLabels = generatePeriodLabels(unit);
    var displayLabels = allLabels.map(function(l) { return formatLabel(l, unit); });
    var answerValues = allLabels.map(function(l) { return answerMap[l] || 0; });
    var accuracyValues = allLabels.map(function(l) {
      var ans = answerMap[l] || 0;
      var cor = correctMap[l] || 0;
      return ans > 0 ? Math.round((cor / ans) * 100) : null;
    });

    renderActivityChart(displayLabels, answerValues, accuracyValues);

  } catch (err) {
    console.error('アクティビティデータ取得エラー:', err);
    loadingEl.style.display = 'none';
    emptyEl.textContent = 'データの取得に失敗しました';
    emptyEl.style.display = 'flex';
  }
}

// Chart.js で複合グラフを描画（回答数: 棒グラフ + 正答率: 折れ線グラフ）
function renderActivityChart(labels, answerData, accuracyData) {
  if (activityChart) {
    activityChart.destroy();
    activityChart = null;
  }
  var container = document.getElementById('activityChartContainer');
  var oldCanvas = document.getElementById('activityChart');
  if (oldCanvas) oldCanvas.remove();
  var newCanvas = document.createElement('canvas');
  newCanvas.id = 'activityChart';
  container.appendChild(newCanvas);

  var ctx = newCanvas.getContext('2d');

  activityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '回答数',
          data: answerData,
          type: 'bar',
          backgroundColor: 'rgba(139, 108, 207, 0.5)',
          borderColor: '#8b6ccf',
          borderWidth: 1,
          borderRadius: 3,
          yAxisID: 'y',
          order: 2
        },
        {
          label: '正答率',
          data: accuracyData,
          type: 'line',
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointBackgroundColor: '#28a745',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: true,
          yAxisID: 'y1',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          beginAtZero: true,
          position: 'left',
          ticks: {
            stepSize: 1,
            callback: function(value) {
              if (Number.isInteger(value)) return value + '問';
              return null;
            }
          },
          title: {
            display: true,
            text: '回答数',
            font: { size: 13 }
          }
        },
        y1: {
          beginAtZero: true,
          max: 100,
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            stepSize: 20,
            callback: function(value) {
              return value + '%';
            }
          },
          title: {
            display: true,
            text: '正答率',
            font: { size: 13 }
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            font: { size: 11 }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 16,
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.dataset.yAxisID === 'y1') {
                return '正答率: ' + (context.parsed.y !== null ? context.parsed.y + '%' : 'N/A');
              }
              return '回答数: ' + context.parsed.y + '問';
            }
          }
        }
      }
    }
  });
}
