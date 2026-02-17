//ルーティングの宣言関数
const router = require("express").Router();
const { MySQLClient, sql } = require("../lib/database/client.js");

// LaTeX文字列の正規化（エスケープを解除）
function normalizeLatex(str) {
  if (!str) return str;
  return str
    .replace(/\\\$/g, '$')      // \$ → $
    .replace(/\\\\/g, '\\');    // \\ → \
}

//htmlを返したい処理
router.get("/", async (req, res, next) => {
  try {
    // ランダムで1問取得
    const query = `
      SELECT
        q.question_id,
        q.body,
        q.testlevel,
        q.image_data,
        s.small_category_name,
        l.large_category_name
      FROM quiz_questions AS q
      JOIN quiz_small_category AS s ON q.small_category_id = s.small_category_id
      JOIN quiz_large_category AS l ON s.large_category_id = l.large_category_id
      ORDER BY RAND()
      LIMIT 1
    `;
    const results = await MySQLClient.executeQuery(query);

    // 問題があれば選択肢と空欄も取得
    let randomQuestion = null;
    if (results.length > 0) {
      const question = results[0];

      // 空欄と選択肢を取得（選択肢をblank_idごとにグループ化）
      const blanksQuery = `
        SELECT blank_id, blank_number
        FROM quiz_blanks
        WHERE question_id = ?
        ORDER BY blank_number
      `;
      const blanksRows = await MySQLClient.executeQuery(blanksQuery, [question.question_id]);

      const choicesQuery = `
        SELECT c.choice_id, c.label, c.choice_text, c.blank_id
        FROM quiz_blanks AS b
        JOIN quiz_choices AS c ON b.blank_id = c.blank_id
        WHERE b.question_id = ?
        ORDER BY b.blank_number, c.label
      `;
      const choicesRows = await MySQLClient.executeQuery(choicesQuery, [question.question_id]);

      // blank_idごとに選択肢をグループ化
      const blanks = blanksRows.map(b => ({
        blank_id: b.blank_id,
        blank_number: b.blank_number,
        choices: choicesRows
          .filter(c => c.blank_id === b.blank_id)
          .map(c => ({
            choice_id: c.choice_id,
            label: c.label,
            text: normalizeLatex(c.choice_text)
          }))
      }));

      // 後方互換性のため、全選択肢のフラットリストも保持
      const choices = choicesRows.map(c => ({
        choice_id: c.choice_id,
        label: c.label,
        text: normalizeLatex(c.choice_text)
      }));

      // image_dataがBufferの場合はBase64に変換し、MIMEタイプを判定
      let imageDataBase64 = null;
      let imageMimeType = 'image/png';
      if (question.image_data) {
        const buf = Buffer.isBuffer(question.image_data) ? question.image_data : Buffer.from(question.image_data);
        // マジックバイトでMIMEタイプを判定
        if (buf[0] === 0xFF && buf[1] === 0xD8) {
          imageMimeType = 'image/jpeg';
        } else if (buf[0] === 0x89 && buf[1] === 0x50) {
          imageMimeType = 'image/png';
        } else if (buf[0] === 0x47 && buf[1] === 0x49) {
          imageMimeType = 'image/gif';
        }
        imageDataBase64 = buf.toString('base64');
      }

      randomQuestion = {
        question_id: question.question_id,
        body: normalizeLatex(question.body),
        testlevel: question.testlevel,
        image_data: imageDataBase64,
        image_mime_type: imageMimeType,
        small_category_name: question.small_category_name,
        large_category_name: question.large_category_name,
        blanks: blanks,
        choices: choices
      };
    }

    // お知らせを取得（最新5件）
    const announcementsQuery = await sql("SELECT_announcements_latest");
    const announcements = await MySQLClient.executeQuery(announcementsQuery);

    res.render("./index.ejs", { randomQuestion, announcements });
  } catch (err) {
    next(err);
  }
});

router.get("/qcis", (req, res) => {
  res.render("./qcis.ejs");
});

router.get("/statisinfo", (req, res) => {
  res.render("./statisinfo.ejs");
});

module.exports = router;
