// routes/account.js
const router = require("express").Router();
const { MySQLClient, sql } = require("../lib/database/client.js");

// 認証チェック用ミドルウェア
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "ログインが必要です" });
}

// ユーザーの回答履歴を級ごとに取得するAPI
router.get("/history/:testlevel", ensureAuthenticated, async (req, res, next) => {
  try {
    const testlevel = parseInt(req.params.testlevel, 10);
    if (isNaN(testlevel) || testlevel < 1 || testlevel > 4) {
      return res.status(400).json({ error: "無効な級です" });
    }

    const userId = req.user.user_id;

    // 各blank_idごとの直近3回までの履歴を取得
    const query = await sql("SELECT_user_history_BY_testlevel");
    const rows = await MySQLClient.executeQuery(query, [userId, testlevel]);

    // blank_idごとにグループ化
    const historyMap = {};
    rows.forEach(row => {
      // attempt_rank が 3 以下のものだけを保持
      if (row.attempt_rank <= 3) {
        if (!historyMap[row.blank_id]) {
          historyMap[row.blank_id] = {
            question_id: row.question_id,
            blank_number: row.blank_number,
            attempts: []
          };
        }
        historyMap[row.blank_id].attempts.push({
          is_correct: row.is_correct,
          attempt_rank: row.attempt_rank
        });
      }
    });

    // レスポンス用に整形（blank_id単位）
    const history = Object.entries(historyMap).map(([blankId, data]) => ({
      blank_id: blankId,
      question_id: data.question_id,
      blank_number: data.blank_number,
      attempts: data.attempts.sort((a, b) => a.attempt_rank - b.attempt_rank)
    })).sort((a, b) => a.blank_id.localeCompare(b.blank_id));

    res.json({ history });
  } catch (err) {
    next(err);
  }
});

// 総学習問題数を取得するAPI
router.get("/stats/total-learned", ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const query = await sql("SELECT_total_learned_count_BY_user");
    const rows = await MySQLClient.executeQuery(query, [userId]);

    const count = rows.length > 0 ? rows[0].total_count : 0;

    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// アカウント削除API
router.delete("/delete", ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // user_responses テーブルから削除
    await MySQLClient.executeQuery(
      "DELETE FROM user_responses WHERE user_id = ?",
      [userId]
    );

    // users テーブルから削除
    await MySQLClient.executeQuery(
      "DELETE FROM users WHERE user_id = ?",
      [userId]
    );

    // ログアウト処理
    req.logout((err) => {
      if (err) {
        console.error("ログアウトエラー:", err);
      }
      res.json({ success: true });
    });
  } catch (err) {
    next(err);
  }
});

// 達成度データを取得するAPI
router.get("/achievement/:testlevel", ensureAuthenticated, async (req, res, next) => {
  try {
    const testlevel = parseInt(req.params.testlevel, 10);
    if (isNaN(testlevel) || testlevel < 1 || testlevel > 4) {
      return res.status(400).json({ error: "無効な級です" });
    }

    const userId = req.user.user_id;

    // 網羅度: 回答記録がある問題数 / 全問題数
    const coverageQuery = `
      SELECT
        (SELECT COUNT(DISTINCT qb.question_id)
         FROM user_responses ur
         JOIN quiz_blanks qb ON ur.blank_id = qb.blank_id
         JOIN quiz_questions qq ON qb.question_id = qq.question_id
         WHERE ur.user_id = ? AND qq.testlevel = ?) as answered_count,
        (SELECT COUNT(*) FROM quiz_questions WHERE testlevel = ?) as total_count
    `;
    const coverageRows = await MySQLClient.executeQuery(coverageQuery, [userId, testlevel, testlevel]);
    const coverage = coverageRows[0] || { answered_count: 0, total_count: 0 };

    // カテゴリ別正解率: large_category_name毎のsmall_category_name毎の正解率
    const categoryQuery = `
      SELECT
        qlc.large_category_name,
        qsc.small_category_name,
        COUNT(*) as total_attempts,
        SUM(ur.is_correct) as correct_count
      FROM user_responses ur
      JOIN quiz_blanks qb ON ur.blank_id = qb.blank_id
      JOIN quiz_questions qq ON qb.question_id = qq.question_id
      JOIN quiz_small_category qsc ON qq.small_category_id = qsc.small_category_id
      JOIN quiz_large_category qlc ON qsc.large_category_id = qlc.large_category_id
      WHERE ur.user_id = ? AND qq.testlevel = ?
      GROUP BY qlc.large_category_id, qlc.large_category_name, qsc.small_category_id, qsc.small_category_name
      ORDER BY qlc.large_category_id, qsc.small_category_id
    `;
    const categoryRows = await MySQLClient.executeQuery(categoryQuery, [userId, testlevel]);

    // large_category毎にグループ化
    const categories = {};
    categoryRows.forEach(row => {
      if (!categories[row.large_category_name]) {
        categories[row.large_category_name] = [];
      }
      const accuracy = row.total_attempts > 0
        ? Math.round((row.correct_count / row.total_attempts) * 100)
        : 0;
      categories[row.large_category_name].push({
        small_category_name: row.small_category_name,
        total_attempts: row.total_attempts,
        correct_count: row.correct_count,
        accuracy: accuracy
      });
    });

    res.json({
      coverage: {
        answered: coverage.answered_count,
        total: coverage.total_count
      },
      categories: categories
    });
  } catch (err) {
    next(err);
  }
});

// 履歴から問題を直接閲覧するためのエンドポイント
router.get("/view/:question_id", ensureAuthenticated, async (req, res, next) => {
  try {
    const questionId = req.params.question_id;

    // セッションにこの問題IDのみを設定して問題ページへリダイレクト
    req.session.questionIds = [questionId];
    req.session.currentIndex = 0;

    res.redirect(`/questions/${questionId}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
