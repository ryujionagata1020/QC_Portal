# QC_Portal リポジトリ構成

## ディレクトリツリー

```
QC_Portal/
├── config/                          # 設定ファイル
│   ├── application.config.js        # アプリケーション設定 (PORT, SESSION_SECRET)
│   ├── mysql.config.js              # MySQL接続設定
│   └── passport.config.js           # Passport認証ストラテジー設定
│
├── lib/                             # ライブラリ / ユーティリティ
│   └── database/
│       ├── client.js                # MySQLクライアントラッパー (SQLファイルローダー付き)
│       ├── pool.js                  # MySQLコネクションプール管理
│       └── sql/                     # SQLクエリファイル群
│           ├── DELETE_user_BY_user_id.sql
│           ├── DELETE_user_responses_BY_user.sql
│           ├── INSERT_user_response.sql
│           ├── SELECT_achievement_categories_BY_testlevel.sql
│           ├── SELECT_achievement_coverage_BY_testlevel.sql
│           ├── SELECT_activity_daily_BY_testlevel.sql
│           ├── SELECT_activity_monthly_BY_testlevel.sql
│           ├── SELECT_activity_weekly_BY_testlevel.sql
│           ├── SELECT_activity_yearly_BY_testlevel.sql
│           ├── SELECT_category_tree.sql
│           ├── SELECT_correct_answer_BY_blank_id.sql
│           ├── SELECT_question_BY_conditions.sql
│           ├── SELECT_question_detail_BY_ID.sql
│           ├── SELECT_question_detail_WITH_BLANKS.sql
│           ├── SELECT_total_learned_count_BY_user.sql
│           └── SELECT_user_history_BY_testlevel.sql
│
├── routes/                          # Expressルートハンドラ
│   ├── index.js                     # トップページ / QC検定情報 / 統計情報
│   ├── pages.js                     # 静的ページ (利用規約, プライバシーポリシー)
│   ├── auth.js                      # 認証 (ログイン, 登録, ログアウト)
│   ├── account.js                   # アカウント管理API (履歴, 統計, 達成度, 活動, 削除)
│   ├── ques.js                      # 問題表示・完了統計・テスト完了
│   ├── question_select.js           # 問題選択画面
│   ├── question_start.js            # テスト開始 (セッションに問題IDを格納)
│   └── question_answer.js           # 解答送信・正誤判定
│
├── views/                           # EJSテンプレート
│   ├── index.ejs                    # トップページ
│   ├── qcis.ejs                     # QC検定情報ページ
│   ├── statisinfo.ejs               # 統計情報ページ
│   ├── kiyaku.ejs                   # 利用規約
│   ├── privacy-policy.ejs           # プライバシーポリシー
│   ├── questions/
│   │   ├── question.ejs             # 問題表示テンプレート
│   │   └── select_question.ejs      # 問題選択UI
│   └── _share/                      # 共通テンプレート部品
│       ├── navbar.ejs               # ヘッダーナビゲーション
│       ├── footer.ejs               # フッター
│       ├── account_modal.ejs        # アカウント管理モーダル
│       ├── metadata.ejs             # HTMLメタデータ
│       ├── javascripts.ejs          # 共通スクリプト読み込み
│       ├── result_display.ejs       # 解答結果表示コンポーネント
│       └── account/                 # アカウント管理セクション部品
│           ├── menu.ejs             # アカウントメニュー
│           ├── category_confirm.ejs # カテゴリ確認ダイアログ
│           ├── section_achievement.ejs  # 達成度セクション
│           ├── section_activity.ejs     # 学習活動セクション
│           ├── section_history.ejs      # 解答履歴セクション
│           ├── section_profile.ejs      # プロフィールセクション
│           ├── section_radar.ejs        # レーダーチャートセクション
│           └── section_settings.ejs     # 設定セクション
│
├── public/                          # 静的アセット
│   ├── index.css                    # メインスタイルシート
│   ├── gradeData.js                 # 級別データ定義
│   ├── copy-protection.js           # コピー防止スクリプト
│   ├── favicon.ico                  # ファビコン
│   ├── *.png / *.jpg                # 画像ファイル群 (ペンギンマスコット等)
│   └── js/                          # クライアントサイドJavaScript
│       └── account/                 # アカウント管理用スクリプト
│           ├── achievement.js       # 達成度表示ロジック
│           ├── activity.js          # 学習活動グラフロジック
│           ├── chart-loader.js      # Chart.js動的読み込み
│           ├── history.js           # 解答履歴表示ロジック
│           ├── modal.js             # モーダルダイアログ制御
│           ├── radar.js             # レーダーチャート描画
│           └── settings.js          # アカウント設定ロジック
│
├── docs/                            # ドキュメント
│   ├── db_schema.md                 # データベーススキーマ定義
│   ├── architecture.md              # アーキテクチャ設計書
│   ├── functional-design.md         # 機能設計書
│   └── repository-structure.md      # リポジトリ構成 (本ファイル)
│
├── .vscode/                         # VSCode設定
│   └── launch.json                  # デバッグ設定
│
├── app.js                           # エントリーポイント (Expressサーバー)
├── package.json                     # 依存パッケージ定義
├── .env                             # 環境変数 (DB認証情報等)
├── .eslintrc.js                     # ESLint設定
├── .gitignore                       # Git除外設定
└── CLAUDE.md                        # Claude向けプロジェクト指示
```

## 各ディレクトリの役割

### `config/` - 設定ファイル

アプリケーション全体の設定を管理する。

| ファイル | 役割 |
|---|---|
| `application.config.js` | ポート番号、セッションシークレットなどアプリ全般の設定値 |
| `mysql.config.js` | MySQLの接続先ホスト、ポート、ユーザー名、パスワード、DB名、接続数上限 |
| `passport.config.js` | Passport.jsのLocalStrategy定義。bcryptによるパスワード照合、セッションのシリアライズ/デシリアライズ、ログイン時刻の更新処理 |

### `lib/database/` - データベースアクセス層

MySQLへの接続とクエリ実行を抽象化するモジュール群。

| ファイル | 役割 |
|---|---|
| `pool.js` | mysql2ライブラリを使用したコネクションプール。`getConnection()`, `executeQuery()`, `releaseConnection()`, `end()` をPromise化して提供 |
| `client.js` | `@garafu/mysql-fileloader` でSQLファイルを読み込み、`MySQLClient.executeQuery()` で実行するラッパー。`sql` ローダーをエクスポート |

### `lib/database/sql/` - SQLクエリファイル

SQLクエリを `.sql` ファイルとして外部管理し、`client.js` 経由で読み込む。

| ファイル | 役割 |
|---|---|
| `DELETE_user_BY_user_id.sql` | user_idに該当するユーザーを削除 |
| `DELETE_user_responses_BY_user.sql` | user_idに該当するユーザーの解答記録を削除 |
| `INSERT_user_response.sql` | ユーザーの解答結果を記録 |
| `SELECT_achievement_categories_BY_testlevel.sql` | 級別・カテゴリ別の達成度(解答数・正解数・期間別集計)を取得 |
| `SELECT_achievement_coverage_BY_testlevel.sql` | 級別の問題カバー率(解答済み問題数/総問題数)を取得 |
| `SELECT_activity_daily_BY_testlevel.sql` | 日別の学習活動(解答数・正解数)を取得 |
| `SELECT_activity_monthly_BY_testlevel.sql` | 月別の学習活動(解答数・正解数)を取得 |
| `SELECT_activity_weekly_BY_testlevel.sql` | 週別の学習活動(解答数・正解数)を取得 |
| `SELECT_activity_yearly_BY_testlevel.sql` | 年別の学習活動(解答数・正解数)を取得 |
| `SELECT_category_tree.sql` | 大分類・小分類をJOINしてカテゴリツリーを取得 |
| `SELECT_correct_answer_BY_blank_id.sql` | 空欄IDから正解の選択肢を取得 |
| `SELECT_question_BY_conditions.sql` | 級・カテゴリ等の条件で問題一覧を取得 |
| `SELECT_question_detail_BY_ID.sql` | 問題IDから問題の詳細情報を取得 |
| `SELECT_question_detail_WITH_BLANKS.sql` | 問題の詳細と空欄・選択肢を含めて取得 |
| `SELECT_total_learned_count_BY_user.sql` | ユーザーが解答済みの問題数(重複除外)を取得 |
| `SELECT_user_history_BY_testlevel.sql` | 級別のユーザー解答履歴をROW_NUMBERでランク付けして取得 |

### `routes/` - ルートハンドラ

Express のルーティングを機能別に分割したモジュール群。

| ファイル | エンドポイント | 役割 |
|---|---|---|
| `index.js` | `GET /`, `GET /qcis`, `GET /statisinfo` | トップページ(ランダム問題表示)、QC検定情報、統計情報ページ |
| `pages.js` | `GET /kiyaku`, `GET /privacy-policy` | 利用規約・プライバシーポリシー等の静的ページ |
| `auth.js` | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/status` | 認証関連。Passport.jsによるログイン、bcryptによるパスワードハッシュ登録、ログアウト、認証状態確認 |
| `account.js` | `GET /account/history/:testlevel`, `GET /account/stats/total-learned`, `DELETE /account/delete`, `GET /account/achievement/:testlevel`, `GET /account/activity/:testlevel`, `GET /account/view/:question_id` | アカウント管理。解答履歴取得、学習統計、アカウント削除、達成度、学習活動、問題閲覧 |
| `question_select.js` | `GET /questions/select` | カテゴリツリーを取得して問題選択画面を表示 |
| `question_start.js` | `POST /questions/start` | 選択された級・カテゴリで問題IDリストを取得しセッションに格納、最初の問題へリダイレクト |
| `ques.js` | `GET /questions/completion-stats`, `POST /questions/complete`, `GET /questions/:question_id` | 問題IDに対応する問題詳細(空欄・選択肢・画像)を取得し表示。完了統計の取得、テスト完了処理。単問モード/連続モード対応 |
| `question_answer.js` | `POST /questions/answer` | 解答を受け取り正誤判定。認証ユーザーの場合は `user_responses` に記録。JSONで結果返却 |

### `views/` - EJSテンプレート

サーバーサイドレンダリング用のEJSテンプレート群。

| ファイル/ディレクトリ | 役割 |
|---|---|
| `index.ejs` | トップページ。ランダム問題のプレビュー表示 |
| `qcis.ejs` | QC検定の概要情報ページ |
| `statisinfo.ejs` | 学習統計・達成度の表示ページ |
| `kiyaku.ejs` | 利用規約ページ |
| `privacy-policy.ejs` | プライバシーポリシーページ |
| `questions/question.ejs` | 問題表示テンプレート。空欄の穴埋め選択肢をレンダリング |
| `questions/select_question.ejs` | 級・カテゴリ選択のUI |
| `_share/navbar.ejs` | 共通ヘッダー。ユーザーメニュー(ログイン/アカウント/ログアウト)を含む |
| `_share/footer.ejs` | 共通フッター |
| `_share/account_modal.ejs` | アカウント管理用モーダルダイアログ |
| `_share/metadata.ejs` | 共通HTMLメタタグ |
| `_share/javascripts.ejs` | 共通JavaScriptインポート(KaTeX等) |
| `_share/result_display.ejs` | 解答結果(正解/不正解)表示コンポーネント |
| `_share/account/menu.ejs` | アカウントモーダル内のメニュー(タブ切り替え) |
| `_share/account/category_confirm.ejs` | カテゴリ選択の確認ダイアログ |
| `_share/account/section_achievement.ejs` | 達成度表示セクション |
| `_share/account/section_activity.ejs` | 学習活動グラフセクション |
| `_share/account/section_history.ejs` | 解答履歴一覧セクション |
| `_share/account/section_profile.ejs` | プロフィール表示セクション |
| `_share/account/section_radar.ejs` | レーダーチャート表示セクション |
| `_share/account/section_settings.ejs` | アカウント設定セクション |

### `public/` - 静的アセット

Express の `express.static` ミドルウェアで配信される静的ファイル群。

| ファイル/ディレクトリ | 役割 |
|---|---|
| `index.css` | メインスタイルシート。レイアウト、ナビ、モーダル、問題表示等のスタイル定義 |
| `gradeData.js` | 各級の情報を定義するクライアントサイドスクリプト |
| `copy-protection.js` | コンテンツのコピー防止用スクリプト |
| `favicon.ico` | ブラウザタブに表示されるアイコン |
| `*.png / *.jpg` | ペンギンマスコット画像、QC関連イメージ等 |
| `js/account/achievement.js` | 達成度データの取得・表示ロジック |
| `js/account/activity.js` | 学習活動データの取得・グラフ表示ロジック |
| `js/account/chart-loader.js` | Chart.jsの動的読み込みユーティリティ |
| `js/account/history.js` | 解答履歴データの取得・テーブル表示ロジック |
| `js/account/modal.js` | アカウントモーダルの開閉・タブ切り替え制御 |
| `js/account/radar.js` | カテゴリ別正解率のレーダーチャート描画 |
| `js/account/settings.js` | アカウント設定(削除等)のロジック |

### `docs/` - ドキュメント

プロジェクトのドキュメントを格納するディレクトリ。

| ファイル | 役割 |
|---|---|
| `db_schema.md` | データベーススキーマの定義書(テーブル構造・リレーション) |
| `architecture.md` | アーキテクチャ設計書 |
| `functional-design.md` | 機能設計書 |
| `repository-structure.md` | リポジトリ構成(本ファイル) |

### ルートディレクトリのファイル

| ファイル | 役割 |
|---|---|
| `app.js` | エントリーポイント。Express初期化、ミドルウェア設定(body-parser, cookie-parser, session)、Passport初期化、MySQLセッションストア設定、ルート登録、サーバー起動 |
| `package.json` | プロジェクト名・バージョン・依存パッケージの定義 |
| `.env` | 環境変数(DB認証情報等、Gitには含めない) |
| `.eslintrc.js` | ESLintのルール設定 |
| `.gitignore` | Gitで追跡しないファイルの指定 |
| `CLAUDE.md` | Claude Code向けプロジェクト指示ファイル |

## 技術スタック

| 区分 | 技術 |
|---|---|
| ランタイム | Node.js |
| フレームワーク | Express.js v5 |
| データベース | MySQL (mysql2/promise) |
| テンプレートエンジン | EJS |
| 認証 | Passport.js (LocalStrategy) |
| パスワードハッシュ | bcrypt |
| セッション管理 | express-session + express-mysql-session |
| 数式レンダリング | KaTeX (CDN) |
| グラフ描画 | Chart.js (動的読み込み) |
| フロントエンド | Vanilla JavaScript (フレームワークなし) |
| CSSリセット | RESS |
| Lint | ESLint |
