# QC_Portal システムアーキテクチャ

## 1. 全体構成

- サーバーサイドレンダリング (SSR) 方式のWebアプリケーション
- エントリーポイントは `app.js` で、Expressサーバーの初期化・ミドルウェア設定・ルート登録・起動を行う
- MVC風のレイヤード構成を採用し、ルート (Controller) → データベース層 (Model) → テンプレート (View) の流れで処理する

## 2. 技術スタック

- **ランタイム**: Node.js
- **Webフレームワーク**: Express.js v5
- **データベース**: MySQL (mysql2/promise)
- **テンプレートエンジン**: EJS
- **認証**: Passport.js (LocalStrategy) + bcrypt
- **セッション管理**: express-session + express-mysql-session
- **数式レンダリング**: KaTeX (CDN配信)
- **フロントエンド**: Vanilla JavaScript (フレームワーク不使用)
- **CSSリセット**: RESS
- **Lint**: ESLint

## 3. レイヤー構成

### 3.1 プレゼンテーション層

- `views/` 配下のEJSテンプレートがHTMLを生成する
- `views/_share/` に共通部品 (navbar, footer, metadata, javascripts) を配置し、各ページテンプレートからインクルードする
- `public/` 配下のCSS・JavaScript・画像を静的アセットとして `express.static` で配信する
- クライアントサイドはVanilla JavaScriptで動作し、解答送信など一部操作をAjax (非同期リクエスト) で処理する

### 3.2 ルーティング層

- `routes/` 配下に機能別のルートハンドラを配置する
- 各ルートファイルが `express.Router()` を使用して独立したモジュールとして機能する
- `app.js` で各ルーターを登録し、URLパスとルートハンドラを紐づける
- ルート構成は以下の通り
  - `index.js` — トップページ・情報ページ (`/`, `/qcis`, `/statisinfo`)
  - `pages.js` — 静的ページ (`/kiyaku`, `/privacy-policy`)
  - `auth.js` — 認証 (`/auth/*`)
  - `account.js` — アカウント管理API (`/account/*`)
  - `question_select.js` — 問題選択 (`/questions/select`)
  - `question_start.js` — テスト開始 (`/questions/start`)
  - `ques.js` — 問題表示 (`/questions/:question_id`)
  - `question_answer.js` — 解答判定 (`/questions/answer`)

### 3.3 データアクセス層

- `lib/database/pool.js` が mysql2 ライブラリを使用したコネクションプールを管理する
- `lib/database/client.js` が SQLファイルローダー (`@garafu/mysql-fileloader`) を介して `.sql` ファイルを読み込み、クエリを実行する
- SQLクエリは `lib/database/sql/` 配下に `.sql` ファイルとして外部管理し、コードとクエリを分離する

## 4. 認証・セッションアーキテクチャ

- Passport.js の LocalStrategy を使用し、ユーザーID + パスワードによる認証を行う
- パスワードは bcrypt でハッシュ化して保存・照合する
- セッションは express-session で管理し、ストレージとして express-mysql-session を使用してMySQL上に永続化する
- セッションにはPassportのシリアライズ情報およびテスト中の問題IDリストを格納する
- `config/passport.config.js` に認証ストラテジーの定義とシリアライズ/デシリアライズ処理を集約する

## 5. 設定管理

- `config/application.config.js` — ポート番号、セッションシークレット等のアプリケーション全般設定
- `config/mysql.config.js` — MySQL接続先、ユーザー名、パスワード、DB名、接続数上限
- `config/passport.config.js` — Passport認証ストラテジーの設定
- `.env` — 環境変数によるDB認証情報等の機密情報管理 (Gitには含めない)

## 6. データフロー

### 6.1 問題出題フロー

- ユーザーが問題選択画面で級・カテゴリを選択する
- `POST /questions/start` で条件に合致する問題IDリストをDBから取得し、セッションに格納する
- `GET /questions/:question_id` でセッションの問題IDリストに従い、問題詳細をDBから取得してEJSテンプレートで描画する
- 連続出題時は、セッション内の問題IDリストを順に辿り、現在の進捗 (n問目 / 全m問) を管理する

### 6.2 解答判定フロー

- ユーザーが各空欄の選択肢を選び、`POST /questions/answer` にAjaxリクエストを送信する
- サーバー側で空欄ごとの正解選択肢をDBから取得し、ユーザーの選択と比較して正誤判定する
- 認証済みユーザーの場合、解答結果を `user_responses` テーブルに記録する
- 判定結果をJSONで返却し、クライアント側で正誤表示コンポーネントを描画する

### 6.3 認証フロー

- `POST /auth/register` でユーザー登録 → bcryptハッシュ化 → DB保存 → 自動ログイン
- `POST /auth/login` でPassport.js認証 → セッション生成 → `last_login_at` 更新
- `POST /auth/logout` でセッション破棄

## 7. データベース設計概要

- **問題関連**: `quiz_questions`, `quiz_blanks`, `quiz_choices`, `quiz_answers`
- **カテゴリ関連**: `quiz_large_category`, `quiz_small_category`, `theorypractice`
- **ユーザー関連**: `users`, `user_responses`
- **セッション管理**: `sessions` (express-mysql-session が自動管理)
- 問題→空欄→選択肢・正解の階層構造でデータを保持する
- カテゴリは大分類→小分類の2階層で管理し、小分類に級情報を紐づける

## 8. 静的アセット配信

- `express.static` ミドルウェアで `public/` ディレクトリを公開する
- メインスタイルシート (`index.css`) でレイアウト・ナビ・モーダル・問題表示等のスタイルを定義する
- KaTeX は CDN から配信し、数式レンダリングに使用する
- `copy-protection.js` でコンテンツのコピー防止を実装する

## 9. ディレクトリ構成方針

- **機能別分割**: ルートハンドラは機能単位で個別ファイルに分割する
- **SQL外部管理**: SQLクエリは `.sql` ファイルとしてコードから分離し、保守性を確保する
- **共通部品化**: ビューの共通要素 (navbar, footer等) は `_share/` に集約してインクルードする
- **設定集約**: アプリケーション設定・DB設定・認証設定を `config/` に集約する
- **ドキュメント整備**: `docs/` にスキーマ定義・アーキテクチャ・機能設計・要件定義を配置する
