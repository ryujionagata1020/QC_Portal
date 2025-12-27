const PORT = process.env.PORT;

//Node.jsの標準ライブラリ
const path = require("path");

const express = require("express");

//favicon設定
const favicon = require("serve-favicon");
const app = express();

//EJSのテンプレートエンジンを使う宣言
app.set("view engine", "ejs");
app.disable("x-powered-by");

//静的コンテンツ
//faviconを使う
app.use(favicon(path.join(__dirname, "/public/favicon.ico")));
app.use("/public", express.static(path.join(__dirname, "/public")));

//動的コンテンツ
//ルーティングの実施のためファイルを呼び出す
app.use("/", require("./routes/index.js"));
app.use("/test", async (req, res, next) => {
  const { MySQLClient, sql } = require("./lib/database/client.js");
  var data;

  try {
    await MySQLClient.connect();
    data = await MySQLClient.query(await sql("SELECT_quiz_questions"));
    console.log(data);
  } catch (err) {
    next(err);
  } finally {
    await MySQLClient.end();
  }

  res.end("OK");
});

//アプリの実行
app.listen(PORT, () => {
  console.log(`Application listening at ${PORT}`);
});
