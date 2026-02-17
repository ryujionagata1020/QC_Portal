/**
 * 環境変数チェックスクリプト
 * アプリケーション起動時に必須環境変数が設定されているか検証
 */

// 必須環境変数のリスト
const required = [
  'MYSQL_HOST',
  'MYSQL_PORT',
  'MYSQL_USERNAME',
  'MYSQL_PASSWORD',
  'MYSQL_DATABASE',
  'SESSION_SECRET'
];

// オプション環境変数（警告のみ）
const optional = [
  'NODE_ENV',
  'PORT',
  'APP_URL'
];

// 必須環境変数のチェック
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌ エラー: 以下の必須環境変数が設定されていません:\n');
  missing.forEach(key => {
    console.error(`   - ${key}`);
  });
  console.error('\n.env ファイルを確認してください。');
  console.error('.env.example を参考に .env ファイルを作成してください。\n');
  process.exit(1);
}

// SESSION_SECRET の長さチェック（64文字以上推奨）
if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 64) {
  console.warn('\n⚠️  警告: SESSION_SECRET は64文字以上を推奨します。');
  console.warn('   現在の長さ:', process.env.SESSION_SECRET.length, '文字\n');
}

// CHANGEME などのダミー値チェック
const dummyValues = ['CHANGEME', 'changeme', 'dummy', 'test', 'password', 'secret'];
const suspiciousVars = required.filter(key => {
  const value = process.env[key] || '';
  return dummyValues.some(dummy => value.toLowerCase().includes(dummy));
});

if (suspiciousVars.length > 0) {
  console.warn('\n⚠️  警告: 以下の環境変数にダミー値が含まれている可能性があります:\n');
  suspiciousVars.forEach(key => {
    console.warn(`   - ${key}`);
  });
  console.warn('\n本番環境では必ず適切な値に変更してください。\n');
}

// オプション環境変数の確認（情報提供のみ）
const missingOptional = optional.filter(key => !process.env[key]);
if (missingOptional.length > 0 && process.env.NODE_ENV !== 'production') {
  console.info('\nℹ️  情報: 以下のオプション環境変数が設定されていません:');
  missingOptional.forEach(key => {
    console.info(`   - ${key} (オプション)`);
  });
  console.info('');
}

// NODE_ENV のチェック
if (!process.env.NODE_ENV) {
  console.info('ℹ️  NODE_ENV が設定されていません。デフォルトで development として動作します。\n');
}

console.log('✅ 環境変数のチェックが完了しました。\n');
