// レーダーチャートセクション
var currentRadarLevel = (typeof defaultAccountLevel !== 'undefined') ? defaultAccountLevel : 4;
var radarCharts = [];

// レーダータブ切り替え
function switchRadarTab(level) {
  currentRadarLevel = level;

  var tabs = document.querySelectorAll('.radar-tabs .account-tab');
  tabs.forEach(function(tab) {
    tab.classList.remove('active');
    if (parseInt(tab.dataset.level) === level) {
      tab.classList.add('active');
    }
  });

  loadRadarData(currentRadarLevel);
}

// レーダーチャートデータを読み込み・描画
async function loadRadarData(testlevel) {
  var loadingEl = document.getElementById('radarLoading');
  var emptyEl = document.getElementById('radarEmpty');
  var chartsContainer = document.getElementById('radarChartsContainer');

  loadingEl.style.display = 'flex';
  emptyEl.style.display = 'none';
  chartsContainer.style.display = 'none';

  try {
    await loadChartJs();

    var response = await fetch('/account/achievement/' + testlevel);
    var data = await response.json();

    loadingEl.style.display = 'none';

    if (Object.keys(data.categories).length === 0) {
      emptyEl.style.display = 'flex';
      return;
    }

    // 既存のレーダーチャートを全て破棄
    radarCharts.forEach(function(chart) { chart.destroy(); });
    radarCharts = [];
    chartsContainer.innerHTML = '';

    // 1. DOM要素を先に全て構築
    var canvasList = [];
    Object.entries(data.categories).forEach(function(entry) {
      var largeCategoryName = entry[0];
      var smallCategories = entry[1];

      var chartBlock = document.createElement('div');
      chartBlock.className = 'radar-chart-block';

      var header = document.createElement('div');
      header.className = 'radar-chart-header';
      header.textContent = largeCategoryName;
      chartBlock.appendChild(header);

      var canvasWrapper = document.createElement('div');
      canvasWrapper.className = 'radar-chart-wrapper';

      var canvas = document.createElement('canvas');
      canvasWrapper.appendChild(canvas);
      chartBlock.appendChild(canvasWrapper);

      chartsContainer.appendChild(chartBlock);

      var labels = smallCategories.map(function(s) { return s.small_category_name; });
      var values = smallCategories.map(function(s) { return s.accuracy; });
      var values2w = smallCategories.map(function(s) { return s.accuracy_2w; });
      var values1m = smallCategories.map(function(s) { return s.accuracy_1m; });

      // レーダーチャートは最低3軸必要（2以下だと描画が不安定になる）
      while (labels.length < 3) {
        labels.push('');
        values.push(0);
        values2w.push(0);
        values1m.push(0);
      }

      canvasList.push({
        canvas: canvas,
        labels: labels,
        values: values,
        values2w: values2w,
        values1m: values1m
      });
    });

    // 2. グリッド表示にしてレイアウトを確定
    chartsContainer.style.display = 'grid';

    // 3. 二重rAFでレイアウト完全確定を待ってからChart.jsを初期化
    requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      canvasList.forEach(function(item) {
        var ctx = item.canvas.getContext('2d');
        var chart = new Chart(ctx, {
          type: 'radar',
          data: {
            labels: item.labels,
            datasets: [
              {
                label: '1か月前',
                data: item.values1m,
                backgroundColor: 'rgba(232, 148, 62, 0.08)',
                borderColor: '#e8943e',
                borderWidth: 1.5,
                borderDash: [6, 3],
                pointBackgroundColor: '#e8943e',
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                pointRadius: 3,
                pointHoverRadius: 5
              },
              {
                label: '2週間前',
                data: item.values2w,
                backgroundColor: 'rgba(59, 157, 221, 0.08)',
                borderColor: '#3b9ddd',
                borderWidth: 1.5,
                borderDash: [4, 2],
                pointBackgroundColor: '#3b9ddd',
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                pointRadius: 3,
                pointHoverRadius: 5
              },
              {
                label: '現在',
                data: item.values,
                backgroundColor: 'rgba(139, 108, 207, 0.2)',
                borderColor: '#8b6ccf',
                borderWidth: 2,
                pointBackgroundColor: '#8b6ccf',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: false,
            scales: {
              r: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  stepSize: 20,
                  callback: function(value) { return value + '%'; },
                  font: { size: 10 },
                  backdropColor: 'transparent'
                },
                pointLabels: {
                  font: { size: 11 },
                  color: '#333'
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.08)'
                },
                angleLines: {
                  color: 'rgba(0, 0, 0, 0.08)'
                }
              }
            },
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return context.dataset.label + ': ' + context.parsed.r + '%';
                  }
                }
              }
            }
          }
        });

        radarCharts.push(chart);
      });
    });
    });

  } catch (err) {
    console.error('レーダーチャートデータ取得エラー:', err);
    loadingEl.style.display = 'none';
    emptyEl.textContent = 'データの取得に失敗しました';
    emptyEl.style.display = 'flex';
  }
}
