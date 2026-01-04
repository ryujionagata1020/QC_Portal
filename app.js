const PORT = process.env.PORT;
const path = require("path");
const express = require("express");
const session = require("express-session");
const favicon = require("serve-favicon");

const app = express();

// EJS設定
app.set("view engine", "ejs");
app.disable("x-powered-by");

// favicon設定と静的ファイル
app.use(favicon(path.join(__dirname, "/public/favicon.ico")));
app.use("/public", express.static(path.join(__dirname, "/public")));
app.use(express.json());

// POSTデータを受け取れるように
app.use(express.urlencoded({ extended: true }));

// ✅ ルーティング

app.use(session({
  secret: "qc_portal_secret_key",
  resave: false,
  saveUninitialized: true
}));
app.use("/questions/select", require("./routes/question_select.js"));
app.use("/questions/start", require("./routes/question_start.js"));
app.use("/questions", require("./routes/ques.js"));
app.use("/questions", require("./routes/question_answer.js"));
app.use("/", require("./routes/index.js"));

app.listen(PORT, () => {
  console.log(`Application listening at ${PORT}`);
});