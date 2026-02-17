// プロフィール編集機能

// 編集フォームを表示
function startEditProfile(field) {
  var valueEl = document.getElementById('profileValue_' + field);
  var btnEl = document.getElementById('btnEdit_' + field);
  var formEl = document.getElementById('editForm_' + field);

  // フィールド名をID用に変換
  var idMap = {
    'user_name': 'UserName',
    'want_grade1': 'WantGrade1',
    'want_grade2': 'WantGrade2',
    'scheduled_exam_date': 'ScheduledExamDate'
  };
  var idSuffix = idMap[field];
  if (!idSuffix) return;

  valueEl = document.getElementById('profile' + idSuffix);
  btnEl = document.getElementById('btnEdit' + idSuffix);
  formEl = document.getElementById('editForm' + idSuffix);
  var inputEl = document.getElementById('input' + idSuffix);

  if (!valueEl || !btnEl || !formEl || !inputEl) return;

  // 現在の値をinputにセット
  var currentValue = valueEl.textContent.trim();
  if (currentValue === '未設定' || currentValue === '') {
    inputEl.value = '';
  } else if (field === 'scheduled_exam_date') {
    // 表示形式(YYYY/MM/DD)からinput[type=date]形式(YYYY-MM-DD)に変換
    inputEl.value = currentValue.replace(/\//g, '-');
  } else {
    inputEl.value = currentValue;
  }

  // 表示切り替え
  valueEl.style.display = 'none';
  btnEl.style.display = 'none';
  formEl.style.display = 'flex';

  inputEl.focus();
}

// 編集キャンセル
function cancelEditProfile(field) {
  var idMap = {
    'user_name': 'UserName',
    'want_grade1': 'WantGrade1',
    'want_grade2': 'WantGrade2',
    'scheduled_exam_date': 'ScheduledExamDate'
  };
  var idSuffix = idMap[field];
  if (!idSuffix) return;

  var valueEl = document.getElementById('profile' + idSuffix);
  var btnEl = document.getElementById('btnEdit' + idSuffix);
  var formEl = document.getElementById('editForm' + idSuffix);

  if (!valueEl || !btnEl || !formEl) return;

  valueEl.style.display = '';
  btnEl.style.display = '';
  formEl.style.display = 'none';
}

// プロフィール保存
async function saveProfile(field) {
  var idMap = {
    'user_name': 'UserName',
    'want_grade1': 'WantGrade1',
    'want_grade2': 'WantGrade2',
    'scheduled_exam_date': 'ScheduledExamDate'
  };
  var idSuffix = idMap[field];
  if (!idSuffix) return;

  var inputEl = document.getElementById('input' + idSuffix);
  var valueEl = document.getElementById('profile' + idSuffix);
  var btnEl = document.getElementById('btnEdit' + idSuffix);
  var formEl = document.getElementById('editForm' + idSuffix);

  if (!inputEl) return;

  var newValue = inputEl.value.trim();

  // user_nameのバリデーション
  if (field === 'user_name' && newValue.length > 50) {
    alert('ユーザー名は50文字以内で入力してください。');
    return;
  }

  try {
    var csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    var response = await fetch('/account/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ field: field, value: newValue })
    });

    var data = await response.json();

    if (data.success) {
      // 表示を更新
      if (field === 'user_name') {
        valueEl.textContent = newValue || '';
      } else if (field === 'scheduled_exam_date') {
        valueEl.textContent = newValue ? newValue.replace(/-/g, '/') : '未設定';
      } else {
        valueEl.textContent = newValue || '未設定';
      }

      // フォームを閉じる
      valueEl.style.display = '';
      btnEl.style.display = '';
      formEl.style.display = 'none';
    } else {
      alert(data.error || 'プロフィールの更新に失敗しました。');
    }
  } catch (err) {
    console.error('プロフィール更新エラー:', err);
    alert('プロフィールの更新に失敗しました。');
  }
}
