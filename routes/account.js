//ルーティングの宣言関数
const router = require("express").Router();

//htmlを返したい処理
router.get("/login", (req, res, next) => {
  res.render("./account/login.ejs");
});

module.exports = router;