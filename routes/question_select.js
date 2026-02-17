// routes/question_select.js
const router = require("express").Router();
const { MySQLClient, sql } = require("../lib/database/client.js");

router.get("/", async (req, res, next) => {
  try {
    const query = await sql("SELECT_category_tree");
    const rows = await MySQLClient.executeQuery(query);

    // category_id（実践/手法）ごとにグループ化
    const practicalCategories = new Map(); // Practical Application
    const methodsCategories = new Map();   // Methods and Techniques

    rows.forEach(row => {
      const targetMap = row.category_id === "Practical Application"
        ? practicalCategories
        : methodsCategories;

      if (!targetMap.has(row.large_category_id)) {
        targetMap.set(row.large_category_id, {
          id: row.large_category_id,
          name: row.large_category_name,
          smalls: []
        });
      }
      targetMap.get(row.large_category_id).smalls.push({
        id: row.small_category_id,
        name: row.small_category_name,
        scope_exam: row.scope_exam
      });
    });

    // Mapから配列に変換
    const categoriesByType = {
      practical: Array.from(practicalCategories.values()),
      methods: Array.from(methodsCategories.values())
    };

    console.log("practical:", categoriesByType.practical.length, "methods:", categoriesByType.methods.length);

    // 中断再開データの取得（セッション優先、なければDB確認）
    let resumeData = null;

    // 1. セッションに出題データがあれば使用
    if (req.session.questionIds && req.session.questionIds.length > 0) {
      const idx = req.session.currentIndex || 0;
      if (idx < req.session.questionIds.length) {
        resumeData = {
          questionId: req.session.questionIds[idx],
          currentNumber: idx + 1,
          totalCount: req.session.questionIds.length,
          fromDb: false
        };
      }
    }
    // 2. セッションになくログイン中ならDBを確認
    else if (req.isAuthenticated() && req.user) {
      try {
        const savedQuery = await sql('SELECT_quiz_session_BY_user_id');
        const savedSessions = await MySQLClient.executeQuery(savedQuery, [req.user.user_id]);

        if (savedSessions.length > 0) {
          const saved = savedSessions[0];
          // MySQL JSON型は自動的に配列に変換される
          const questionIds = saved.question_ids;
          const idx = saved.current_index || 0;

          if (idx < questionIds.length) {
            resumeData = {
              questionId: questionIds[idx],
              currentNumber: idx + 1,
              totalCount: questionIds.length,
              fromDb: true
            };
          }
        }
      } catch (dbErr) {
        console.error('Error fetching saved quiz session:', dbErr);
      }
    }

    res.render("questions/select_question", { categoriesByType, resumeData });
  } catch (err) {
    next(err);
  }
});

module.exports = router;