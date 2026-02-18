// アカウントモーダル制御・セクション切り替え
var currentSection = 'activity';

function openAccountModal() {
  document.getElementById('accountModal').style.display = 'block';
  if (currentSection === 'activity') {
    loadActivityData(currentActivityLevel, currentActivityUnit);
  }
}

function closeAccountModal() {
  document.getElementById('accountModal').style.display = 'none';
}

// セクション切り替え
function switchAccountSection(section) {
  currentSection = section;

  // メニューの active 状態を切り替え
  var menuItems = document.querySelectorAll('.account-menu-item');
  menuItems.forEach(function(item) {
    item.classList.remove('active');
    if (item.dataset.section === section) {
      item.classList.add('active');
    }
  });

  // セクションの表示を切り替え
  var sections = document.querySelectorAll('.account-section');
  sections.forEach(function(sec) {
    sec.classList.remove('active');
  });
  document.getElementById('section-' + section).classList.add('active');

  // 各セクションのデータ読み込み
  if (section === 'history') {
    loadAccountHistory(currentAccountLevel);
  }
  if (section === 'settings') {
    loadTotalLearnedCount();
    initThemeUI();
  }
  if (section === 'achievement') {
    loadAchievementData(currentAchievementLevel);
  }
  if (section === 'activity') {
    loadActivityData(currentActivityLevel, currentActivityUnit);
  }
  if (section === 'radar') {
    loadRadarData(currentRadarLevel);
  }
  if (section === 'checks') {
    loadChecksData(currentChecksColor);
  }
}

// モーダル外をクリックしたら閉じる
window.addEventListener('click', function(event) {
  var modal = document.getElementById('accountModal');
  if (event.target === modal) {
    closeAccountModal();
  }
});
