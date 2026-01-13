const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const { executeQuery } = require('../lib/database/pool');

// ログイン処理
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'サーバーエラーが発生しました。' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: info.message });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'ログインに失敗しました。' });
      }

      // 「ログイン状態を保持する」がチェックされている場合
      if (req.body.rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30日間
      } else {
        req.session.cookie.expires = false; // ブラウザを閉じるまで
      }

      return res.json({
        success: true,
        message: 'ログインしました。',
        user: {
          user_id: user.user_id,
          mail: user.mail
        }
      });
    });
  })(req, res, next);
});

// 新規登録処理
router.post('/register', async (req, res) => {
  const { user_id, password, mail } = req.body;

  try {
    // バリデーション
    if (!user_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'ユーザーIDとパスワードは必須です。'
      });
    }

    if (user_id.length < 4 || user_id.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'ユーザーIDは4文字以上50文字以内で入力してください。'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'パスワードは8文字以上で入力してください。'
      });
    }

    // ユーザーIDの重複チェック
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE user_id = ?',
      [user_id]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'このユーザーIDは既に使用されています。'
      });
    }

    // パスワードのハッシュ化
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ユーザーをデータベースに登録
    await executeQuery(
      'INSERT INTO users (user_id, password_hash, mail) VALUES (?, ?, ?)',
      [user_id, hashedPassword, mail || null]
    );

    res.json({
      success: true,
      message: '新規登録が完了しました。ログインしてください。'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: '登録中にエラーが発生しました。'
    });
  }
});

// ログアウト処理
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'ログアウトに失敗しました。' });
    }
    req.session.destroy();
    res.json({ success: true, message: 'ログアウトしました。' });
  });
});

// ログイン状態チェック
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: {
        user_id: req.user.user_id,
        mail: req.user.mail
      }
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

module.exports = router;
