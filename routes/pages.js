const express = require("express");
const router = express.Router();

// 利用規約ページ
router.get("/kiyaku", (req, res) => {
  res.render("kiyaku");
});

// プライバシーポリシーページ
router.get("/privacy-policy", (req, res) => {
  res.render("privacy-policy");
});

// サイトマップページ
router.get("/sitemap", (req, res) => {
  res.render("sitemap");
});

module.exports = router;
