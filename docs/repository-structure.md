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
│   ├── database/
│   │   ├── client.js                # MySQLクライアントラッパー (SQLファイルローダー付き)
│   │   ├── pool.js                  # MySQLコネクションプール管理
│   │   └── sql/                     # SQLクエリファイル群 (30ファイル)
│   │       ├── DELETE_expired_quiz_sessions.sql
│   │       ├── DELETE_quiz_session_BY_user_id.sql
│   │       ├── DELETE_user_BY_user_id.sql
│   │       ├── DELETE_user_question_check.sql
│   │       ├── DELETE_user_responses_BY_user.sql
│   │       ├── INSERT_IGNORE_user_question_check.sql
│   │       ├── INSERT_OR_UPDATE_quiz_session.sql
│   │       ├── INSERT_user_response.sql
│   │       ├── SELECT_achievement_categories_BY_testlevel.sql
│   │       ├── SELECT_achievement_coverage_BY_testlevel.sql
│   │       ├── SELECT_activity_daily_BY_testlevel.sql
│   │       ├── SELECT_activity_monthly_BY_testlevel.sql
│   │       ├── SELECT_activity_weekly_BY_testlevel.sql
│   │       ├── SELECT_activity_yearly_BY_testlevel.sql
│   │       ├── SELECT_announcements_latest.sql
│   │       ├── SELECT_category_tree.sql
│   │       ├── SELECT_correct_answer_BY_blank_id.sql
│   │       ├── SELECT_question_BY_conditions.sql
│   │       ├── SELECT_question_detail_BY_ID.sql
│   │       ├── SELECT_question_detail_WITH_BLANKS.sql
│   │       ├── SELECT_quiz_session_BY_user_id.sql
│   │       ├── SELECT_total_learned_count_BY_user.sql
│   │       ├── SELECT_user_history_BY_testlevel.sql
│   │       ├── SELECT_user_question_check_ids_BY_color.sql
│   │       ├── SELECT_user_question_checks_BY_color.sql
│   │       ├── SELECT_user_question_checks_BY_question.sql
│   │       ├── UPDATE_scheduled_exam_date_BY_user_id.sql
│   │       ├── UPDATE_user_name_BY_user_id.sql
│   │       ├── UPDATE_want_grade1_BY_user_id.sql
│   │       └── UPDATE_want_grade2_BY_user_id.sql
│   └── statistics/                  # 統計計算エンジン (新規)
│       ├── index.js                 # 公開API
│       ├── distributions.js         # 確率分布関数 (PDF/CDF)
│       ├── critical-values.js       # 臨界値取得エンジン
│       └── tests.js                 # 12種の仮説検定実装
│
├── data/                            # 統計データ (新規)
│   ├── critical_values_z.json       # 標準正規分布臨界値
│   ├── critical_values_t.json       # t分布臨界値
│   ├── critical_values_chi2.json    # χ²分布臨界値
│   ├── critical_values_f.json       # F分布臨界値
│   ├── contents_templates.json      # 検定UIテンプレート
│   └── presets.json                 # プリセットシナリオ
│
├── routes/                          # Expressルートハンドラ
│   ├── index.js                     # トップページ / QC検定情報 / 統計情報
│   ├── pages.js                     # 静的ページ (利用規約, プライバシーポリシー)
│   ├── auth.js                      # 認証 (ログイン, 登録, ログアウト)
│   ├── account.js                   # アカウント管理API (履歴, 統計, 達成度, 活動, 削除)
│   ├── ques.js                      # 問題表示・完了統計・テスト完了
│   ├── question_select.js           # 問題選択画面
│   ├── question_start.js            # テスト開始 (セッションに問題IDを格納)
│   ├── question_answer.js           # 解答送信・正誤判定
│   └── tools.js                     # 統計ツールAPI (新規)
│
├── views/                           # EJSテンプレート
│   ├── index.ejs                    # トップページ
│   ├── qcis.ejs                     # QC検定情報ページ
│   ├── statisinfo.ejs               # 統計情報ページ
│   ├── kiyaku.ejs                   # 利用規約
│   ├── privacy-policy.ejs           # プライバシーポリシー
│   ├── sitemap.ejs                  # サイトマップ
│   ├── questions/
│   │   ├── question.ejs             # 問題表示テンプレート
│   │   └── select_question.ejs      # 問題選択UI
│   ├── tools/                       # ツール画面 (新規)
│   │   └── simulate.ejs             # 統計シミュレーション統合ビュー
│   └── _share/                      # 共通テンプレート部品
│       ├── navbar.ejs               # ヘッダーナビゲーション
│       ├── footer.ejs               # フッター
│       ├── account_modal.ejs        # アカウント管理モーダル
│       ├── auth_modal.ejs           # 認証モーダル
│       ├── metadata.ejs             # HTMLメタデータ
│       ├── javascripts.ejs          # 共通スクリプト読み込み
│       ├── result_display.ejs       # 解答結果表示コンポーネント
│       └── account/                 # アカウント管理セクション部品 (新規)
│           ├── menu.ejs             # アカウントメニュー
│           ├── category_confirm.ejs # カテゴリ確認ダイアログ
│           ├── section_achievement.ejs  # 達成度セクション
│           ├── section_activity.ejs     # 学習活動セクション
│           ├── section_checks.ejs       # 問題チェック管理セクション
│           ├── section_history.ejs      # 解答履歴セクション
│           ├── section_profile.ejs      # プロフィールセクション
│           ├── section_radar.ejs        # レーダーチャートセクション
│           └── section_settings.ejs     # 設定セクション
│
├── public/                          # 静的アセット
│   ├── index.css                    # メインスタイルシート (~11,000行、ダークモード対応)
│   ├── gradeData.js                 # 級別データ定義
│   ├── copy-protection.js           # コピー防止スクリプト
│   ├── favicon.ico                  # ファビコン
│   ├── *.png / *.jpg                # 画像ファイル群 (ペンギンマスコット等)
│   └── js/
│       ├── account/                 # アカウント管理用スクリプト (新規)
│       │   ├── achievement.js       # 達成度表示ロジック
│       │   ├── activity.js          # 学習活動グラフロジック
│       │   ├── chart-loader.js      # Chart.js動的読み込み
│       │   ├── checks.js            # 問題チェック機能
│       │   ├── history.js           # 解答履歴表示ロジック
│       │   ├── modal.js             # モーダルダイアログ制御
│       │   ├── profile.js           # プロフィール編集
│       │   ├── radar.js             # レーダーチャート描画
│       │   └── settings.js          # アカウント設定ロジック
│       └── tools/                   # 統計ツール用スクリプト (新規, 17ファイル)
│           ├── api-client.js        # API通信
│           ├── wizard.js            # ウィザードナビゲーション
│           ├── input-cards.js       # 動的入力フォーム
│           ├── graph.js             # 分布グラフ描画
│           ├── simulate.js          # 検定シミュレーターメイン
│           ├── cc-main.js           # 管理図メインオーケストレーター
│           ├── cc-beginner.js       # 管理図初心者モード
│           ├── cc-expert.js         # 管理図熟練者モード
│           ├── cc-chart.js          # 管理図Canvas描画
│           ├── cc-data-gen.js       # 管理図データ生成
│           ├── cc-nelson.js         # ネルソンルール判定エンジン
│           ├── dm-main.js           # 分布マップメインオーケストレーター
│           ├── dm-map.js            # 分布関係マップ描画
│           ├── dm-pdf.js            # 20分布のPDF/PMF関数
│           ├── dm-canvas.js         # Canvas描画ユーティリティ
│           ├── dm-detail.js         # 分布詳細パネル
│           └── dm-anim.js           # 分布変換アニメーション
│
├── scripts/                         # 開発支援スクリプト (新規)
│   ├── css-variable-converter.py    # CSS16進数→CSS変数変換
│   ├── css-dark-mode-converter.py   # ダークモードCSS生成
│   ├── verify-dark-mode.js          # ダークモード検証
│   └── ec2-setup.sh                 # AWS EC2セットアップ
│
├── docs/                            # ドキュメント
│   ├── db_schema.md                 # データベーススキーマ定義
│   ├── architecture.md              # アーキテクチャ設計書
│   ├── functional-design.md         # 機能設計書
│   ├── repository-structure.md      # リポジトリ構成 (本ファイル)
│   ├── dark-mode-implementation.md  # ダークモード実装ガイド
│   ├── security-todo.md             # セキュリティTODO
│   └── aws-deploy-simple.md         # AWS簡易デプロイガイド
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

### `lib/database/sql/` - SQLクエリファイル (30ファイル)

SQLクエリを `.sql` ファイルとして外部管理し、`client.js` 経由で読み込む。

#### DELETE系 (5ファイル)
| ファイル | 役割 |
|---|---|
| `DELETE_expired_quiz_sessions.sql` | 期限切れのクイズセッションを削除 (定期クリーンアップ用) |
| `DELETE_quiz_session_BY_user_id.sql` | 特定ユーザーのクイズセッションを削除 |
| `DELETE_user_BY_user_id.sql` | user_idに該当するユーザーを削除 |
| `DELETE_user_question_check.sql` | ユーザーの問題チェックを削除 |
| `DELETE_user_responses_BY_user.sql` | user_idに該当するユーザーの解答記録を削除 |

#### INSERT系 (3ファイル)
| ファイル | 役割 |
|---|---|
| `INSERT_IGNORE_user_question_check.sql` | 問題チェックを重複無視で挿入 |
| `INSERT_OR_UPDATE_quiz_session.sql` | クイズセッションの挿入または更新 |
| `INSERT_user_response.sql` | ユーザーの解答結果を記録 |

#### SELECT系 (18ファイル)
| ファイル | 役割 |
|---|---|
| `SELECT_achievement_categories_BY_testlevel.sql` | 級別・カテゴリ別の達成度(解答数・正解数・期間別集計)を取得 |
| `SELECT_achievement_coverage_BY_testlevel.sql` | 級別の問題カバー率(解答済み問題数/総問題数)を取得 |
| `SELECT_activity_daily_BY_testlevel.sql` | 日別の学習活動(解答数・正解数)を取得 |
| `SELECT_activity_monthly_BY_testlevel.sql` | 月別の学習活動(解答数・正解数)を取得 |
| `SELECT_activity_weekly_BY_testlevel.sql` | 週別の学習活動(解答数・正解数)を取得 |
| `SELECT_activity_yearly_BY_testlevel.sql` | 年別の学習活動(解答数・正解数)を取得 |
| `SELECT_announcements_latest.sql` | 最新のお知らせを取得 |
| `SELECT_category_tree.sql` | 大分類・小分類をJOINしてカテゴリツリーを取得 |
| `SELECT_correct_answer_BY_blank_id.sql` | 空欄IDから正解の選択肢を取得 |
| `SELECT_question_BY_conditions.sql` | 級・カテゴリ等の条件で問題一覧を取得 |
| `SELECT_question_detail_BY_ID.sql` | 問題IDから問題の詳細情報を取得 |
| `SELECT_question_detail_WITH_BLANKS.sql` | 問題の詳細と空欄・選択肢を含めて取得 |
| `SELECT_quiz_session_BY_user_id.sql` | ユーザーのクイズセッション情報を取得 |
| `SELECT_total_learned_count_BY_user.sql` | ユーザーが解答済みの問題数(重複除外)を取得 |
| `SELECT_user_history_BY_testlevel.sql` | 級別のユーザー解答履歴をROW_NUMBERでランク付けして取得 |
| `SELECT_user_question_check_ids_BY_color.sql` | 色別の問題チェックIDリストを取得 |
| `SELECT_user_question_checks_BY_color.sql` | 色別の問題チェック情報を取得 |
| `SELECT_user_question_checks_BY_question.sql` | 問題IDに対するユーザーチェック状態を取得 |

#### UPDATE系 (4ファイル)
| ファイル | 役割 |
|---|---|
| `UPDATE_scheduled_exam_date_BY_user_id.sql` | ユーザーの予定試験日を更新 |
| `UPDATE_user_name_BY_user_id.sql` | ユーザー名を更新 |
| `UPDATE_want_grade1_BY_user_id.sql` | 第一志望級を更新 |
| `UPDATE_want_grade2_BY_user_id.sql` | 第二志望級を更新 |

### `lib/statistics/` - 統計計算エンジン (新規)

| ファイル | 役割 |
|---|---|
| `index.js` | 統計ライブラリの公開API。`runTest`, `validateInputs`, `getCriticalValue` 等をエクスポート |
| `distributions.js` | 確率分布の数学関数群。PDF/CDF (正規分布, t分布, χ²分布, F分布, 二項分布, ポアソン分布)、ガンマ関数、ベータ関数など。Lanczos近似による高精度計算 |
| `critical-values.js` | 臨界値取得エンジン。JSONテーブル検索→線形補間→計算フォールバックの3段階戦略 |
| `tests.js` | 12種類の仮説検定実装 (t検定4種, 比率検定2種, χ²検定2種, F検定, ANOVA, 二項検定, ポアソン検定)。各検定の統計量・p値・効果量・判定結果を計算 |

### `data/` - 統計データ (新規)

| ファイル | 役割 |
|---|---|
| `critical_values_z.json` | 標準正規分布の臨界値テーブル (α=0.10, 0.05, 0.025, 0.01, 0.005) |
| `critical_values_t.json` | t分布の臨界値テーブル (自由度1～120+) |
| `critical_values_chi2.json` | χ²分布の臨界値テーブル |
| `critical_values_f.json` | F分布の臨界値テーブル (df1×df2の組み合わせ) |
| `contents_templates.json` | 12種類の検定の説明・仮説テンプレート・UIテキスト |
| `presets.json` | 8つのプリセット検定シナリオ (初期値として利用) |

### `routes/` - ルートハンドラ

Express のルーティングを機能別に分割したモジュール群。

| ファイル | エンドポイント | 役割 |
|---|---|---|
| `index.js` | `GET /`, `GET /qcis`, `GET /statisinfo` | トップページ(ランダム問題表示)、QC検定情報、統計情報ページ |
| `pages.js` | `GET /kiyaku`, `GET /privacy-policy`, `GET /sitemap` | 利用規約・プライバシーポリシー・サイトマップ等の静的ページ |
| `auth.js` | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/status` | 認証関連。Passport.jsによるログイン、bcryptによるパスワードハッシュ登録、ログアウト、認証状態確認 |
| `account.js` | `GET /account/history/:testlevel`, `GET /account/stats/total-learned`, `DELETE /account/delete`, 他 | アカウント管理。解答履歴取得、学習統計、アカウント削除、達成度、学習活動、問題閲覧 |
| `question_select.js` | `GET /questions/select` | カテゴリツリーを取得して問題選択画面を表示 |
| `question_start.js` | `POST /questions/start` | 選択された級・カテゴリで問題IDリストを取得しセッションに格納、最初の問題へリダイレクト |
| `ques.js` | `GET /questions/completion-stats`, `POST /questions/complete`, `GET /questions/:question_id` | 問題IDに対応する問題詳細(空欄・選択肢・画像)を取得し表示。完了統計の取得、テスト完了処理。単問モード/連続モード対応 |
| `question_answer.js` | `POST /questions/answer` | 解答を受け取り正誤判定。認証ユーザーの場合は `user_responses` に記録。JSONで結果返却 |
| `tools.js` | `GET /tools/simulate`, `POST /tools/api/simulate`, 他 | 統計ツールAPI。検定シミュレーション実行、バリデーション、臨界値取得、テンプレート取得。Rate limiter適用 (60req/分) |

### `views/` - EJSテンプレート

サーバーサイドレンダリング用のEJSテンプレート群。

| ファイル/ディレクトリ | 役割 |
|---|---|
| `index.ejs` | トップページ。ランダム問題のプレビュー表示 |
| `qcis.ejs` | QC検定の概要情報ページ |
| `statisinfo.ejs` | 学習統計・達成度の表示ページ |
| `kiyaku.ejs` | 利用規約ページ |
| `privacy-policy.ejs` | プライバシーポリシーページ |
| `sitemap.ejs` | サイトマップページ |
| `questions/question.ejs` | 問題表示テンプレート。空欄の穴埋め選択肢をレンダリング |
| `questions/select_question.ejs` | 級・カテゴリ選択のUI |
| `tools/simulate.ejs` | 統計シミュレーション統合ビュー (タブ1: 検定シミュレーション, タブ2: 管理図シミュレーター, タブ3: 分布ファミリーマップ) |
| `_share/navbar.ejs` | 共通ヘッダー。ユーザーメニュー(ログイン/アカウント/ログアウト)、ダークモードトグルを含む |
| `_share/footer.ejs` | 共通フッター |
| `_share/account_modal.ejs` | アカウント管理用モーダルダイアログ |
| `_share/auth_modal.ejs` | 認証モーダル |
| `_share/metadata.ejs` | 共通HTMLメタタグ |
| `_share/javascripts.ejs` | 共通JavaScriptインポート(KaTeX等) |
| `_share/result_display.ejs` | 解答結果(正解/不正解)表示コンポーネント |
| `_share/account/menu.ejs` | アカウントモーダル内のメニュー(タブ切り替え) |
| `_share/account/category_confirm.ejs` | カテゴリ選択の確認ダイアログ |
| `_share/account/section_achievement.ejs` | 達成度表示セクション |
| `_share/account/section_activity.ejs` | 学習活動グラフセクション |
| `_share/account/section_checks.ejs` | 問題チェック管理セクション |
| `_share/account/section_history.ejs` | 解答履歴一覧セクション |
| `_share/account/section_profile.ejs` | プロフィール表示セクション |
| `_share/account/section_radar.ejs` | レーダーチャート表示セクション |
| `_share/account/section_settings.ejs` | アカウント設定セクション |

### `public/` - 静的アセット

Express の `express.static` ミドルウェアで配信される静的ファイル群。

| ファイル/ディレクトリ | 役割 |
|---|---|
| `index.css` | メインスタイルシート (~11,000行)。CSS変数システムによるライト/ダークモード対応。95種類のCSS変数で664箇所の色を管理 |
| `gradeData.js` | 各級の情報を定義するクライアントサイドスクリプト |
| `copy-protection.js` | コンテンツのコピー防止用スクリプト |
| `favicon.ico` | ブラウザタブに表示されるアイコン |
| `*.png / *.jpg` | ペンギンマスコット画像、QC関連イメージ等 |
| `js/account/achievement.js` | 達成度データの取得・表示ロジック |
| `js/account/activity.js` | 学習活動データの取得・グラフ表示ロジック |
| `js/account/chart-loader.js` | Chart.jsの動的読み込みユーティリティ |
| `js/account/checks.js` | 問題チェック機能 (黄・緑・赤のフラグ管理) |
| `js/account/history.js` | 解答履歴データの取得・テーブル表示ロジック |
| `js/account/modal.js` | アカウントモーダルの開閉・タブ切り替え制御 |
| `js/account/profile.js` | プロフィール編集 (ユーザー名、志望級、試験日) |
| `js/account/radar.js` | カテゴリ別正解率のレーダーチャート描画 |
| `js/account/settings.js` | アカウント設定(削除等)のロジック |
| `js/tools/api-client.js` | API通信層。CSRF トークン処理、エンドポイント抽象化 |
| `js/tools/wizard.js` | 3段階のウィザードナビゲーション (データ種→群数→検定種) |
| `js/tools/input-cards.js` | 検定別パラメータ入力UI。動的フォーム生成、LocalStorage永続化 |
| `js/tools/graph.js` | Canvas分布グラフ描画 (DPR対応、臨界域・検定統計量の可視化) |
| `js/tools/simulate.js` | 検定シミュレーターメインオーケストレーター |
| `js/tools/cc-main.js` | 管理図メインオーケストレーター (タブ切替、モード切替) |
| `js/tools/cc-beginner.js` | 管理図初心者モード (クイズ形式、ヒントシステム) |
| `js/tools/cc-expert.js` | 管理図熟練者モード (リアルタイムデータ、ハイスコア) |
| `js/tools/cc-chart.js` | 管理図Canvas描画エンジン (Xbar-R管理図) |
| `js/tools/cc-data-gen.js` | 管理図データ生成 (Box-Muller正規分布、異常注入) |
| `js/tools/cc-nelson.js` | ネルソンルール判定エンジン (規則1～8) |
| `js/tools/dm-main.js` | 分布マップメインオーケストレーター |
| `js/tools/dm-map.js` | 20分布のネットワークグラフ描画 (25本の関係矢印) |
| `js/tools/dm-pdf.js` | 20分布のPDF/PMF関数群 (離散7種+連続13種) |
| `js/tools/dm-canvas.js` | Canvas描画ユーティリティ (DPR対応、軸・グリッド) |
| `js/tools/dm-detail.js` | 分布詳細パネル (パラメータスライダー、統計量表示) |
| `js/tools/dm-anim.js` | 分布変換アニメーション (14種のモーフィング、中心極限定理デモ) |

### `scripts/` - 開発支援スクリプト (新規)

| ファイル | 役割 |
|---|---|
| `css-variable-converter.py` | CSS内の16進数カラー値をCSS変数に自動変換するPython3スクリプト |
| `css-dark-mode-converter.py` | ライトモード/ダークモードCSS自動生成・検証スクリプト (Python3) |
| `verify-dark-mode.js` | ダークモード実装検証スクリプト (Node.js) |
| `ec2-setup.sh` | AWS EC2初期セットアップ用Bashスクリプト |

### `docs/` - ドキュメント

プロジェクトのドキュメントを格納するディレクトリ。

| ファイル | 役割 |
|---|---|
| `db_schema.md` | データベーススキーマの定義書(テーブル構造・リレーション) |
| `architecture.md` | アーキテクチャ設計書 |
| `functional-design.md` | 機能設計書 |
| `repository-structure.md` | リポジトリ構成(本ファイル) |
| `dark-mode-implementation.md` | ダークモード実装ガイド |
| `security-todo.md` | セキュリティTODO |
| `aws-deploy-simple.md` | AWS簡易デプロイガイド |

### ルートディレクトリのファイル

| ファイル | 役割 |
|---|---|
| `app.js` | エントリーポイント。Express初期化、ミドルウェア設定(body-parser, cookie-parser, session, CSRF保護)、Passport初期化、MySQLセッションストア設定、ルート登録、サーバー起動、定期クリーンアップジョブ |
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
| グラフ描画 | Chart.js (動的読み込み)、Canvas API直接描画 |
| フロントエンド | Vanilla JavaScript (フレームワークなし、IIFEモジュールパターン) |
| CSSアーキテクチャ | CSS変数システム (95変数、ライト/ダークモード対応) |
| CSSリセット | RESS |
| Lint | ESLint |
| セキュリティ | CSRF保護、Rate limiting |

## コード規模

| カテゴリ | ファイル数 | 主な行数 |
|---|---|---|
| SQLクエリ | 30 | - |
| 統計エンジン | 4 | ~1,500行 |
| ルートハンドラ | 9 | - |
| EJSテンプレート | 30+ | - |
| クライアントJS (ツール) | 17 | ~6,500行 |
| クライアントJS (アカウント) | 9 | ~3,000行 |
| CSS | 1 | ~11,000行 |
| 開発スクリプト | 4 | ~500行 |

## プロジェクトの構成哲学

1. **機能別分割**: ルートハンドラは機能単位で個別ファイルに分割
2. **SQL外部管理**: SQLクエリは `.sql` ファイルとしてコードから分離し、保守性を確保
3. **共通部品化**: ビューの共通要素 (navbar, footer等) は `_share/` に集約してインクルード
4. **設定集約**: アプリケーション設定・DB設定・認証設定を `config/` に集約
5. **ドキュメント整備**: `docs/` にスキーマ定義・アーキテクチャ・機能設計・要件定義を配置
6. **クライアントサイド完結**: ツール機能（タブ2・3）はサーバAPI不使用、全てブラウザで完結
7. **IIFEモジュールパターン**: フレームワーク不使用、グローバル汚染を最小化
8. **CSS変数システム**: 95変数で664箇所を管理、ライト/ダークモードを一元管理
9. **高精度統計計算**: Lanczos近似、Lentz連分数など数値解析アルゴリズム採用
10. **DPR対応Canvas**: Retina対応の高解像度グラフ描画
