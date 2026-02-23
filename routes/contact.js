const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { MySQLClient, sql } = require("../lib/database/client");
const transporter = require("../config/mailer.config");
const { buildUserMail } = require("../lib/mail/contact_user");
const { buildAdminMail } = require("../lib/mail/contact_admin");

// ─── 定数 ──────────────────────────────────────────────
const VALID_CATEGORIES = ["bug", "feature", "usage", "other"];
const LIMITS = { name: 100, email: 254, subject: 200, message: 2000 };

// レート制限: 同一IPから30分間10回まで
const contactLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "送信回数の上限に達しました。30分後に再度お試しください。",
});

// ─── ユーティリティ ─────────────────────────────────────
/**
 * HTMLタグ・制御文字を除去するサニタイズ関数
 * EJSの <%= %> がエスケープするため二重処理にはならないが、
 * DBへの保存前にも除去しておく（多層防御）
 */
function stripDangerous(str) {
  return String(str)
    .replace(/<[^>]*>/g, "")         // HTMLタグ除去
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // 制御文字除去
    .trim();
}

/** メールヘッダインジェクション対策: 改行を除去 */
function stripNewlines(str) {
  return String(str).replace(/[\r\n]/g, "");
}

/** バリデーション: エラーメッセージ配列を返す */
function validate(body) {
  const errors = [];
  const { name, email, category, subject, message } = body;

  if (!name || name.trim().length === 0) errors.push("お名前を入力してください。");
  else if (name.trim().length > LIMITS.name) errors.push(`お名前は${LIMITS.name}文字以内で入力してください。`);

  if (!email || email.trim().length === 0) errors.push("メールアドレスを入力してください。");
  else if (email.trim().length > LIMITS.email) errors.push("メールアドレスが長すぎます。");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push("メールアドレスの形式が正しくありません。");

  if (!category || !VALID_CATEGORIES.includes(category)) errors.push("お問い合わせ種別を選択してください。");

  if (!subject || subject.trim().length === 0) errors.push("件名を入力してください。");
  else if (subject.trim().length > LIMITS.subject) errors.push(`件名は${LIMITS.subject}文字以内で入力してください。`);

  if (!message || message.trim().length === 0) errors.push("お問い合わせ内容を入力してください。");
  else if (message.trim().length > LIMITS.message) errors.push(`お問い合わせ内容は${LIMITS.message}文字以内で入力してください。`);

  return errors;
}

// ─── GET /contact ─────────────────────────────────────
router.get("/", (_req, res) => {
  res.render("contact/index", { errors: [], form: {} });
});

// ─── POST /contact ────────────────────────────────────
router.post("/", contactLimiter, (req, res) => {
  // ハニーポット検証: 隠しフィールドに値が入っていたらBotと判断し無言で弾く
  if (req.body.website && req.body.website.trim() !== "") {
    return res.redirect("/contact");
  }

  const raw = {
    name:     req.body.name    || "",
    email:    req.body.email   || "",
    category: req.body.category || "",
    subject:  req.body.subject  || "",
    message:  req.body.message  || "",
  };

  const errors = validate(raw);
  if (errors.length > 0) {
    return res.render("contact/index", { errors, form: raw });
  }

  // サニタイズしてセッションに保存
  req.session.contactForm = {
    name:     stripNewlines(stripDangerous(raw.name)),
    email:    stripNewlines(stripDangerous(raw.email)),
    category: raw.category,
    subject:  stripNewlines(stripDangerous(raw.subject)),
    message:  stripDangerous(raw.message),
  };

  res.redirect("/contact/confirm");
});

// ─── GET /contact/confirm ─────────────────────────────
router.get("/confirm", (req, res) => {
  const form = req.session.contactForm;
  if (!form) {
    return res.redirect("/contact");
  }

  const categoryLabels = {
    bug:     "バグ・不具合報告",
    feature: "機能・改善要望",
    usage:   "使い方の質問",
    other:   "その他",
  };

  res.render("contact/confirm", {
    form,
    categoryLabel: categoryLabels[form.category] || form.category,
  });
});

// ─── POST /contact/confirm ────────────────────────────
router.post("/confirm", contactLimiter, async (req, res) => {
  const form = req.session.contactForm;
  if (!form) {
    return res.redirect("/contact");
  }

  try {
    const ip = req.ip || null; // x-forwarded-forはユーザーが偽装可能なため使用しない
    const userId = null; // user_idはVARCHAR型のため保存しない（メールで本人特定可能）

    // DB INSERT
    const query = await sql("INSERT_contact_inquiry");
    const result = await MySQLClient.executeQuery(query, [
      form.name,
      form.email,
      form.category,
      form.subject,
      form.message,
      ip,
      userId,
    ]);
    const inquiryId = result.insertId;

    // セッションの問い合わせデータを削除（二重送信防止）
    delete req.session.contactForm;
    req.session.contactComplete = true;

    // メール送信（非同期、失敗してもユーザー体験は損なわない）
    const userMail  = buildUserMail({ inquiryId, ...form });
    const adminMail = buildAdminMail({ inquiryId, ...form, ip });

    transporter.sendMail({
      from:    process.env.MAIL_FROM,
      to:      form.email,
      subject: userMail.subject,
      text:    userMail.text,
    }).catch((err) => console.error("[mailer] 受付確認メール送信失敗:", err));

    transporter.sendMail({
      from:    process.env.MAIL_FROM,
      to:      process.env.MAIL_ADMIN,
      subject: adminMail.subject,
      text:    adminMail.text,
    }).catch((err) => console.error("[mailer] 管理者通知メール送信失敗:", err));

    res.redirect("/contact/complete");
  } catch (err) {
    console.error("[contact] DB INSERT失敗:", err);
    res.status(500).render("contact/index", {
      errors: ["送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。"],
      form,
    });
  }
});

// ─── GET /contact/complete ────────────────────────────
router.get("/complete", (req, res) => {
  if (!req.session.contactComplete) {
    return res.redirect("/contact");
  }
  delete req.session.contactComplete;
  res.render("contact/complete");
});

module.exports = router;
