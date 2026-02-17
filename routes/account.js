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

    // blank_idごとにグループ化（カテゴリ情報付き）
    const historyMap = {};
    rows.forEach(row => {
      // attempt_rank が 3 以下のものだけを保持
      if (row.attempt_rank <= 3) {
        if (!historyMap[row.blank_id]) {
          historyMap[row.blank_id] = {
            question_id: row.question_id,
            blank_number: row.blank_number,
            small_category_name: row.small_category_name,
            large_category_name: row.large_category_name,
            attempts: []
          };
        }
        historyMap[row.blank_id].attempts.push({
          is_correct: row.is_correct,
          attempt_rank: row.attempt_rank
        });
      }
    });

    // レスポンス用に整形（blank_id単位、カテゴリ順を維持）
    const history = Object.entries(historyMap).map(([blankId, data]) => ({
      blank_id: blankId,
      question_id: data.question_id,
      blank_number: data.blank_number,
      small_category_name: data.small_category_name,
      large_category_name: data.large_category_name,
      attempts: data.attempts.sort((a, b) => a.attempt_rank - b.attempt_rank)
    }));

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

// プロフィール更新API
router.put("/profile", ensureAuthenticated, async (req, res, next) => {
  try {
    const { field, value } = req.body;
    const userId = req.user.user_id;

    // 許可するフィールドを限定（SQLインジェクション防止）
    const allowedFields = ['user_name', 'want_grade1', 'want_grade2', 'scheduled_exam_date'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: "無効なフィールドです" });
    }

    // バリデーション
    if (field === 'user_name') {
      if (typeof value !== 'string' || value.length > 50) {
        return res.status(400).json({ error: "ユーザー名は50文字以内で入力してください" });
      }
    }

    if (field === 'want_grade1' || field === 'want_grade2') {
      const allowedGrades = ['', '４級', '３級', '２級', '１級'];
      if (!allowedGrades.includes(value)) {
        return res.status(400).json({ error: "無効な級です" });
      }
    }

    if (field === 'scheduled_exam_date') {
      if (value !== '') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return res.status(400).json({ error: "日付の形式が無効です" });
        }
        const d = new Date(value);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ error: "無効な日付です" });
        }
      }
    }

    const dbValue = value === '' ? null : value;
    const query = await sql(`UPDATE_${field}_BY_user_id`);
    await MySQLClient.executeQuery(query, [dbValue, userId]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// チェック問題一覧API（色別）
router.get("/checks/:color", ensureAuthenticated, async (req, res, next) => {
  try {
    const allowedColors = ['yellow', 'green', 'red'];
    const color = req.params.color;
    if (!allowedColors.includes(color)) {
      return res.status(400).json({ error: "無効な色です" });
    }

    const userId = req.user.user_id;
    const query = await sql("SELECT_user_question_checks_BY_color");
    const rows = await MySQLClient.executeQuery(query, [userId, color]);

    res.json({ checks: rows });
  } catch (err) {
    next(err);
  }
});

// アカウント削除API
router.delete("/delete", ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // quiz_sessions テーブルから削除（CASCADEでも削除されるが明示的に）
    const deleteSessionQuery = await sql("DELETE_quiz_session_BY_user_id");
    await MySQLClient.executeQuery(deleteSessionQuery, [userId]);

    // user_responses テーブルから削除
    const deleteResponsesQuery = await sql("DELETE_user_responses_BY_user");
    await MySQLClient.executeQuery(deleteResponsesQuery, [userId]);

    // users テーブルから削除
    const deleteUserQuery = await sql("DELETE_user_BY_user_id");
    await MySQLClient.executeQuery(deleteUserQuery, [userId]);

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
    const coverageQuery = await sql("SELECT_achievement_coverage_BY_testlevel");
    const coverageRows = await MySQLClient.executeQuery(coverageQuery, [userId, testlevel, testlevel]);
    const coverage = coverageRows[0] || { answered_count: 0, total_count: 0 };

    // カテゴリ別正解率: 当該級の範囲の全カテゴリを取得（回答データがないカテゴリも0%で表示）
    // 現在・2週間前・1か月前の3期間の正解率を1クエリで取得
    const categoryQuery = await sql("SELECT_achievement_categories_BY_testlevel");
    const categoryRows = await MySQLClient.executeQuery(categoryQuery, [userId, testlevel, testlevel]);

    // large_category毎にグループ化（現在・2週間前・1か月前の正解率を含む）
    const categories = {};
    categoryRows.forEach(row => {
      if (!categories[row.large_category_name]) {
        categories[row.large_category_name] = [];
      }
      const accuracy = row.total_attempts > 0
        ? Math.round((row.correct_count / row.total_attempts) * 100)
        : 0;
      const accuracy2w = row.attempts_2w > 0
        ? Math.round((row.correct_2w / row.attempts_2w) * 100)
        : 0;
      const accuracy1m = row.attempts_1m > 0
        ? Math.round((row.correct_1m / row.attempts_1m) * 100)
        : 0;
      categories[row.large_category_name].push({
        small_category_id: row.small_category_id,
        small_category_name: row.small_category_name,
        total_attempts: row.total_attempts,
        correct_count: row.correct_count,
        accuracy: accuracy,
        accuracy_2w: accuracy2w,
        accuracy_1m: accuracy1m
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

// アクティビティデータを取得するAPI
router.get("/activity/:testlevel", ensureAuthenticated, async (req, res, next) => {
  try {
    const testlevel = parseInt(req.params.testlevel, 10);
    if (isNaN(testlevel) || testlevel < 1 || testlevel > 4) {
      return res.status(400).json({ error: "無効な級です" });
    }

    const allowedUnits = ['daily', 'weekly', 'monthly', 'yearly'];
    const unit = allowedUnits.includes(req.query.unit) ? req.query.unit : 'daily';

    const userId = req.user.user_id;

    const unitDays = { daily: 30, weekly: 84, monthly: 365, yearly: 1825 };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - unitDays[unit]);
    const startDateStr = startDate.toISOString().slice(0, 10);

    const query = await sql(`SELECT_activity_${unit}_BY_testlevel`);
    const rows = await MySQLClient.executeQuery(query, [userId, testlevel, startDateStr]);

    res.json({ unit, data: rows });
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
