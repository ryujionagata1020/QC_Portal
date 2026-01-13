// routes/question_start.js
const router = require("express").Router();
const { MySQLClient, sql } = require("../lib/database/client.js");

router.post("/", async (req, res, next) => {
  try {
    let testlevels = req.body.testlevels;
    let scope_exams = req.body.scope_exams;

    // 単一選択でも配列にそろえる
    if (!Array.isArray(testlevels) && testlevels) testlevels = [testlevels];
    if (!Array.isArray(scope_exams) && scope_exams) scope_exams = [scope_exams];

    if (!testlevels || !scope_exams) {
      res.send("条件を選択してください。");
      return;
    }

    // ✅ 選ばれた scope_exam の実際の出題範囲を展開
    // ①級 → 1,2,3,4／②級 → 2,3,4／③級 → 3,4／④級 → 4
    let expandedScopes = new Set();
    scope_exams.forEach(s => {
      const val = parseInt(s, 10);
      if (val === 1) [1, 2, 3, 4].forEach(v => expandedScopes.add(v));
      else if (val === 2) [2, 3, 4].forEach(v => expandedScopes.add(v));
      else if (val === 3) [3, 4].forEach(v => expandedScopes.add(v));
      else if (val === 4) expandedScopes.add(4);
    });

    const expandedScopeArray = Array.from(expandedScopes);

    // 空配列チェック（該当する問題がない場合のエラー防止）
    if (expandedScopeArray.length === 0 || testlevels.length === 0) {
      res.send("条件に一致する問題がありません。");
      return;
    }

    const query = await sql("SELECT_question_BY_conditions");
    const results = await MySQLClient.executeQuery(query, [testlevels, expandedScopeArray]);

    if (results.length === 0) {
      res.send("条件に一致する問題がありません。");
      return;
    }

    // 出題セッション保存
    req.session.questionIds = results.map(r => r.question_id);
    req.session.currentIndex = 0;

    res.redirect(`/questions/${results[0].question_id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;