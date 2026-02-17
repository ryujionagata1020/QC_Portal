// 達成度セクション
var currentAchievementLevel = (typeof defaultAccountLevel !== 'undefined') ? defaultAccountLevel : 4;

function switchAchievementTab(level) {
  currentAchievementLevel = level;

  var tabs = document.querySelectorAll('.achievement-tabs .account-tab');
  tabs.forEach(function(tab) {
    tab.classList.remove('active');
    if (parseInt(tab.dataset.level) === level) {
      tab.classList.add('active');
    }
  });

  loadAchievementData(level);
}

// 達成度データを読み込む
async function loadAchievementData(testlevel) {
  var loadingEl = document.getElementById('achievementLoading');
  var emptyEl = document.getElementById('achievementEmpty');
  var dataEl = document.getElementById('achievementData');

  loadingEl.style.display = 'flex';
  emptyEl.style.display = 'none';
  dataEl.style.display = 'none';

  try {
    var response = await fetch('/account/achievement/' + testlevel);
    var data = await response.json();

    loadingEl.style.display = 'none';

    if (Object.keys(data.categories).length === 0) {
      emptyEl.style.display = 'flex';
      return;
    }

    dataEl.style.display = 'block';

    // 網羅度レポートを更新
    var coveragePercent = data.coverage.total > 0
      ? Math.round((data.coverage.answered / data.coverage.total) * 100)
      : 0;
    document.getElementById('coverageBarFill').style.width = coveragePercent + '%';
    document.getElementById('coverageText').textContent = data.coverage.answered + ' / ' + data.coverage.total + ' 問';
    document.getElementById('coveragePercent').textContent = coveragePercent + '%';

    // カテゴリ別正解率を更新
    var categoryListEl = document.getElementById('categoryAccuracyList');
    categoryListEl.innerHTML = '';

    Object.entries(data.categories).forEach(function(entry) {
      var largeCategoryName = entry[0];
      var smallCategories = entry[1];

      var largeCategoryDiv = document.createElement('div');
      largeCategoryDiv.className = 'large-category-block';

      var header = document.createElement('div');
      header.className = 'large-category-header';
      header.textContent = largeCategoryName;
      largeCategoryDiv.appendChild(header);

      var smallList = document.createElement('div');
      smallList.className = 'small-category-list';

      smallCategories.forEach(function(small) {
        var smallItem = document.createElement('div');
        smallItem.className = 'small-category-item';

        var barColor = getAccuracyColor(small.accuracy);

        smallItem.innerHTML = '\
          <a href="#" class="small-category-name small-category-link"\
             data-small-id="' + small.small_category_id + '"\
             data-category-name="' + small.small_category_name + '">' + small.small_category_name + '</a>\
          <div class="accuracy-bar-container">\
            <div class="accuracy-bar">\
              <div class="accuracy-bar-fill" style="width: ' + small.accuracy + '%; background-color: ' + barColor + ';"></div>\
            </div>\
            <span class="accuracy-percent">' + small.accuracy + '%</span>\
          </div>\
        ';

        smallList.appendChild(smallItem);
      });

      largeCategoryDiv.appendChild(smallList);
      categoryListEl.appendChild(largeCategoryDiv);
    });

  } catch (err) {
    console.error('達成度データ取得エラー:', err);
    loadingEl.style.display = 'none';
    emptyEl.textContent = 'データの取得に失敗しました';
    emptyEl.style.display = 'flex';
  }
}

// 正解率に応じた色を返す
function getAccuracyColor(accuracy) {
  if (accuracy >= 80) return '#28a745';
  if (accuracy >= 60) return '#8b6ccf';
  if (accuracy >= 40) return '#ffc107';
  return '#dc3545';
}

// カテゴリリンククリック処理（イベント委譲）
document.getElementById('categoryAccuracyList').addEventListener('click', function(e) {
  var link = e.target.closest('.small-category-link');
  if (!link) return;
  e.preventDefault();

  var smallId = link.dataset.smallId;
  var categoryName = link.dataset.categoryName;

  document.getElementById('categoryConfirmName').textContent = categoryName;
  document.getElementById('categoryStartSmallId').value = smallId;
  document.getElementById('categoryConfirmOverlay').classList.add('active');
});

// 「解く！」ボタン
document.getElementById('categoryConfirmOk').addEventListener('click', function() {
  document.getElementById('categoryConfirmOverlay').classList.remove('active');
  document.getElementById('categoryStartForm').submit();
});

// 「キャンセル」ボタン
document.getElementById('categoryConfirmCancel').addEventListener('click', function() {
  document.getElementById('categoryConfirmOverlay').classList.remove('active');
});

// オーバーレイ背景クリックで閉じる
document.getElementById('categoryConfirmOverlay').addEventListener('click', function(e) {
  if (e.target === this) {
    this.classList.remove('active');
  }
});
