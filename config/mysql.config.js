const required = (name) => {
  if (!process.env[name]) {
    throw new Error(`環境変数 ${name} が設定されていません。.env ファイルを確認してください。`);
  }
  return process.env[name];
};

module.exports = {
  HOST: required("MYSQL_HOST"),
  PORT: required("MYSQL_PORT"),
  USERNAME: required("MYSQL_USERNAME"),
  PASSWORD: required("MYSQL_PASSWORD"),
  DATABASE: required("MYSQL_DATABASE"),
  CONNECTION_LIMIT: process.env.MYSQL_CONNECTION_LIMIT ?
    parseInt(process.env.MYSQL_CONNECTION_LIMIT) : 10,
  QUEUE_LIMIT: process.env.MYSQL_QUEUE_LIMIT ?
    parseInt(process.env.MYSQL_QUEUE_LIMIT) : 0
};