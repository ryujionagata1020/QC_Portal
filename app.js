require("dotenv").config();
require("./scripts/check-env");
const crypto = require("crypto");
const appcongfig = require("./config/application.config.js");
const dbconfig = require("./config/mysql.config.js");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const { MySQLClient, sql } = require("./lib/database/client.js");
const favicon = require("serve-favicon");
const cookie = require("cookie-parser");
const session = require("express-session");
const mysql2 = require("mysql2/promise");
const MySQLStore = require("express-mysql-session")(session);
const passport = require("passport");
const flash = require("connect-flash");
const app = express();

// EJS設定
app.set("view engine", "ejs");
app.disable("x-powered-by");

// Helmet セキュリティヘッダー
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],  // onclick などのインラインイベントハンドラーを許可
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "unpkg.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "cdn.jsdelivr.net"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// favicon設定と静的ファイル
app.use(favicon(path.join(__dirname, "/public/favicon.ico")));
app.use("/public", express.static(path.join(__dirname, "/public")));
app.use(express.json());

// POSTデータを受け取れるように
app.use(cookie());

// MySQL2接続プールを作成してセッションストアに渡す
const sessionConnection = mysql2.createPool({
  host: dbconfig.HOST,
  port: dbconfig.PORT,
  user: dbconfig.USERNAME,
  password: dbconfig.PASSWORD,
  database: dbconfig.DATABASE
});

app.use(session({
  secret: appcongfig.security.SESSION_SECRET,
  store: new MySQLStore({}, sessionConnection),
  resave: false,
  saveUninitialized: false,
  name: "sid",
  cookie: {
    httpOnly: true,
    secure: false, // 本番環境ではtrueに設定（HTTPS使用時）
    sameSite: "lax",
    maxAge: null // デフォルトはブラウザを閉じるまで
  }
}));
app.use(express.urlencoded({ extended: true }));

// Passport.js初期化
require("./config/passport.config")(passport);
app.use(passport.initialize());
app.use(passport.session());

// Flash messages初期化
app.use(flash());

// ローカル変数をすべてのビューで使用可能にする
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

// CSRFトークンの生成とビューへの公開
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// CSRF検証ミドルウェア（POST/PUT/DELETE）
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const token = (req.body && req.body._csrf) || req.headers["x-csrf-token"];
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: "CSRFトークンが無効です。ページを再読み込みしてください。" });
  }
  next();
});

// ✅ ルーティング
app.use("/", require("./routes/pages.js"));
app.use("/auth", require("./routes/auth.js"));
app.use("/account", require("./routes/account.js"));
app.use("/tools", require("./routes/tools.js"));
app.use("/questions/select", require("./routes/question_select.js"));
app.use("/questions/start", require("./routes/question_start.js"));
app.use("/questions", require("./routes/ques.js"));
app.use("/questions", require("./routes/question_answer.js"));
app.use("/", require("./routes/index.js"));

// 期限切れquiz_sessionsのクリーンアップ（1時間ごと）
setInterval(async () => {
  try {
    const query = await sql('DELETE_expired_quiz_sessions');
    await MySQLClient.executeQuery(query);
  } catch (err) {
    console.error('Quiz session cleanup error:', err);
  }
}, 60 * 60 * 1000);

app.listen(appcongfig.PORT, () => {
  console.log(`Application listening at ${appcongfig.PORT}`);
});