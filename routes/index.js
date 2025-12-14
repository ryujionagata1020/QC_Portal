//ルーティングの宣言関数
const router = require("express").Router();

//htmlを返したい処理
router.get("/", (req, res) => {
  res.render("./index.ejs");
});

router.get("/qcis", (req, res) => {
  res.render("./qcis.ejs");
});

module.exports = router;
