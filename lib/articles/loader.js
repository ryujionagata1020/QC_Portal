const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const LEARN_DIR = path.join(__dirname, '../../content/articles/learn');

function getAllLearnArticles() {
  const articles = [];

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.md')) {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const { data } = matter(raw);
        if (data.published) {
          const slug = path.relative(LEARN_DIR, fullPath)
            .replace(/\\/g, '/')
            .replace(/\.md$/, '');
          articles.push({ ...data, slug });
        }
      }
    }
  }

  walkDir(LEARN_DIR);
  return articles;
}

function getLearnArticle(slugPath) {
  const filePath = path.resolve(LEARN_DIR, slugPath + '.md');
  // LEARN_DIR 外へのパストラバーサルを防ぐ
  if (!filePath.startsWith(path.resolve(LEARN_DIR) + path.sep)) return null;
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return { frontmatter: data, body: content };
}

module.exports = { getAllLearnArticles, getLearnArticle };
