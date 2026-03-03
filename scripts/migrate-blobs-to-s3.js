// scripts/migrate-blobs-to-s3.js
// 既存のlongblobデータをS3にアップロードし、URLカラムを更新する（一回限りの移行スクリプト）
// 実行: node scripts/migrate-blobs-to-s3.js

require('dotenv').config();
const mysql = require('mysql2/promise');
const { uploadBuffer, detectMimeType, mimeToExt } = require('../lib/storage/s3');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
});

async function migrateQuestionImages() {
  console.log('=== quiz_questions.image_data の移行 ===');
  const [rows] = await pool.query(
    'SELECT question_id, image_data FROM quiz_questions WHERE image_data IS NOT NULL AND image_url IS NULL'
  );
  console.log(`対象件数: ${rows.length}`);

  for (const row of rows) {
    const buf = Buffer.isBuffer(row.image_data) ? row.image_data : Buffer.from(row.image_data);
    const mimeType = detectMimeType(buf);
    const ext = mimeToExt(mimeType);
    const key = `questions/${row.question_id}/image.${ext}`;

    try {
      const url = await uploadBuffer(buf, key, mimeType);
      await pool.query('UPDATE quiz_questions SET image_url = ? WHERE question_id = ?', [url, row.question_id]);
      console.log(`  OK: ${row.question_id} -> ${url}`);
    } catch (err) {
      console.error(`  ERROR: ${row.question_id}: ${err.message}`);
    }
  }
}

async function migrateQuestionExplanations() {
  console.log('=== quiz_questions.explanation_data の移行 ===');
  const [rows] = await pool.query(
    'SELECT question_id, explanation_data FROM quiz_questions WHERE explanation_data IS NOT NULL AND explanation_url IS NULL'
  );
  console.log(`対象件数: ${rows.length}`);

  for (const row of rows) {
    const buf = Buffer.isBuffer(row.explanation_data) ? row.explanation_data : Buffer.from(row.explanation_data);
    const mimeType = detectMimeType(buf);
    const ext = mimeToExt(mimeType);
    const key = `questions/${row.question_id}/explanation.${ext}`;

    try {
      const url = await uploadBuffer(buf, key, mimeType);
      await pool.query('UPDATE quiz_questions SET explanation_url = ? WHERE question_id = ?', [url, row.question_id]);
      console.log(`  OK: ${row.question_id} -> ${url}`);
    } catch (err) {
      console.error(`  ERROR: ${row.question_id}: ${err.message}`);
    }
  }
}

async function migrateBlankExplanations() {
  console.log('=== quiz_blanks.explanation_data の移行 ===');
  const [rows] = await pool.query(
    'SELECT blank_id, explanation_data FROM quiz_blanks WHERE explanation_data IS NOT NULL AND explanation_url IS NULL'
  );
  console.log(`対象件数: ${rows.length}`);

  for (const row of rows) {
    const buf = Buffer.isBuffer(row.explanation_data) ? row.explanation_data : Buffer.from(row.explanation_data);
    const mimeType = detectMimeType(buf);
    const ext = mimeToExt(mimeType);
    const key = `blanks/${row.blank_id}/explanation.${ext}`;

    try {
      const url = await uploadBuffer(buf, key, mimeType);
      await pool.query('UPDATE quiz_blanks SET explanation_url = ? WHERE blank_id = ?', [url, row.blank_id]);
      console.log(`  OK: ${row.blank_id} -> ${url}`);
    } catch (err) {
      console.error(`  ERROR: ${row.blank_id}: ${err.message}`);
    }
  }
}

async function main() {
  try {
    await migrateQuestionImages();
    await migrateQuestionExplanations();
    await migrateBlankExplanations();
    console.log('\n移行完了');
  } catch (err) {
    console.error('移行失敗:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
