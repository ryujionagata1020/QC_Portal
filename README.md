# QC Portal

QC検定®を受験するユーザーが問題演習を通して合格を達成するためのポータルサイト

## 主な機能

- **問題演習システム**: 級別・カテゴリ別に問題を絞り込んで学習
- **学習履歴管理**: 解答履歴の記録と達成度の可視化
- **アカウント管理**: ユーザー登録・ログイン・プロフィール管理
- **統計情報**: 学習進捗や分野別の達成度をグラフで確認
- **ツール**: 管理図シミュレータ、確率分布マップなどの学習ツール

## 技術スタック

- **Backend**: Node.js (Express v5)
- **Frontend**: EJS テンプレート、Vanilla JavaScript
- **Database**: MySQL
- **認証**: Passport.js (LocalStrategy)
- **セッション**: express-session + MySQL Store
- **セキュリティ**: Helmet, express-rate-limit, bcrypt

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/ryujionagata1020/QC_Portal.git
cd QC_Portal
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成します:

```bash
cp .env.example .env
```

`.env` ファイルを開き、以下の環境変数を設定してください:

```env
# データベース接続情報
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_password_here
MYSQL_DATABASE=qc_portal

# セッションシークレット（64文字以上のランダム文字列）
SESSION_SECRET=your_random_64_character_secret_here

# アプリケーション設定
NODE_ENV=development
PORT=3000
```

**重要**:
- `SESSION_SECRET` は必ず64文字以上のランダムな文字列を設定してください
- 生成方法: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 4. データベースのセットアップ

MySQLにログインし、データベースとテーブルを作成します:

```bash
# データベースの作成
mysql -u root -p -e "CREATE DATABASE qc_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# スキーマのインポート
mysql -u root -p qc_portal < docs/database-schema.sql
```

### 5. アプリケーションの起動

#### 本番環境

```bash
npm start
```

#### 開発環境（自動リロード付き）

```bash
npm run dev
```

アプリケーションは `http://localhost:3000` で起動します。

## プロジェクト構造

```
QC_Portal/
├── app.js                  # アプリケーションのエントリーポイント
├── config/                 # 設定ファイル
│   ├── application.config.js
│   ├── mysql.config.js
│   └── passport.config.js
├── routes/                 # ルーティング
│   ├── auth.js            # 認証関連
│   ├── account.js         # アカウント管理
│   ├── ques.js            # 問題表示
│   └── ...
├── views/                  # EJS テンプレート
│   ├── _share/            # 共通コンポーネント
│   ├── questions/         # 問題表示ページ
│   └── ...
├── public/                 # 静的ファイル
│   ├── index.css          # メインCSS
│   └── js/                # クライアントサイドJS
├── lib/                    # ライブラリ
│   ├── database/          # データベース関連
│   └── statistics/        # 統計処理
├── scripts/                # ユーティリティスクリプト
│   └── check-env.js       # 環境変数チェック
└── docs/                   # ドキュメント
    ├── database-schema.sql
    ├── architecture.md
    └── functional-design.md
```

## セキュリティ機能

- ✅ パスワードのハッシュ化（bcrypt）
- ✅ CSRF対策（セッションベーストークン）
- ✅ Session Fixation対策（ログイン時にセッションID再生成）
- ✅ レート制限（ログイン: 5回/分、登録: 5回/時）
- ✅ セキュリティヘッダー（Helmet）
- ✅ XSS対策（EJSのエスケープ機能）
- ✅ 環境変数による機密情報の分離

## 環境変数の詳細

### 必須環境変数

アプリケーション起動時にチェックされます。欠けている場合はエラーで停止します。

- `MYSQL_HOST` - MySQLサーバーのホスト
- `MYSQL_PORT` - MySQLサーバーのポート
- `MYSQL_USERNAME` - MySQLユーザー名
- `MYSQL_PASSWORD` - MySQLパスワード
- `MYSQL_DATABASE` - データベース名
- `SESSION_SECRET` - セッション暗号化キー（64文字以上）

### オプション環境変数

設定されていない場合はデフォルト値が使用されます。

- `NODE_ENV` - 実行環境（development / production）
- `PORT` - アプリケーションのポート番号（デフォルト: 3000）
- `APP_URL` - アプリケーションのURL

## トラブルシューティング

### 環境変数エラー

```
❌ エラー: 以下の必須環境変数が設定されていません:
   - SESSION_SECRET
```

→ `.env` ファイルを作成し、必須環境変数を設定してください。

### データベース接続エラー

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

→ MySQLサーバーが起動していることを確認してください。

### SESSION_SECRET 長さエラー

```
⚠️  警告: SESSION_SECRET は64文字以上を推奨します。
```

→ より長いランダム文字列を生成して設定してください。

## ライセンス

MIT License

## 作者

Ryujiro Nagata

## リポジトリ

https://github.com/ryujionagata1020/QC_Portal
