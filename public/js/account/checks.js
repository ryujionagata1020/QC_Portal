// チェック問題セクション
var currentChecksColor = 'yellow';
var checksEditMode = false;
var checksCurrentData = [];

function switchChecksTab(color) {
  currentChecksColor = color;
  checksEditMode = false;
  updateEditBtnText();

  var tabs = document.querySelectorAll('.checks-tabs .account-tab');
  tabs.forEach(function(tab) {
    tab.classList.remove('active');
    if (tab.dataset.checkColor === color) {
      tab.classList.add('active');
    }
  });

  // 復習確認を閉じる
  cancelChecksReview();
  loadChecksData(color);
}

async function loadChecksData(color) {
  var loadingEl = document.getElementById('checksLoading');
  var emptyEl = document.getElementById('checksEmpty');
  var listEl = document.getElementById('checksList');

  loadingEl.style.display = 'block';
  emptyEl.style.display = 'none';
  listEl.innerHTML = '';

  try {
    var response = await fetch('/account/checks/' + color);
    var data = await response.json();

    loadingEl.style.display = 'none';
    checksCurrentData = data.checks || [];

    if (checksCurrentData.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    renderChecksTable(checksCurrentData);
  } catch (err) {
    console.error('チェック問題取得エラー:', err);
    loadingEl.style.display = 'none';
    emptyEl.textContent = 'データの取得に失敗しました';
    emptyEl.style.display = 'block';
  }
}

function renderChecksTable(checks) {
  var listEl = document.getElementById('checksList');
  listEl.innerHTML = '';

  var table = document.createElement('table');
  table.className = 'history-table';

  var thead = document.createElement('thead');
  var headerHtml = '\
    <tr>\
      <th>問題ID</th>\
      <th>カテゴリ分野</th>\
      <th>チェック日</th>';
  if (checksEditMode) {
    headerHtml += '<th>操作</th>';
  }
  headerHtml += '</tr>';
  thead.innerHTML = headerHtml;
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  checks.forEach(function(item) {
    var tr = document.createElement('tr');
    tr.id = 'checks-row-' + item.question_id;
    var dateStr = new Date(item.created_at).toLocaleDateString('ja-JP');
    var rowHtml = '\
      <td><a href="/account/view/' + escapeHtmlAttr(item.question_id) + '" class="history-question-link">' + escapeHtmlText(item.question_id) + '</a></td>\
      <td>' + escapeHtmlText(item.small_category_name || '') + '</td>\
      <td>' + escapeHtmlText(dateStr) + '</td>';
    if (checksEditMode) {
      rowHtml += '<td><button class="checks-remove-btn" onclick="removeCheck(\'' + escapeHtmlAttr(item.question_id) + '\')">解除</button></td>';
    }
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  listEl.appendChild(table);
}

// === 復習機能 ===
function startChecksReview() {
  var count = checksCurrentData.length;
  if (count === 0) return;

  var colorLabel = { yellow: '黄色', green: '緑', red: '赤' };
  document.getElementById('checksReviewCount').textContent =
    colorLabel[currentChecksColor] + 'のチェック問題：' + count + '問';
  document.getElementById('checksReviewConfirm').style.display = 'flex';
}

async function confirmChecksReview() {
  try {
    var csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    var response = await fetch('/questions/start-from-checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ color: currentChecksColor })
    });
    var data = await response.json();

    if (data.success && data.firstId) {
      window.location.href = '/questions/' + data.firstId;
    }
  } catch (err) {
    console.error('復習開始エラー:', err);
  }
}

function cancelChecksReview() {
  document.getElementById('checksReviewConfirm').style.display = 'none';
}

// === 編集モード ===
function toggleChecksEditMode() {
  checksEditMode = !checksEditMode;
  updateEditBtnText();
  if (checksCurrentData.length > 0) {
    renderChecksTable(checksCurrentData);
  }
}

function updateEditBtnText() {
  var btn = document.querySelector('.checks-edit-btn');
  if (btn) {
    btn.textContent = checksEditMode ? '完了' : '編集';
  }
}

async function removeCheck(questionId) {
  try {
    var csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    await fetch('/questions/' + questionId + '/check', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ color: currentChecksColor })
    });

    // 行に解除済みスタイルを適用
    var row = document.getElementById('checks-row-' + questionId);
    if (row) {
      row.classList.add('checks-removed');
      var removeBtn = row.querySelector('.checks-remove-btn');
      if (removeBtn) {
        removeBtn.textContent = '解除済み';
        removeBtn.disabled = true;
      }
    }

    // データからも除外（復習ボタンの件数に反映）
    checksCurrentData = checksCurrentData.filter(function(item) {
      return item.question_id !== questionId;
    });
  } catch (err) {
    console.error('チェック解除エラー:', err);
  }
}

function escapeHtmlText(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function escapeHtmlAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
