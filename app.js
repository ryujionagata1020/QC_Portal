
const appcongfig = require("./config/application.config.js");
const dbconfig = require("./config/mysql.config.js");
const path = require("path");
const express = require("express");
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
  database: dbconfig.DATABASE,
  insecureAuth: true
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

// ✅ ルーティング
app.use("/auth", require("./routes/auth.js"));
app.use("/account", require("./routes/account.js"));
app.use("/questions/select", require("./routes/question_select.js"));
app.use("/questions/start", require("./routes/question_start.js"));
app.use("/questions", require("./routes/ques.js"));
app.use("/questions", require("./routes/question_answer.js"));
app.use("/", require("./routes/index.js"));

app.listen(appcongfig.PORT, () => {
  console.log(`Application listening at ${appcongfig.PORT}`);
});