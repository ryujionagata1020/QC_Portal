// routes/question_answer.js
const router = require("express").Router();
const { MySQLClient, sql } = require("../lib/database/client.js");

router.post("/answer", async (req, res, next) => {
  try {
    const { blank_id, choice_id } = req.body;
    if (!blank_id || !choice_id) {
      return res.status(400).json({ error: "必要なパラメータがありません" });
    }

    // SECURITY: IDフォーマットの検証（CSS selector injection対策）
    // IDは英数字とハイフン、アンダースコアのみ許可
    const idPattern = /^[A-Za-z0-9\-_]+$/;

    if (!idPattern.test(blank_id) || !idPattern.test(choice_id)) {
      return res.status(400).json({ error: "無効なパラメータです" });
    }

    // blank_idごとの正答を取得
    const selectQuery = await sql("SELECT_correct_answer_BY_blank_id");
    const rows = await MySQLClient.executeQuery(selectQuery, [blank_id]);

    if (rows.length === 0) {
      return res.status(404).json({ isCorrect: false, message: "正解データがありません" });
    }

    // 文字列IDとして比較
    const correctChoiceId = rows[0].correct_choice_id;
    const isCorrect = correctChoiceId === choice_id;

    // ログインユーザーの場合、回答履歴を保存
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      const insertQuery = await sql("INSERT_user_response");
      await MySQLClient.executeQuery(insertQuery, [
        req.user.user_id,
        blank_id,
        choice_id,
        isCorrect ? 1 : 0
      ]);
    }

    res.json({ isCorrect });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
