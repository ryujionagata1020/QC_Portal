// routes/question_answer.js
const router = require("express").Router();
const { MySQLClient } = require("../lib/database/client.js");

router.post("/answer", async (req, res, next) => {
  try {
    const { blank_id, choice_id } = req.body;
    if (!blank_id || !choice_id) {
      return res.status(400).json({ error: "必要なパラメータがありません" });
    }

    // blank_idごとの正答を取得
    const query = `
      SELECT correct_choice_id
      FROM quiz_answers
      WHERE blank_id = ?
      LIMIT 1;
    `;

    const rows = await MySQLClient.executeQuery(query, [blank_id]);

    if (rows.length === 0) {
      return res.status(404).json({ isCorrect: false, message: "正解データがありません" });
    }

    const correctChoiceId = rows[0].correct_choice_id;
    const isCorrect = correctChoiceId === choice_id;

    res.json({ isCorrect });
  } catch (err) {
    next(err);
  }
});

module.exports = router;