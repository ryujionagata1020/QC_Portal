const express = require('express');
const router = express.Router();
const { marked } = require('marked');
const { getAllLearnArticles, getLearnArticle } = require('../lib/articles/loader');

router.get('/', (req, res) => {
  const articles = getAllLearnArticles();
  // grade ごとにグループ化
  const byGrade = {};
  for (const article of articles) {
    const key = article.grade;
    if (!byGrade[key]) byGrade[key] = [];
    byGrade[key].push(article);
  }
  res.render('articles/index', { byGrade });
});

router.get('/learn/:grade/:chapter/:slug', (req, res) => {
  const { grade, chapter, slug } = req.params;
  const slugPath = `${grade}/${chapter}/${slug}`;
  const article = getLearnArticle(slugPath);
  if (!article) return res.status(404).send('記事が見つかりません');
  const html = marked(article.body);
  res.render('articles/learn', { frontmatter: article.frontmatter, content: html });
});

module.exports = router;
