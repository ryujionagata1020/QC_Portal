// 設定セクション

// テーマ切り替え処理
function toggleThemeFromSettings() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  // テーマを適用
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);

  // UI更新
  updateThemeUI(newTheme);
}

function updateThemeUI(theme) {
  const label = document.getElementById('currentThemeLabel');
  const button = document.getElementById('themeToggleBtn');

  if (label && button) {
    if (theme === 'dark') {
      label.textContent = 'ダークモード';
      button.textContent = 'ライトモードに切替';
    } else {
      label.textContent = 'ライトモード';
      button.textContent = 'ダークモードに切替';
    }
  }
}

// 設定画面が開かれた時にテーマUIを初期化
function initThemeUI() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeUI(currentTheme);
}

// 総学習問題数を取得
async function loadTotalLearnedCount() {
  var countEl = document.getElementById('totalLearnedCount');
  if (!countEl) return;

  countEl.textContent = '読み込み中...';

  try {
    var response = await fetch('/account/stats/total-learned');
    var data = await response.json();

    if (data.count !== undefined) {
      countEl.textContent = data.count + ' 問';
    } else {
      countEl.textContent = '取得に失敗しました';
    }
  } catch (err) {
    console.error('総学習問題数取得エラー:', err);
    countEl.textContent = '取得に失敗しました';
  }
}

// パスワード変更モーダルを開く
function openPasswordChangeModal() {
  alert('パスワード変更機能は準備中です。');
}

// メールアドレス登録モーダルを開く
function openEmailRegisterModal() {
  alert('メールアドレス登録機能は準備中です。');
}

// アカウント削除確認
function confirmDeleteAccount() {
  if (confirm('本当にアカウントを削除しますか？\nこの操作は取り消せません。')) {
    deleteAccount();
  }
}

// アカウント削除実行
async function deleteAccount() {
  try {
    var csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    var response = await fetch('/account/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      }
    });
    var data = await response.json();

    if (data.success) {
      alert('アカウントが削除されました。');
      window.location.href = '/';
    } else {
      alert('アカウントの削除に失敗しました。');
    }
  } catch (err) {
    console.error('アカウント削除エラー:', err);
    alert('アカウントの削除に失敗しました。');
  }
}
