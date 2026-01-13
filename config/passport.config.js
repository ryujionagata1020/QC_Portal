const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { executeQuery } = require('../lib/database/pool');

module.exports = function (passport) {
  // ログイン戦略の設定
  passport.use(new LocalStrategy(
    { usernameField: 'user_id', passwordField: 'password' },
    async (user_id, password, done) => {
      try {
        // ユーザーをデータベースから検索
        const users = await executeQuery(
          'SELECT * FROM users WHERE user_id = ? AND is_active = TRUE',
          [user_id]
        );

        if (users.length === 0) {
          return done(null, false, { message: 'ユーザーIDまたはパスワードが正しくありません。' });
        }

        const user = users[0];

        // パスワードの照合
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
          return done(null, false, { message: 'ユーザーIDまたはパスワードが正しくありません。' });
        }

        // ログイン成功時に最終ログイン時刻を更新
        await executeQuery(
          'UPDATE users SET last_login_at = NOW() WHERE id = ?',
          [user.id]
        );

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  // セッションにユーザー情報を保存
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // セッションからユーザー情報を取得
  passport.deserializeUser(async (id, done) => {
    try {
      const users = await executeQuery(
        'SELECT id, user_id, mail, created_at, last_login_at FROM users WHERE id = ? AND is_active = TRUE',
        [id]
      );

      if (users.length === 0) {
        return done(null, false);
      }

      done(null, users[0]);
    } catch (err) {
      done(err);
    }
  });
};
