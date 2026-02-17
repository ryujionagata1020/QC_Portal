// 学習履歴セクション
var currentAccountLevel = (typeof defaultAccountLevel !== 'undefined') ? defaultAccountLevel : 4;

function switchAccountTab(level) {
  currentAccountLevel = level;

  // タブの active 状態を切り替え
  var tabs = document.querySelectorAll('.account-tabs:not(.achievement-tabs):not(.activity-tabs):not(.radar-tabs) .account-tab');
  tabs.forEach(function(tab) {
    tab.classList.remove('active');
    if (parseInt(tab.dataset.level) === level) {
      tab.classList.add('active');
    }
  });

  loadAccountHistory(level);
}

// 習熟度マーク判定
function getMasteryMark(attempts) {
  if (attempts.length === 0) return { mark: '-', cls: '' };
  if (!attempts[0].is_correct) return { mark: '×', cls: 'mastery-incorrect' };
  if (attempts.length >= 2 && attempts[0].is_correct && attempts[1].is_correct) {
    return { mark: '◎', cls: 'mastery-excellent' };
  }
  return { mark: '〇', cls: 'mastery-good' };
}

async function loadAccountHistory(testlevel) {
  var loadingEl = document.getElementById('historyLoading');
  var emptyEl = document.getElementById('historyEmpty');
  var listEl = document.getElementById('historyList');

  loadingEl.style.display = 'block';
  emptyEl.style.display = 'none';
  listEl.innerHTML = '';

  try {
    var response = await fetch('/account/history/' + testlevel);
    var data = await response.json();

    loadingEl.style.display = 'none';

    if (!data.history || data.history.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    // テーブル形式で履歴を表示
    var table = document.createElement('table');
    table.className = 'history-table';

    var thead = document.createElement('thead');
    thead.innerHTML = '\
      <tr>\
        <th>問題ID</th>\
        <th>空欄</th>\
        <th>カテゴリ分野</th>\
        <th>習熟度</th>\
      </tr>\
    ';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    data.history.forEach(function(item) {
      var mastery = getMasteryMark(item.attempts);
      var tr = document.createElement('tr');
      tr.innerHTML = '\
        <td><a href="/account/view/' + item.question_id + '" class="history-question-link">' + item.question_id + '</a></td>\
        <td>(' + item.blank_number + ')</td>\
        <td>' + (item.small_category_name || '') + '</td>\
        <td><span class="mastery-mark ' + mastery.cls + '">' + mastery.mark + '</span></td>\
      ';
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    listEl.appendChild(table);

  } catch (err) {
    console.error('履歴取得エラー:', err);
    loadingEl.style.display = 'none';
    emptyEl.textContent = 'データの取得に失敗しました';
    emptyEl.style.display = 'block';
  }
}
