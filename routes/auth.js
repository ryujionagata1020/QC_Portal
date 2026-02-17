const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { executeQuery } = require('../lib/database/pool');
const { MySQLClient, sql } = require('../lib/database/client');

// レート制限: ログイン（同一IPから5回/分）
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'ログイン試行回数が上限に達しました。1分後に再度お試しください。' }
});

// レート制限: 新規登録（同一IPから5回/時）
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '登録試行回数が上限に達しました。1時間後に再度お試しください。' }
});

// ログイン処理
router.post('/login', loginLimiter, (req, res, next) => {
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

      // セッション固定攻撃防止: ログイン成功後にセッションIDを再生成
      const passport = req.session.passport;
      const csrfToken = req.session.csrfToken;
      const rememberMe = req.body.rememberMe;

      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'セッションの再生成に失敗しました。' });
        }

        // Passport ユーザ情報と CSRF トークンを新セッションに復元
        req.session.passport = passport;
        req.session.csrfToken = csrfToken;

        // DBから保存済みクイズセッションを復元
        (async () => {
          try {
            const restoreQuery = await sql('SELECT_quiz_session_BY_user_id');
            const savedSessions = await MySQLClient.executeQuery(restoreQuery, [user.user_id]);

            if (savedSessions.length > 0) {
              const saved = savedSessions[0];
              // MySQL JSON型は自動的に配列に変換される
              req.session.questionIds = saved.question_ids;
              req.session.currentIndex = saved.current_index;
              req.session.sessionStartedAt = saved.session_started_at;

              // DBから削除（セッションに復元済み）
              const deleteQuery = await sql('DELETE_quiz_session_BY_user_id');
              await MySQLClient.executeQuery(deleteQuery, [user.user_id]);
            }
          } catch (restoreErr) {
            console.error('Quiz session restore error:', restoreErr);
          }

          // 「ログイン状態を保持する」がチェックされている場合
          if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30日間
          } else {
            req.session.cookie.expires = false; // ブラウザを閉じるまで
          }

          req.session.save((err) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'セッションの保存に失敗しました。' });
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
        })();
      });
    });
  })(req, res, next);
});

// 新規登録処理
router.post('/register', registerLimiter, async (req, res) => {
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
router.post('/logout', async (req, res) => {
  try {
    // クイズセッションをDBに保存（認証済みで出題中の場合）
    if (req.isAuthenticated() && req.user && req.session.questionIds && req.session.questionIds.length > 0) {
      const userId = req.user.user_id;
      const questionIds = req.session.questionIds;
      const currentIndex = req.session.currentIndex || 0;
      // MySQL DATETIME形式に変換 (YYYY-MM-DD HH:MM:SS)
      const rawStartedAt = req.session.sessionStartedAt || new Date().toISOString();
      const sessionStartedAt = rawStartedAt.replace('T', ' ').replace(/\.\d{3}Z$/, '');

      console.log('Saving quiz session:', { userId, questionIds: questionIds.length, currentIndex, sessionStartedAt });

      const query = await sql('INSERT_OR_UPDATE_quiz_session');
      await MySQLClient.executeQuery(query, [
        userId,
        JSON.stringify(questionIds),  // JSON文字列として保存
        currentIndex,
        sessionStartedAt
      ]);
      console.log('Quiz session saved successfully');
    } else {
      console.log('No quiz session to save:', {
        isAuth: req.isAuthenticated(),
        hasUser: !!req.user,
        hasQuestionIds: !!(req.session.questionIds && req.session.questionIds.length > 0)
      });
    }
  } catch (saveErr) {
    console.error('Quiz session save error:', saveErr);
    // 保存失敗してもログアウトは続行
  }

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
