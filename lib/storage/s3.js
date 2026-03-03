// lib/storage/s3.js
// Lightsail Object Storage (S3互換) へのファイルアップロードヘルパー

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Lightsail Object Storage では必須
});

const BUCKET = process.env.S3_BUCKET_NAME;

/**
 * バッファをS3にアップロードし、公開URLを返す
 * @param {Buffer} buffer - アップロードするバイナリデータ
 * @param {string} key - S3上のオブジェクトキー（例: "questions/Q001/image.png"）
 * @param {string} contentType - MIMEタイプ（例: "image/png"）
 * @returns {Promise<string>} - 公開URL
 */
async function uploadBuffer(buffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  });
  await client.send(command);
  return getPublicUrl(key);
}

/**
 * S3オブジェクトの公開URLを生成する
 * @param {string} key
 * @returns {string}
 */
function getPublicUrl(key) {
  // Lightsail Object Storage の公開URL形式
  // 例: https://qc-portal-media.s3.ap-northeast-1.amazonaws.com/questions/Q001/image.png
  const endpoint = process.env.S3_ENDPOINT.replace(/\/$/, '');
  return `${endpoint}/${BUCKET}/${key}`;
}

/**
 * バッファのMIMEタイプをマジックバイトで判定する
 * @param {Buffer} buf
 * @returns {string}
 */
function detectMimeType(buf) {
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49) return 'image/gif';
  return 'image/png';
}

/**
 * MIMEタイプから拡張子を取得する
 * @param {string} mimeType
 * @returns {string}
 */
function mimeToExt(mimeType) {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' };
  return map[mimeType] || 'png';
}

module.exports = { uploadBuffer, getPublicUrl, detectMimeType, mimeToExt };
