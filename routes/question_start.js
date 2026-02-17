// routes/question_start.js
const router = require("express").Router();
const { MySQLClient } = require("../lib/database/client.js");

router.post("/", async (req, res, next) => {
  try {
    let testlevels = req.body.testlevels;
    let smalls = req.body.smalls;

    console.log('[question_start] req.body:', JSON.stringify(req.body));
    console.log('[question_start] testlevels:', testlevels, 'smalls:', smalls);

    // 単一選択でも配列にそろえる
    if (!Array.isArray(testlevels) && testlevels) testlevels = [testlevels];
    if (!Array.isArray(smalls) && smalls) smalls = [smalls];

    console.log('[question_start] after normalize - testlevels:', testlevels, 'smalls:', smalls);

    if (!testlevels || !smalls) {
      console.log('[question_start] REJECTED: testlevels or smalls is falsy');
      res.send("条件を選択してください。");
      return;
    }

    // 空配列チェック（該当する問題がない場合のエラー防止）
    if (smalls.length === 0 || testlevels.length === 0) {
      console.log('[question_start] REJECTED: empty array');
      res.send("条件に一致する問題がありません。");
      return;
    }

    // 未回答のみフィルタ
    const unansweredOnly = req.body.unanswered_only === '1'
      && req.isAuthenticated && req.isAuthenticated() && req.user;

    // 動的にプレースホルダーを生成
    const testPlaceholders = testlevels.map(() => '?').join(',');
    const smallPlaceholders = smalls.map(() => '?').join(',');

    let unansweredClause = '';
    const params = [...testlevels, ...smalls];

    if (unansweredOnly) {
      unansweredClause = `
        AND q.question_id NOT IN (
          SELECT DISTINCT LEFT(ur.blank_id, LOCATE('-B', ur.blank_id) - 1)
          FROM user_responses ur
          WHERE ur.user_id = ?
        )`;
      params.push(req.user.user_id);
    }

    const query = `
      SELECT
        q.question_id,
        q.body,
        q.testlevel,
        q.image_data,
        q.explanation,
        s.small_category_name,
        l.large_category_name
      FROM quiz_questions AS q
      JOIN quiz_small_category AS s ON q.small_category_id = s.small_category_id
      JOIN quiz_large_category AS l ON s.large_category_id = l.large_category_id
      WHERE q.testlevel IN (${testPlaceholders})
        AND q.small_category_id IN (${smallPlaceholders})
        ${unansweredClause}
      ORDER BY q.question_id
    `;
    console.log('[question_start] SQL params:', params);
    const results = await MySQLClient.executeQuery(query, params);
    console.log('[question_start] SQL results count:', results.length);

    if (results.length === 0) {
      res.send("条件に一致する問題がありません。");
      return;
    }

    // 問題出題数の取得（101は「全問」、それ以外は指定数）
    const questionLimit = req.body.question_limit ? parseInt(req.body.question_limit, 10) : 101;
    console.log('[question_start] question_limit:', questionLimit);

    let questionIds = results.map(r => r.question_id);

    // Fisher-Yatesシャッフルでランダム化
    for (let i = questionIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionIds[i], questionIds[j]] = [questionIds[j], questionIds[i]];
    }

    // 101（全問）以外の場合、指定数にスライス
    // ヒット数が設定数未満の場合は、無言で該当する全問を出題
    if (questionLimit !== 101 && questionIds.length > questionLimit) {
      questionIds = questionIds.slice(0, questionLimit);
    }

    console.log('[question_start] final questionIds count:', questionIds.length);

    // 新しいセッションを作成する前に、DBに保存されている古いセッションを削除
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      try {
        const { sql: sqlLoader } = require("../lib/database/client.js");
        const deleteQuery = await sqlLoader('DELETE_quiz_session_BY_user_id');
        await MySQLClient.executeQuery(deleteQuery, [req.user.user_id]);
        console.log('[question_start] Deleted old DB session for user:', req.user.user_id);
      } catch (err) {
        console.error('[question_start] Failed to delete old quiz session from DB:', err);
      }
    }

    // 出題セッション保存
    req.session.questionIds = questionIds;
    req.session.currentIndex = 0;
    req.session.sessionStartedAt = new Date().toISOString();

    res.redirect(`/questions/${questionIds[0]}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;