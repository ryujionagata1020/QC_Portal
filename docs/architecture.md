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
- **セキュリティヘッダー**: helmet (CSP, HSTS等)
- **CSRF対策**: カスタム実装 (セッションベーストークン)
- **レート制限**: express-rate-limit
- **フラッシュメッセージ**: connect-flash
- **メール送信**: Nodemailer
- **数式レンダリング**: KaTeX (CDN配信)
- **フロントエンド**: Vanilla JavaScript (フレームワーク不使用)
- **グラフ描画**: Chart.js (動的読み込み) + Canvas API (直接描画)
- **CSSリセット**: RESS
- **Lint**: ESLint

## 3. レイヤー構成

### 3.1 プレゼンテーション層

- `views/` 配下のEJSテンプレートがHTMLを生成する
- `views/_share/` に共通部品 (navbar, footer, metadata, javascripts) を配置し、各ページテンプレートからインクルードする
- `public/` 配下のCSS・JavaScript・画像を静的アセットとして `express.static` で配信する
- クライアントサイドはVanilla JavaScriptで動作し、解答送信・認証・アカウント操作などをAjax (非同期リクエスト) で処理する
- ツールページ (`/tools/simulate`) は複数のIIFEモジュール (`js/tools/`) で構成され、タブ切り替えで3つのツール（仮説検定シミュレーター・管制図シミュレーター・分布族マップ）を提供する

### 3.2 ルーティング層

- `routes/` 配下に機能別のルートハンドラを配置する
- 各ルートファイルが `express.Router()` を使用して独立したモジュールとして機能する
- `app.js` で各ルーターを登録し、URLパスとルートハンドラを紐づける
- ルート構成は以下の通り
  - `index.js` — トップページ・情報ページ (`/`, `/qcis`, `/statisinfo`)
  - `pages.js` — 静的ページ (`/kiyaku`, `/privacy-policy`, `/sitemap`, `/manual`)
  - `auth.js` — 認証 (`/auth/*`)
  - `account.js` — アカウント管理API (`/account/*`)
  - `contact.js` — お問い合わせ (`/contact/*`)
  - `tools.js` — ツールページ・API (`/tools/*`)
  - `question_select.js` — 問題選択 (`/questions/select`)
  - `question_start.js` — テスト開始 (`/questions/start`)
  - `question_start_omakase.js` — おまかせ出題 (`/questions/start-omakase`)
  - `ques.js` — 問題表示・セッション管理・チェック機能 (`/questions/*`)
  - `question_answer.js` — 解答判定 (`/questions/answer`)

### 3.3 データアクセス層

- `lib/database/pool.js` が mysql2 ライブラリを使用したコネクションプールを管理する
- `lib/database/client.js` が SQLファイルローダー (`@garafu/mysql-fileloader`) を介して `.sql` ファイルを読み込み、クエリを実行する
- SQLクエリは `lib/database/sql/` 配下に `.sql` ファイルとして外部管理し、コードとクエリを分離する
- 一部ルート (`ques.js`, `question_start.js`) では動的なパラメータが必要なため、SQLをルート内でインライン生成する

### 3.4 ビジネスロジック層

- `lib/statistics/` に仮説検定シミュレーターのサーバーサイド計算ロジックを集約する
  - t検定・z検定・χ²検定・F検定の実行、入力バリデーション、計算ステップ生成、臨界値取得
- `lib/mail/` にお問い合わせメールの本文構築ロジックを集約する

## 4. 認証・セッションアーキテクチャ

- Passport.js の LocalStrategy を使用し、ユーザーID + パスワードによる認証を行う
- パスワードは bcrypt でハッシュ化して保存・照合する
- セッションは express-session で管理し、ストレージとして express-mysql-session を使用してMySQL上に永続化する
- セッションにはPassportのシリアライズ情報、CSRFトークン、出題中の問題IDリストを格納する
- `config/passport.config.js` に認証ストラテジーの定義とシリアライズ/デシリアライズ処理を集約する
- **セッション固定攻撃対策**: ログイン成功後に `req.session.regenerate()` でセッションIDを再生成し、Passport情報とCSRFトークンを新セッションに引き継ぐ

### 4.1 出題セッションの永続化

- 出題中にログアウトした場合、`POST /auth/logout` で出題セッション (`questionIds`, `currentIndex`, `sessionStartedAt`) をDBの `quiz_sessions` テーブルに保存する (`INSERT_OR_UPDATE_quiz_session.sql`)
- 次回ログイン時に `SELECT_quiz_session_BY_user_id.sql` で保存済みセッションを復元し、セッションオブジェクトに格納する
- `GET /questions/select` の表示時は、セッションとDBの両方を確認して中断再開情報 (`resumeData`) を生成する
- `GET /questions/resume` でDBから直接セッションを復元して中断した問題へリダイレクトする
- 全問完了時の `POST /questions/complete` でセッションオブジェクトとDB両方から出題データを削除する
- 1時間ごとの定期バッチ (`DELETE_expired_quiz_sessions.sql`) で期限切れセッションをクリーンアップする

## 5. セキュリティアーキテクチャ

### 5.1 セキュリティヘッダー

- `helmet` ミドルウェアでCSP (Content Security Policy)、HSTS等のセキュリティヘッダーを設定する
- CSPで許可するCDNは `cdn.jsdelivr.net` のみに限定する

### 5.2 CSRF対策

- セッション初期化時に `crypto.randomBytes(32)` で生成したトークンをセッションに保存し、`res.locals.csrfToken` でビューに公開する
- POST/PUT/DELETEリクエストで `req.body._csrf` またはヘッダー `x-csrf-token` を検証するミドルウェアを全ルートに適用する

### 5.3 レート制限

- `express-rate-limit` を各重要エンドポイントに適用する
  - ログイン: 5回/分
  - 新規登録: 5回/時
  - お問い合わせ: 10回/30分
  - 問題表示: 200回/分
  - 仮説検定シミュレーション: 60回/分

### 5.4 入力サニタイズ

- お問い合わせフォームではHTMLタグ除去・制御文字除去・メールヘッダーインジェクション対策を実施する
- ハニーポットフィールドでBot送信を検出・排除する

## 6. 設定管理

- `config/application.config.js` — ポート番号、セッションシークレット等のアプリケーション全般設定
- `config/mysql.config.js` — MySQL接続先、ユーザー名、パスワード、DB名、接続数上限
- `config/passport.config.js` — Passport認証ストラテジーの設定
- `config/mailer.config.js` — Nodemailerトランスポーターの設定
- `.env` — 環境変数によるDB認証情報・メール設定等の機密情報管理 (Gitには含めない)
- `scripts/check-env.js` — 起動時に必須環境変数の存在を検証する

## 7. データフロー

### 7.1 問題出題フロー (通常選択)

- ユーザーが問題選択画面で級・カテゴリ・問題数・未回答フィルタを選択する
- `POST /questions/start` で条件に合致する問題IDリストをDBから取得し、Fisher-Yatesシャッフル後にセッションに格納する
- `GET /questions/:question_id` でセッションの問題IDリストに従い、問題詳細をDBから取得してEJSテンプレートで描画する
- 連続出題時は、セッション内の問題IDリストを順に辿り、現在の進捗 (n問目 / 全m問) を管理する

### 7.2 おまかせ出題フロー

- ユーザーがプリセットモード (4級全般・実践編・手法編等) を選択して `POST /questions/start-omakase` を送信する
- `SELECT_question_ids_BY_testlevel_scope.sql` (またはカテゴリ指定版) で問題IDを取得し、シャッフル・件数制限後にセッションに格納する
- 以降の出題は通常選択と同様の流れで処理する

### 7.3 解答判定フロー

- ユーザーが各空欄の選択肢を選び、`POST /questions/answer` にAjaxリクエストを送信する
- サーバー側で空欄ごとの正解選択肢をDBから取得し、ユーザーの選択と比較して正誤判定する
- 認証済みユーザーの場合、解答結果を `user_responses` テーブルに記録する
- 判定結果をJSONで返却し、クライアント側で正誤表示コンポーネントを描画する

### 7.4 認証フロー

- `POST /auth/register` でユーザー登録 → bcryptハッシュ化 → DB保存
- `POST /auth/login` でPassport.js認証 → セッション再生成 → DBからquiz_session復元 → `last_login_at` 更新
- `POST /auth/logout` でquiz_sessionをDBに保存 → セッション破棄

### 7.5 お問い合わせフロー

- `GET /contact` で入力フォームを表示する
- `POST /contact` でバリデーション・サニタイズ後、フォームデータをセッションに保存して確認画面へリダイレクトする
- `POST /contact/confirm` でDBへ保存 → ユーザー向け受付確認メール + 管理者向け通知メールを非同期送信 → 完了画面へリダイレクトする

### 7.6 仮説検定シミュレーション フロー

- クライアント (`api-client.js`) が `POST /tools/api/simulate` に入力パラメータを送信する
- `lib/statistics/tests.js` がバリデーションと検定計算を実行し、統計量・臨界値・判定結果を返却する
- クライアント側でCanvas APIを使って確率分布グラフを描画する

### 7.7 チェック機能フロー

- 認証済みユーザーが問題ページでチェックボタン (黄/緑/赤) をクリックする
- `POST /questions/:question_id/check` でDBの `user_question_checks` テーブルにINSERT IGNOREする
- `DELETE /questions/:question_id/check` でチェックを解除する
- `GET /account/checks/:color` で色別チェック問題一覧を取得し、アカウントモーダルに表示する
- `POST /questions/start-from-checks` でチェック問題をシャッフルして連続出題を開始する

## 8. データベース設計概要

- **問題関連**: `quiz_questions`, `quiz_blanks`, `quiz_choices`, `quiz_answers`
- **カテゴリ関連**: `quiz_large_category`, `quiz_small_category`, `theorypractice`
- **ユーザー関連**: `users`, `user_responses`, `user_question_checks`
- **出題セッション**: `quiz_sessions` (ログアウト時に出題中セッションを永続化)
- **お問い合わせ**: `contact_inquiries`
- **お知らせ**: `announcements`
- **セッション管理**: `sessions` (express-mysql-session が自動管理)
- 問題→空欄→選択肢・正解の階層構造でデータを保持する
- カテゴリは大分類→小分類の2階層で管理し、小分類に級情報を紐づける

## 9. 静的アセット配信

- `express.static` ミドルウェアで `public/` ディレクトリを `/public/` パスで公開する
- メインスタイルシート (`index.css`) でレイアウト・ナビ・モーダル・問題表示等のスタイルを定義する
- KaTeX は CDN から配信し、数式レンダリングに使用する
- `copy-protection.js` でコンテンツのコピー防止を実装する
- Canvas APIを使ったグラフ描画 (`js/tools/`) はDPR (devicePixelRatio) に対応してRetinaディスプレイでも鮮明に描画する

## 10. ディレクトリ構成方針

- **機能別分割**: ルートハンドラは機能単位で個別ファイルに分割する
- **SQL外部管理**: SQLクエリは `.sql` ファイルとしてコードから分離し、保守性を確保する
- **共通部品化**: ビューの共通要素 (navbar, footer等) は `_share/` に集約してインクルードする
- **設定集約**: アプリケーション設定・DB設定・認証設定・メール設定を `config/` に集約する
- **ビジネスロジック分離**: 統計計算・メール構築など再利用可能なロジックは `lib/` に集約する
- **ドキュメント整備**: `docs/` にスキーマ定義・アーキテクチャ・機能設計を配置する
