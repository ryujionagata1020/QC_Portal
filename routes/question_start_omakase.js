// routes/question_start_omakase.js
const router = require("express").Router();
const { MySQLClient, sql } = require("../lib/database/client.js");

// おまかせモード定義
const OMAKASE_MODES = {
  // 4級おまかせ10問: testlevel=4 & scope_exam=4, 10問ランダム
  grade4_30: {
    testlevel: 4,
    scope_exam: 4,
    category_name: null,
    limit: 10
  },
  // 4級実践編10問: testlevel=4 & scope_exam=4 & 実践編, 10問
  grade4_practical_30: {
    testlevel: 4,
    scope_exam: 4,
    category_name: "実践編",
    limit: 10
  },
  // 4級手法編10問: testlevel=4 & scope_exam=4 & 手法編, 10問
  grade4_methods_30: {
    testlevel: 4,
    scope_exam: 4,
    category_name: "手法編",
    limit: 10
  },
  // 4級対応ALL問題セット: testlevel=4 & scope_exam=4, 全問ランダム
  grade4_all: {
    testlevel: 4,
    scope_exam: 4,
    category_name: null,
    limit: null
  }
};

router.post("/", async (req, res, next) => {
  try {
    const mode = OMAKASE_MODES[req.body.mode];
    if (!mode) {
      res.send("無効なモードです。");
      return;
    }

    let query;
    let params;

    if (mode.category_name) {
      // カテゴリ名（実践編/手法編）で絞り込む
      query = await sql('SELECT_question_ids_BY_testlevel_scope_category');
      params = [mode.testlevel, mode.scope_exam, mode.category_name];
    } else {
      // カテゴリ絞り込みなし
      query = await sql('SELECT_question_ids_BY_testlevel_scope');
      params = [mode.testlevel, mode.scope_exam];
    }

    console.log('[start_omakase] mode:', req.body.mode, 'params:', params);
    const results = await MySQLClient.executeQuery(query, params);
    console.log('[start_omakase] results count:', results.length);

    if (results.length === 0) {
      res.send("条件に一致する問題がありません。");
      return;
    }

    let questionIds = results.map(r => r.question_id);

    // Fisher-Yatesシャッフルでランダム化
    for (let i = questionIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionIds[i], questionIds[j]] = [questionIds[j], questionIds[i]];
    }

    // 出題数制限（limitがnullの場合は全問）
    if (mode.limit && questionIds.length > mode.limit) {
      questionIds = questionIds.slice(0, mode.limit);
    }

    console.log('[start_omakase] final questionIds count:', questionIds.length);

    // ログイン中はDBの古いセッションを削除
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      try {
        const deleteQuery = await sql('DELETE_quiz_session_BY_user_id');
        await MySQLClient.executeQuery(deleteQuery, [req.user.user_id]);
        console.log('[start_omakase] Deleted old DB session for user:', req.user.user_id);
      } catch (err) {
        console.error('[start_omakase] Failed to delete old quiz session:', err);
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
