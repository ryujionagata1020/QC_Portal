// routes/ques.js
const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { MySQLClient, sql } = require("../lib/database/client.js");

// 認証チェック用ミドルウェア
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "ログインが必要です" });
}

// レート制限: 問題取得（同一IPから200回/分）
const questionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: "リクエスト回数が上限に達しました。しばらく待ってから再度お試しください。"
});

// LaTeX文字列の正規化（エスケープを解除）
function normalizeLatex(str) {
  if (!str) return str;
  return str
    .replace(/\\\$/g, '$')      // \$ → $
    .replace(/\\\\/g, '\\');    // \\ → \
}

// 終了時の達成度データ取得（カテゴリ別 before/after）
router.get("/completion-stats", async (req, res, next) => {
  try {
    // 未認証 or セッションに出題データがない場合は空を返す
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.json({ categories: [] });
    }
    const questionIds = req.session.questionIds;
    const sessionStartedAt = req.session.sessionStartedAt;
    if (!questionIds || questionIds.length === 0 || !sessionStartedAt) {
      return res.json({ categories: [] });
    }

    const userId = req.user.user_id;
    const placeholders = questionIds.map(() => '?').join(',');

    // 出題された問題のカテゴリを取得
    const categoryQuery = `
      SELECT DISTINCT
        qsc.small_category_id,
        qsc.small_category_name,
        qlc.large_category_name
      FROM quiz_questions qq
      JOIN quiz_small_category qsc ON qq.small_category_id = qsc.small_category_id
      JOIN quiz_large_category qlc ON qsc.large_category_id = qlc.large_category_id
      WHERE qq.question_id IN (${placeholders})
    `;
    const categoryRows = await MySQLClient.executeQuery(categoryQuery, [...questionIds]);

    if (categoryRows.length === 0) {
      return res.json({ categories: [] });
    }

    const smallCategoryIds = categoryRows.map(r => r.small_category_id);
    const catPlaceholders = smallCategoryIds.map(() => '?').join(',');

    // カテゴリ別のbefore/after正解率を1クエリで取得
    const statsQuery = `
      SELECT
        qsc.small_category_id,
        qsc.small_category_name,
        qlc.large_category_name,
        SUM(CASE WHEN ur.answered_at < ? THEN 1 ELSE 0 END) AS before_total,
        SUM(CASE WHEN ur.answered_at < ? AND ur.is_correct = 1 THEN 1 ELSE 0 END) AS before_correct,
        COUNT(*) AS after_total,
        SUM(ur.is_correct) AS after_correct
      FROM user_responses ur
      JOIN quiz_blanks qb ON ur.blank_id = qb.blank_id
      JOIN quiz_questions qq ON qb.question_id = qq.question_id
      JOIN quiz_small_category qsc ON qq.small_category_id = qsc.small_category_id
      JOIN quiz_large_category qlc ON qsc.large_category_id = qlc.large_category_id
      WHERE ur.user_id = ?
        AND qsc.small_category_id IN (${catPlaceholders})
      GROUP BY qsc.small_category_id, qsc.small_category_name, qlc.large_category_name
      HAVING COUNT(*) > SUM(CASE WHEN ur.answered_at < ? THEN 1 ELSE 0 END)
    `;
    const statsRows = await MySQLClient.executeQuery(statsQuery, [
      sessionStartedAt, sessionStartedAt, userId, ...smallCategoryIds, sessionStartedAt
    ]);

    const categories = statsRows.map(row => ({
      large_category_name: row.large_category_name,
      small_category_name: row.small_category_name,
      before_accuracy: row.before_total > 0
        ? Math.round((row.before_correct / row.before_total) * 100) : 0,
      after_accuracy: row.after_total > 0
        ? Math.round((row.after_correct / row.after_total) * 100) : 0,
      before_total: Number(row.before_total),
      after_total: Number(row.after_total)
    }));

    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// 出題セッションのクリア（全問完了時）
router.post("/complete", async (req, res) => {
  // DBからも削除（認証済みユーザーの場合）
  try {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      const query = await sql('DELETE_quiz_session_BY_user_id');
      await MySQLClient.executeQuery(query, [req.user.user_id]);
    }
  } catch (err) {
    console.error('Failed to delete quiz session from DB:', err);
  }

  delete req.session.questionIds;
  delete req.session.currentIndex;
  delete req.session.sessionStartedAt;
  req.session.save((err) => {
    if (err) console.error("Session save error:", err);
    res.json({ success: true });
  });
});

// DBから出題セッションを復元して再開
router.get("/resume", async (req, res, next) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.redirect('/questions/select');
    }

    const query = await sql('SELECT_quiz_session_BY_user_id');
    const savedSessions = await MySQLClient.executeQuery(query, [req.user.user_id]);

    if (savedSessions.length === 0) {
      return res.redirect('/questions/select');
    }

    const saved = savedSessions[0];
    // MySQL JSON型は自動的に配列に変換される
    const questionIds = saved.question_ids;
    const currentIndex = saved.current_index || 0;

    // セッションに復元
    req.session.questionIds = questionIds;
    req.session.currentIndex = currentIndex;
    req.session.sessionStartedAt = saved.session_started_at;

    // DBから削除
    const deleteQuery = await sql('DELETE_quiz_session_BY_user_id');
    await MySQLClient.executeQuery(deleteQuery, [req.user.user_id]);

    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      res.redirect(`/questions/${questionIds[currentIndex]}`);
    });
  } catch (err) {
    next(err);
  }
});

// チェック問題から復習開始
router.post("/start-from-checks", ensureAuthenticated, async (req, res, next) => {
  try {
    const { color } = req.body;
    const allowedColors = ['yellow', 'green', 'red'];
    if (!allowedColors.includes(color)) {
      return res.status(400).json({ error: "無効な色です" });
    }

    const query = await sql('SELECT_user_question_check_ids_BY_color');
    const rows = await MySQLClient.executeQuery(query, [req.user.user_id, color]);

    if (rows.length === 0) {
      return res.status(400).json({ error: "チェックされた問題がありません" });
    }

    // ランダムシャッフル（Fisher-Yates）
    const ids = rows.map(r => r.question_id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    // セッションに設定（既存セッションは上書き）
    req.session.questionIds = ids;
    req.session.currentIndex = 0;
    req.session.sessionStartedAt = new Date().toISOString();

    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      res.json({ success: true, firstId: ids[0], count: ids.length });
    });
  } catch (err) {
    next(err);
  }
});

// チェックON
router.post("/:question_id/check", ensureAuthenticated, async (req, res, next) => {
  try {
    const { color } = req.body;
    const allowedColors = ['yellow', 'green', 'red'];
    if (!allowedColors.includes(color)) {
      return res.status(400).json({ error: "無効な色です" });
    }
    const query = await sql('INSERT_IGNORE_user_question_check');
    await MySQLClient.executeQuery(query, [req.user.user_id, req.params.question_id, color]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// チェックOFF
router.delete("/:question_id/check", ensureAuthenticated, async (req, res, next) => {
  try {
    const { color } = req.body;
    const allowedColors = ['yellow', 'green', 'red'];
    if (!allowedColors.includes(color)) {
      return res.status(400).json({ error: "無効な色です" });
    }
    const query = await sql('DELETE_user_question_check');
    await MySQLClient.executeQuery(query, [req.user.user_id, req.params.question_id, color]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/:question_id", questionLimiter, async (req, res, next) => {
  try {
    const question_id = req.params.question_id;

    // セッションが存在しない場合は単独問題モードとして表示
    const isSingleMode = !req.session.questionIds;

    // SQL: quiz_question / quiz_choice / quiz_answers / quiz_blanks を結合
    // ※ quiz_blanks：blank_id, question_id, blank_number が含まれるテーブル名
    const query = `
      SELECT
        q.question_id,
        q.body,
        q.testlevel,
        q.image_data,
        s.small_category_name,
        l.large_category_name,
        c.choice_id,
        c.label,
        c.choice_text,
        b.blank_id,
        b.blank_number,
        b.explanation,
        b.explanation_data
      FROM quiz_questions AS q
      JOIN quiz_small_category AS s ON q.small_category_id = s.small_category_id
      JOIN quiz_large_category AS l ON s.large_category_id = l.large_category_id
      LEFT JOIN quiz_blanks AS b ON q.question_id = b.question_id
      LEFT JOIN quiz_choices AS c ON b.blank_id = c.blank_id
      WHERE q.question_id = ?
      ORDER BY b.blank_number, c.choice_id;
    `;

    const rows = await MySQLClient.executeQuery(query, [question_id]);

    if (rows.length === 0) {
      res.status(404).send("問題が見つかりません");
      return;
    }

    // 重複除去してquestion構造に整形
    // image_dataとexplanation_dataがBufferの場合はBase64に変換し、MIMEタイプを判定
    // MIMEタイプ判定用のヘルパー関数
    function detectMimeType(buf) {
      if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
      if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
      if (buf[0] === 0x47 && buf[1] === 0x49) return 'image/gif';
      return 'image/png';
    }

    let imageDataBase64 = null;
    let imageMimeType = 'image/png';
    if (rows[0].image_data) {
      const buf = Buffer.isBuffer(rows[0].image_data) ? rows[0].image_data : Buffer.from(rows[0].image_data);
      imageMimeType = detectMimeType(buf);
      imageDataBase64 = buf.toString('base64');
    }
    const question = {
      question_id: rows[0].question_id,
      body: normalizeLatex(rows[0].body),
      testlevel: rows[0].testlevel,
      image_data: imageDataBase64,
      image_mime_type: imageMimeType,
      small_category_name: rows[0].small_category_name,
      large_category_name: rows[0].large_category_name,
      choices: [],
      blanks: []
    };

    // blank_idごとに選択肢をグループ化
    const blankMap = new Map();

    rows.forEach(r => {
      if (r.blank_id) {
        if (!blankMap.has(r.blank_id)) {
          // blank_idごとの解説データを処理
          let blankExplanationData = null;
          let blankExplanationMimeType = 'image/png';
          if (r.explanation_data) {
            const buf = Buffer.isBuffer(r.explanation_data) ? r.explanation_data : Buffer.from(r.explanation_data);
            blankExplanationMimeType = detectMimeType(buf);
            blankExplanationData = buf.toString('base64');
          }
          blankMap.set(r.blank_id, {
            blank_id: r.blank_id,
            blank_number: r.blank_number,
            explanation: normalizeLatex(r.explanation),
            explanation_data: blankExplanationData,
            explanation_mime_type: blankExplanationMimeType,
            choices: []
          });
        }
        // 選択肢を該当するblankに追加（重複チェック）
        if (r.choice_id) {
          const blank = blankMap.get(r.blank_id);
          const existingChoice = blank.choices.find(c => c.choice_id === r.choice_id);
          if (!existingChoice) {
            blank.choices.push({
              choice_id: r.choice_id,
              label: r.label,
              text: normalizeLatex(r.choice_text)
            });
          }
        }
      }
    });

    question.blanks = Array.from(blankMap.values())
      .sort((a, b) => a.blank_number - b.blank_number)
      .map(b => ({ ...b, choices: b.choices || [] }));
    // 後方互換性のため、全選択肢のフラットリストも保持
    question.choices = question.blanks.flatMap(b => b.choices || []);

    // 出題順遷移（単独モードの場合は次の問題なし）
    let nextId = null;
    let currentNumber = undefined;
    let totalCount = undefined;

    if (!isSingleMode) {
      const idx = req.session.questionIds.indexOf(question_id);
      // セッションの currentIndex を現在位置で更新（再開機能用）
      if (idx >= 0) {
        req.session.currentIndex = idx;
      }
      nextId =
        idx >= 0 && idx < req.session.questionIds.length - 1
          ? req.session.questionIds[idx + 1]
          : null;
      currentNumber = idx >= 0 ? idx + 1 : 1;
      totalCount = req.session.questionIds.length;
    }

    // ログイン済みならチェック状態を取得
    let checkedColors = [];
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      const checkQuery = await sql('SELECT_user_question_checks_BY_question');
      const checkRows = await MySQLClient.executeQuery(checkQuery, [req.user.user_id, question_id]);
      checkedColors = checkRows.map(r => r.color);
    }

    res.render("questions/question", { ...question, nextId, currentNumber, totalCount, checkedColors });
  } catch (err) {
    next(err);
  }
});

module.exports = router;