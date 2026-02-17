if (!process.env.SESSION_SECRET) {
  throw new Error("環境変数 SESSION_SECRET が設定されていません。.env ファイルを確認してください。");
}

if (process.env.SESSION_SECRET.length < 64) {
  throw new Error("SESSION_SECRET は64文字以上である必要があります。セキュリティのため、より長いランダム文字列を使用してください。");
}

module.exports = {
  PORT: process.env.PORT || 3000,
  security: {
    SESSION_SECRET: process.env.SESSION_SECRET
  }
};