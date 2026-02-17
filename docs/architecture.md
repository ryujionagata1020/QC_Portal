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

### 8.1 ダークモード実装

- CSS変数による柔軟なテーマシステムを採用
- `:root` でライトテーマのCSS変数を定義
- `[data-theme="dark"]` セレクタでダークテーマのCSS変数をオーバーライド
- 全6,000行超のCSSで使用される色値をCSS変数に統一（664箇所、95種類のCSS変数を使用）
- ナビバーに配置されたテーマ切り替えボタンで即座にテーマを切り替え可能
- ユーザーの選択は `localStorage` に `theme` キーで永続化され、次回訪問時にも反映される
- テーマ切り替えボタンはアイコン（月:ライト/太陽:ダーク）で視覚的にフィードバック
- レスポンシブデザインにも対応し、モバイル表示でも最適なレイアウトを維持

## 9. セキュリティアーキテクチャ

### 9.1 CSRF保護

- `app.js` でCSRFトークン生成・検証を実装する
- セッションにCSRFトークンを格納し、全てのPOST/PUT/DELETEリクエストで検証する
- トークンは `req.session.csrfToken` として生成され、`res.locals.csrfToken` を経由してビューに渡される
- クライアント側では `<meta name="csrf-token">` タグからトークンを取得し、Ajaxリクエストのヘッダーまたはボディに含める
- GET/HEAD/OPTIONSリクエストは検証をスキップする

### 9.2 Rate Limiting

- `/tools/api/simulate` エンドポイントに60秒あたり60リクエストの制限を適用する
- express-rate-limit ミドルウェアを使用して実装する

### 9.3 定期クリーンアップジョブ

- `app.js` で1時間ごとに期限切れのクイズセッションを削除する
- `DELETE_expired_quiz_sessions.sql` を実行し、`quiz_sessions` テーブルから古いレコードを削除する
- これによりデータベースの肥大化を防ぐ

## 10. ディレクトリ構成方針

- **機能別分割**: ルートハンドラは機能単位で個別ファイルに分割する
- **SQL外部管理**: SQLクエリは `.sql` ファイルとしてコードから分離し、保守性を確保する
- **共通部品化**: ビューの共通要素 (navbar, footer等) は `_share/` に集約してインクルードする
- **設定集約**: アプリケーション設定・DB設定・認証設定を `config/` に集約する
- **ドキュメント整備**: `docs/` にスキーマ定義・アーキテクチャ・機能設計・要件定義を配置する

## 11. ツール画面のクライアントサイドアーキテクチャ

### 11.1 概要

ツール画面 (`/tools/simulate`) は3つのタブ機能をクライアントサイドで提供する。サーバAPIを使用するのは検定シミュレーション（タブ1）のみであり、管理図シミュレーター（タブ2）と分布ファミリーマップ（タブ3：離散7種＋連続13種＝全20分布）は完全にクライアントサイドで動作する。

### 11.2 モジュールパターン

- 全モジュールがIIFE（即時実行関数式）パターンで実装される
- グローバル名前空間にモジュール変数を公開する (`var ModuleName = (function(){ ... return { publicAPI }; })();`)
- モジュール内部の状態はクロージャで隠蔽する
- モジュール間の通信はコールバック注入と直接メソッド呼出しで行う

### 11.3 タブシステム

- `.tools-tab-bar` 内の `<button class="tools-tab" data-tab="[id]">` でタブを定義する
- `.tools-tab-panels` コンテナ内の `<div class="tools-tab-panel" data-tab="[id]">` でパネルを定義する
- CSSグリッド重ね合わせ方式（`grid-area: 1/1`）により非アクティブパネルを不可視にしつつフッター位置を安定させる
- `cc-main.js` の `initTabs()` / `switchTab()` でタブ切替ロジックを管理する
- 選択中のタブは `localStorage` に永続化する

### 11.4 モジュール依存グラフ

```
タブ1: 検定シミュレーション
  api-client.js → wizard.js → input-cards.js → graph.js → simulate.js

タブ2: 管理図シミュレーター
  cc-data-gen.js → cc-nelson.js → cc-chart.js
    ↓
  cc-beginner.js / cc-expert.js → cc-main.js

タブ3: 分布ファミリーマップ（20分布: 離散7種＋連続13種）
  dm-pdf.js (20分布PMF/PDF) → dm-canvas.js (離散バーチャート＋連続曲線描画)
    ↓
  dm-map.js (20ノード＋25関係矢印) / dm-detail.js (全20分布パラメータ制御) → dm-anim.js (14種変換アニメーション) → dm-main.js
```

スクリプトは `views/tools/simulate.ejs` の末尾で依存順に読み込まれる。cc-main.js は dm-* モジュールより先に読み込まれるため、dm-* モジュールの参照時には `typeof` ガードを使用する。

### 11.5 Canvas描画アーキテクチャ

全てのCanvas描画モジュールに共通するパターン:

- **DPR対応**: `window.devicePixelRatio` を取得し、Canvas内部解像度を `style size × DPR` に設定、`setTransform(DPR,0,0,DPR,0,0)` でスケーリングする
- **レジストリパターン**: 複数Canvasを `{ canvasId: { canvas, ctx } }` のレジストリで管理する（cc-chart.js, dm-canvas.js）
- **座標マッピング**: データ空間からピクセル空間への変換関数 `mapX()` / `mapY()` を提供する
- **マージン定数**: `{ top, right, bottom, left }` オブジェクトでプロット領域を定義する

### 11.6 分布ファミリーマップのモジュール構成

| モジュール | 役割 | 主要パターン |
|-----------|------|-------------|
| `DMPdf` | 20分布のPMF/PDF関数群（離散7種+連続13種）、gammaLn（Lanczos近似）、レンジ計算、yMax算出 | 純関数、外部依存なし |
| `DMCanvas` | Canvas描画ツールキット（DPR対応、座標マッピング、曲線描画、軸描画、ミニPDF） | レジストリパターン、DPR対応 |
| `DMMap` | 関係マップ描画（20ノード＋25関係矢印）、マウス/タッチのヒットテスト | Bezier曲線距離計算、イベントデリゲーション |
| `DMDetail` | 詳細パネル（全20分布のパラメータ制御、離散分布バーチャート、フルサイズPDF/PMFグラフ、Z参照線オーバーレイ、KaTeX数式） | requestAnimationFrameデバウンス |
| `DMAnim` | アニメーションエンジン（14種の分布変換アニメーション、ステップ再生） | requestAnimationFrameループ、easeInOutCubicイージング |
| `dm-main.js` | オーケストレーター（イベント接続、状態管理、localStorage永続化） | コールバック注入、IIFE即時実行 |

## 12. インフラストラクチャ構成

### 12.1 ステージング環境（AWS Lightsail）

```
Internet → Lightsail Static IP → Lightsail Instance (Ubuntu 22.04 / 2GB $10/月)
                                     ├── Node.js 20 LTS (PM2)
                                     └── MySQL 8.0 (localhost)
```

- **OS**: Ubuntu 22.04 LTS
- **インスタンス**: 2GB RAM, 1 vCPU, 60GB SSD
- **DB**: 同一インスタンス内 MySQL 8.0（ローカルソケット接続）
- **プロセス管理**: PM2
- **アクセス**: `http://<静的IP>:3000`（HTTP直接）
- **デプロイ**: SSH接続 → `git pull` → `pm2 restart`
- **詳細手順**: [docs/aws-lightsail-staging.md](aws-lightsail-staging.md)
- **セットアップスクリプト**: [scripts/lightsail-setup.sh](../scripts/lightsail-setup.sh)

### 12.2 本番環境（AWS EC2 + RDS 構成）

```
Internet → Route 53 → CloudFront → ALB → EC2 (Node.js) → RDS MySQL
```

- **詳細手順**: [docs/aws-deploy-simple.md](aws-deploy-simple.md)

### 11.7 CSSプレフィックス規約

- 検定シミュレーション: `sim-*`
- 管理図シミュレーター: `cc-*`
- 分布ファミリーマップ: `dm-*`
- タブシステム: `tools-tab-*`

### 11.8 localStorage使用キー一覧

| キー | 用途 | 所属タブ |
|-----|------|---------|
| `tools_active_tab` | 選択中のタブ | 共通 |
| `sim_global` | 検定シミュレーション設定 | タブ1 |
| `cc_mode` | 初心者/熟練者モード | タブ2 |
| `cc_grade` | 対象級 | タブ2 |
| `cc_beginner_stats` | 初心者モード統計 | タブ2 |
| `dm_slider_n` | スライダー自由度値 | タブ3 |
| `dm_last_node` | 最後に展開したノード | タブ3 |
| `dm_params` | 各分布のパラメータ（JSON） | タブ3 |
