// routes/ques.js
const router = require("express").Router();
const { MySQLClient, sql } = require("../lib/database/client.js");

router.get("/:question_id", async (req, res, next) => {
  try {
    const question_id = req.params.question_id;

    // セッションが存在しない場合は選択画面へ戻す
    if (!req.session.questionIds) {
      res.redirect("/questions/select");
      return;
    }

    // SQL: quiz_question / quiz_choice / quiz_answers / quiz_blanks を結合
    // ※ quiz_blanks：blank_id, question_id, blank_number が含まれるテーブル名
    const query = `
      SELECT
        q.question_id,
        q.body,
        q.testlevel,
        q.image_data,
        q.explanation,
        s.small_category_name,
        l.large_category_name,
        c.choice_id,
        c.label,
        c.text,
        b.blank_id,
        b.blank_number
      FROM quiz_questions AS q
      JOIN quiz_small_category AS s ON q.small_category_id = s.small_category_id
      JOIN quiz_large_category AS l ON s.large_category_id = l.large_category_id
      LEFT JOIN quiz_choices AS c ON q.question_id = c.question_id
      LEFT JOIN quiz_blanks AS b ON q.question_id = b.question_id
      WHERE q.question_id = ?
      ORDER BY b.blank_number, c.choice_id;
    `;

    const rows = await MySQLClient.executeQuery(query, [question_id]);

    if (rows.length === 0) {
      res.status(404).send("問題が見つかりません");
      return;
    }

    // 重複除去してquestion構造に整形
    const question = {
      question_id: rows[0].question_id,
      body: rows[0].body,
      testlevel: rows[0].testlevel,
      image_data: rows[0].image_data,
      explanation: rows[0].explanation,
      small_category_name: rows[0].small_category_name,
      large_category_name: rows[0].large_category_name,
      choices: [],
      blanks: []
    };

    const choiceMap = new Map();
    const blankMap = new Map();

    rows.forEach(r => {
      if (r.choice_id && !choiceMap.has(r.choice_id)) {
        choiceMap.set(r.choice_id, {
          choice_id: r.choice_id,
          label: r.label,
          text: r.text
        });
      }
      if (r.blank_id && !blankMap.has(r.blank_id)) {
        blankMap.set(r.blank_id, {
          blank_id: r.blank_id,
          blank_number: r.blank_number
        });
      }
    });

    question.choices = Array.from(choiceMap.values());
    question.blanks = Array.from(blankMap.values());

    // 出題順遷移
    const idx = req.session.questionIds.indexOf(question_id);
    const nextId =
      idx >= 0 && idx < req.session.questionIds.length - 1
        ? req.session.questionIds[idx + 1]
        : null;

    // 問題数カウント情報
    const currentNumber = idx >= 0 ? idx + 1 : 1;
    const totalCount = req.session.questionIds.length;

    res.render("questions/question", { ...question, nextId, currentNumber, totalCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;