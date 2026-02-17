// ==== 認証モーダル制御 ====
function openAuthModal() {
  document.getElementById('authModal').style.display = 'block';
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
  clearAuthMessages();
}

function switchAuthTab(tab) {
  var tabs = document.querySelectorAll('.auth-tab');
  var forms = document.querySelectorAll('.auth-form-container');

  tabs.forEach(function(t) { t.classList.remove('active'); });
  forms.forEach(function(f) { f.classList.remove('active'); });

  if (tab === 'login') {
    tabs[0].classList.add('active');
    document.getElementById('loginForm').classList.add('active');
  } else {
    tabs[1].classList.add('active');
    document.getElementById('registerForm').classList.add('active');
  }

  clearAuthMessages();
}

function clearAuthMessages() {
  document.getElementById('loginMessage').textContent = '';
  document.getElementById('registerMessage').textContent = '';
}

// モーダル外をクリックしたら閉じる
window.addEventListener('click', function(event) {
  var modal = document.getElementById('authModal');
  if (modal && event.target === modal) {
    closeAuthModal();
  }
});

// ==== ログイン処理 ====
async function handleLogin(event) {
  event.preventDefault();
  var form = event.target;
  var user_id = form.user_id.value;
  var password = form.password.value;
  var rememberMe = form.rememberMe.checked;

  try {
    var csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    var response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ user_id: user_id, password: password, rememberMe: rememberMe })
    });

    var data = await response.json();
    var messageEl = document.getElementById('loginMessage');

    if (data.success) {
      messageEl.textContent = data.message;
      messageEl.style.color = 'green';
      setTimeout(function() {
        location.reload();
      }, 1000);
    } else {
      messageEl.textContent = data.message;
      messageEl.style.color = 'red';
    }
  } catch (error) {
    console.error('Login error:', error);
    document.getElementById('loginMessage').textContent = 'ログインに失敗しました。';
    document.getElementById('loginMessage').style.color = 'red';
  }
}

// ==== 新規登録処理 ====
async function handleRegister(event) {
  event.preventDefault();
  var form = event.target;
  var user_id = form.user_id.value;
  var password = form.password.value;
  var mail = form.mail.value;

  try {
    var csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    var response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ user_id: user_id, password: password, mail: mail })
    });

    var data = await response.json();
    var messageEl = document.getElementById('registerMessage');

    if (data.success) {
      messageEl.textContent = data.message;
      messageEl.style.color = 'green';
      form.reset();
      setTimeout(function() {
        switchAuthTab('login');
      }, 2000);
    } else {
      messageEl.textContent = data.message;
      messageEl.style.color = 'red';
    }
  } catch (error) {
    console.error('Register error:', error);
    document.getElementById('registerMessage').textContent = '登録に失敗しました。';
    document.getElementById('registerMessage').style.color = 'red';
  }
}
