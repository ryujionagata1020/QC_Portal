# QC_Portal リポジトリ構成

## ディレクトリツリー

```
QC_Portal/
├── config/                          # 設定ファイル
│   ├── application.config.js        # アプリケーション設定 (PORT, SESSION_SECRET)
│   ├── mailer.config.js             # Nodemailerトランスポーター設定
│   ├── mysql.config.js              # MySQL接続設定
│   └── passport.config.js           # Passport認証ストラテジー設定
│
├── lib/                             # ライブラリ / ユーティリティ
│   ├── database/
│   │   ├── client.js                # MySQLクライアントラッパー (SQLファイルローダー付き)
│   │   ├── pool.js                  # MySQLコネクションプール管理
│   │   └── sql/                     # SQLクエリファイル群
│   │       ├── DELETE_expired_quiz_sessions.sql
│   │       ├── DELETE_quiz_session_BY_user_id.sql
│   │       ├── DELETE_user_BY_user_id.sql
│   │       ├── DELETE_user_question_check.sql
│   │       ├── DELETE_user_responses_BY_user.sql
│   │       ├── INSERT_contact_inquiry.sql
│   │       ├── INSERT_IGNORE_user_question_check.sql
│   │       ├── INSERT_OR_UPDATE_quiz_session.sql
│   │       ├── INSERT_user_response.sql
│   │       ├── SELECT_achievement_categories_BY_testlevel.sql
│   │       ├── SELECT_achievement_coverage_BY_testlevel.sql
│   │       ├── SELECT_activity_daily_BY_testlevel.sql
│   │       ├── SELECT_activity_monthly_BY_testlevel.sql
│   │       ├── SELECT_activity_weekly_BY_testlevel.sql
│   │       ├── SELECT_activity_yearly_BY_testlevel.sql
│   │       ├── SELECT_all_blanks_BY_testlevel.sql
│   │       ├── SELECT_announcements_latest.sql
│   │       ├── SELECT_category_tree.sql
│   │       ├── SELECT_correct_answer_BY_blank_id.sql
│   │       ├── SELECT_question_BY_conditions.sql
│   │       ├── SELECT_question_detail_BY_ID.sql
│   │       ├── SELECT_question_detail_WITH_BLANKS.sql
│   │       ├── SELECT_question_ids_BY_testlevel_scope.sql
│   │       ├── SELECT_question_ids_BY_testlevel_scope_category.sql
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
│   ├── mail/
│   │   ├── contact_admin.js         # 管理者向けお問い合わせ通知メール構築
│   │   └── contact_user.js          # ユーザー向けお問い合わせ受付確認メール構築
│   └── statistics/
│       ├── index.js                 # 統計ライブラリ公開API
│       ├── distributions.js         # 確率分布計算 (t, z, χ², F)
│       ├── tests.js                 # 仮説検定ロジック・入力バリデーション
│       └── critical-values.js       # 臨界値テーブル・テーブルサブセット取得
│
├── routes/                          # Expressルートハンドラ
│   ├── index.js                     # トップページ / QC検定情報 / 統計情報
│   ├── pages.js                     # 静的ページ (利用規約, プライバシーポリシー, サイトマップ, 使い方)
│   ├── auth.js                      # 認証 (ログイン, 登録, ログアウト)
│   ├── account.js                   # アカウント管理API (履歴, 統計, 達成度, 活動, プロフィール, チェック, 削除)
│   ├── contact.js                   # お問い合わせ (入力, 確認, 完了)
│   ├── ques.js                      # 問題表示・セッション管理・チェック機能
│   ├── question_select.js           # 問題選択画面
│   ├── question_start.js            # テスト開始 (セッションに問題IDを格納)
│   ├── question_start_omakase.js    # おまかせ出題 (級別プリセットモードで出題開始)
│   └── question_answer.js           # 解答送信・正誤判定
│
├── views/                           # EJSテンプレート
│   ├── index.ejs                    # トップページ (ランダム問題 + お知らせ)
│   ├── qcis.ejs                     # QC検定情報ページ
│   ├── qctext.ejs                   # QC検定テキスト紹介ページ
│   ├── statisinfo.ejs               # 統計情報ページ
│   ├── kiyaku.ejs                   # 利用規約
│   ├── privacy-policy.ejs           # プライバシーポリシー
│   ├── sitemap.ejs                  # サイトマップ
│   ├── Manual.ejs                   # 使い方ガイド
│   ├── contact/
│   │   ├── index.ejs                # お問い合わせ入力フォーム
│   │   ├── confirm.ejs              # お問い合わせ内容確認
│   │   └── complete.ejs             # お問い合わせ送信完了
│   ├── questions/
│   │   ├── question.ejs             # 問題表示テンプレート
│   │   └── select_question.ejs      # 問題選択UI
│   ├── tools/
│   │   └── simulate.ejs             # ツールページ (仮説検定シミュレーター等)
│   └── _share/                      # 共通テンプレート部品
│       ├── navbar.ejs               # ヘッダーナビゲーション
│       ├── footer.ejs               # フッター
│       ├── account_modal.ejs        # アカウント管理モーダル
│       ├── auth_modal.ejs           # ログイン/新規登録モーダル
│       ├── metadata.ejs             # HTMLメタデータ
│       ├── javascripts.ejs          # 共通スクリプト読み込み
│       ├── result_display.ejs       # 解答結果表示コンポーネント
│       └── account/                 # アカウント管理セクション部品
│           ├── menu.ejs             # アカウントメニュー
│           ├── category_confirm.ejs # カテゴリ確認ダイアログ
│           ├── section_achievement.ejs  # 達成度セクション
│           ├── section_activity.ejs     # 学習活動セクション
│           ├── section_checks.ejs       # チェック問題セクション
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
│       ├── auth.js                  # 認証フロントエンドロジック (ログイン/登録モーダル)
│       ├── account/                 # アカウント管理用スクリプト
│       │   ├── achievement.js       # 達成度表示ロジック
│       │   ├── activity.js          # 学習活動グラフロジック
│       │   ├── chart-loader.js      # Chart.js動的読み込み
│       │   ├── checks.js            # チェック問題管理ロジック
│       │   ├── history.js           # 解答履歴表示ロジック
│       │   ├── modal.js             # モーダルダイアログ制御
│       │   ├── profile.js           # プロフィール編集ロジック
│       │   ├── radar.js             # レーダーチャート描画
│       │   └── settings.js          # アカウント設定ロジック
│       └── tools/                   # ツールページ用スクリプト
│           ├── api-client.js        # ツールAPI通信クライアント
│           ├── wizard.js            # 入力ウィザード制御
│           ├── input-cards.js       # 入力カードUI
│           ├── graph.js             # グラフ描画 (Canvas)
│           ├── simulate.js          # 仮説検定シミュレーターメイン
│           ├── cc-data-gen.js       # 管制図データ生成
│           ├── cc-nelson.js         # ネルソンルール判定
│           ├── cc-chart.js          # 管制図Canvas描画
│           ├── cc-beginner.js       # 管制図ビギナーモード
│           ├── cc-expert.js         # 管制図エキスパートモード
│           ├── cc-main.js           # 管制図シミュレーターメイン
│           ├── dm-pdf.js            # 分布族マップPDF計算
│           ├── dm-canvas.js         # 分布族マップCanvas描画
│           ├── dm-map.js            # 分布族マップレイアウト
│           ├── dm-detail.js         # 分布族詳細パネル
│           ├── dm-anim.js           # 分布族マップアニメーション
│           └── dm-main.js           # 分布族マップメイン
│
├── scripts/                         # ユーティリティスクリプト
│   ├── check-env.js                 # 必須環境変数チェック (起動時実行)
│   └── verify-dark-mode.js          # ダークモード設定検証スクリプト
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
| `mailer.config.js` | Nodemailerのトランスポーター設定 (SMTPサーバー情報等) |
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
| `DELETE_expired_quiz_sessions.sql` | 期限切れのquiz_sessionsレコードを削除 (定期バッチ用) |
| `DELETE_quiz_session_BY_user_id.sql` | user_idに該当するquiz_sessionsレコードを削除 |
| `DELETE_user_BY_user_id.sql` | user_idに該当するユーザーを削除 |
| `DELETE_user_question_check.sql` | ユーザーの問題チェック(色付け)を削除 |
| `DELETE_user_responses_BY_user.sql` | user_idに該当するユーザーの解答記録を削除 |
| `INSERT_contact_inquiry.sql` | お問い合わせ内容をDBに保存 |
| `INSERT_IGNORE_user_question_check.sql` | 問題へのチェック(色付け)を登録 (重複無視) |
| `INSERT_OR_UPDATE_quiz_session.sql` | 出題セッションをDBに保存またはUPSERT |
| `INSERT_user_response.sql` | ユーザーの解答結果を記録 |
| `SELECT_achievement_categories_BY_testlevel.sql` | 級別・カテゴリ別の達成度(解答数・正解数・期間別集計)を取得 |
| `SELECT_achievement_coverage_BY_testlevel.sql` | 級別の問題カバー率(解答済み問題数/総問題数)を取得 |
| `SELECT_activity_daily_BY_testlevel.sql` | 日別の学習活動(解答数・正解数)を取得 |
| `SELECT_activity_monthly_BY_testlevel.sql` | 月別の学習活動(解答数・正解数)を取得 |
| `SELECT_activity_weekly_BY_testlevel.sql` | 週別の学習活動(解答数・正解数)を取得 |
| `SELECT_activity_yearly_BY_testlevel.sql` | 年別の学習活動(解答数・正解数)を取得 |
| `SELECT_all_blanks_BY_testlevel.sql` | 級別の全空欄一覧をカテゴリ順で取得 (未解答含む) |
| `SELECT_announcements_latest.sql` | 最新のお知らせを取得 |
| `SELECT_category_tree.sql` | 大分類・小分類をJOINしてカテゴリツリーを取得 |
| `SELECT_correct_answer_BY_blank_id.sql` | 空欄IDから正解の選択肢を取得 |
| `SELECT_question_BY_conditions.sql` | 級・カテゴリ等の条件で問題一覧を取得 |
| `SELECT_question_detail_BY_ID.sql` | 問題IDから問題の詳細情報を取得 |
| `SELECT_question_detail_WITH_BLANKS.sql` | 問題の詳細と空欄・選択肢を含めて取得 |
| `SELECT_question_ids_BY_testlevel_scope.sql` | 級・スコープ(scope_exam)で問題IDリストを取得 (おまかせ用) |
| `SELECT_question_ids_BY_testlevel_scope_category.sql` | 級・スコープ・カテゴリ名で問題IDリストを取得 (おまかせ用) |
| `SELECT_quiz_session_BY_user_id.sql` | user_idに紐づく保存済み出題セッションを取得 |
| `SELECT_total_learned_count_BY_user.sql` | ユーザーが解答済みの問題数(重複除外)を取得 |
| `SELECT_user_history_BY_testlevel.sql` | 級別のユーザー解答履歴をROW_NUMBERでランク付けして取得 |
| `SELECT_user_question_check_ids_BY_color.sql` | 色別にチェックされた問題IDリストを取得 |
| `SELECT_user_question_checks_BY_color.sql` | 色別にチェックされた問題の詳細情報を取得 |
| `SELECT_user_question_checks_BY_question.sql` | 問題IDに紐づくユーザーのチェック色一覧を取得 |
| `UPDATE_scheduled_exam_date_BY_user_id.sql` | ユーザーの受験予定日を更新 |
| `UPDATE_user_name_BY_user_id.sql` | ユーザー名を更新 |
| `UPDATE_want_grade1_BY_user_id.sql` | 目標級(第1希望)を更新 |
| `UPDATE_want_grade2_BY_user_id.sql` | 目標級(第2希望)を更新 |

### `lib/mail/` - メール送信ライブラリ

お問い合わせ機能で使用するメール本文の構築モジュール。

| ファイル | 役割 |
|---|---|
| `contact_admin.js` | 管理者向けお問い合わせ通知メールの件名・本文を構築する |
| `contact_user.js` | ユーザー向けお問い合わせ受付確認メールの件名・本文を構築する |

### `lib/statistics/` - 統計計算ライブラリ

ツールページの仮説検定シミュレーターで使用するサーバーサイド統計計算モジュール。

| ファイル | 役割 |
|---|---|
| `index.js` | 統計ライブラリの公開API (`runTest`, `validateInputs`, `getCalculationSteps`, `getCriticalValue`, `getTableSubset`) |
| `distributions.js` | t分布・正規分布・χ²分布・F分布の確率密度関数・累積分布関数の計算 |
| `tests.js` | 仮説検定のロジック (t検定, z検定, χ²検定, F検定)・入力バリデーション・計算ステップ生成 |
| `critical-values.js` | 各分布の臨界値テーブル参照・テーブルサブセット取得 |

### `routes/` - ルートハンドラ

Express のルーティングを機能別に分割したモジュール群。

| ファイル | エンドポイント | 役割 |
|---|---|---|
| `index.js` | `GET /`, `GET /qcis`, `GET /statisinfo` | トップページ(ランダム問題+お知らせ)、QC検定情報、統計情報ページ |
| `pages.js` | `GET /kiyaku`, `GET /privacy-policy`, `GET /sitemap`, `GET /manual` | 利用規約・プライバシーポリシー・サイトマップ・使い方ガイドの静的ページ |
| `auth.js` | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/status` | 認証関連。Passport.jsによるログイン(セッション固定攻撃対策付き)、bcryptによるパスワードハッシュ登録、ログアウト(出題セッションDB保存)、認証状態確認 |
| `account.js` | `GET /account/history/:testlevel`, `GET /account/stats/total-learned`, `PUT /account/profile`, `GET /account/checks/:color`, `DELETE /account/delete`, `GET /account/achievement/:testlevel`, `GET /account/activity/:testlevel`, `GET /account/view/:question_id` | アカウント管理。解答履歴(未回答blank含む全件)、学習統計、プロフィール更新、チェック問題取得、アカウント削除、達成度、学習活動、問題閲覧 |
| `contact.js` | `GET /contact`, `POST /contact`, `GET /contact/confirm`, `POST /contact/confirm`, `GET /contact/complete` | お問い合わせ。入力→確認→完了の3ステップ。レート制限・ハニーポット・サニタイズ処理付き。DBへの保存とメール送信 |
| `question_select.js` | `GET /questions/select` | カテゴリツリーを取得して問題選択画面を表示。セッションまたはDBから中断再開データも取得 |
| `question_start.js` | `POST /questions/start` | 選択された級・カテゴリで問題IDリストを取得しセッションに格納。未回答のみフィルタ・問題数制限・Fisher-Yatesシャッフル対応 |
| `question_start_omakase.js` | `POST /questions/start-omakase` | おまかせ出題。プリセットモード(4級全般・実践編・手法編等)で問題IDを取得しシャッフル |
| `ques.js` | `GET /questions/completion-stats`, `POST /questions/complete`, `GET /questions/resume`, `POST /questions/start-from-checks`, `POST /questions/:question_id/check`, `DELETE /questions/:question_id/check`, `GET /questions/:question_id` | 問題表示・出題セッション管理・チェック機能。完了統計取得、セッションクリア、DB復元、チェックからの復習開始 |
| `question_answer.js` | `POST /questions/answer` | 解答を受け取り正誤判定。認証ユーザーの場合は `user_responses` に記録。JSONで結果返却 |

### `views/` - EJSテンプレート

サーバーサイドレンダリング用のEJSテンプレート群。

| ファイル/ディレクトリ | 役割 |
|---|---|
| `index.ejs` | トップページ。ランダム問題のプレビューとお知らせを表示 |
| `qcis.ejs` | QC検定の概要情報ページ |
| `qctext.ejs` | QC検定テキスト紹介ページ |
| `statisinfo.ejs` | 学習統計・達成度の表示ページ |
| `kiyaku.ejs` | 利用規約ページ |
| `privacy-policy.ejs` | プライバシーポリシーページ |
| `sitemap.ejs` | サイトマップページ |
| `Manual.ejs` | 使い方ガイドページ |
| `contact/index.ejs` | お問い合わせ入力フォーム |
| `contact/confirm.ejs` | お問い合わせ内容確認ページ |
| `contact/complete.ejs` | お問い合わせ送信完了ページ |
| `questions/question.ejs` | 問題表示テンプレート。空欄の穴埋め選択肢・チェック機能をレンダリング |
| `questions/select_question.ejs` | 級・カテゴリ選択のUI。おまかせ出題・中断再開ボタンを含む |
| `tools/simulate.ejs` | ツールページ。タブ切り替えで仮説検定シミュレーター・管制図シミュレーター・分布族マップを提供 |
| `_share/navbar.ejs` | 共通ヘッダー。ユーザーメニュー(ログイン/アカウント/ログアウト)を含む |
| `_share/footer.ejs` | 共通フッター |
| `_share/account_modal.ejs` | アカウント管理用モーダルダイアログ |
| `_share/auth_modal.ejs` | ログイン/新規登録用モーダルダイアログ |
| `_share/metadata.ejs` | 共通HTMLメタタグ |
| `_share/javascripts.ejs` | 共通JavaScriptインポート(KaTeX等) |
| `_share/result_display.ejs` | 解答結果(正解/不正解)表示コンポーネント |
| `_share/account/menu.ejs` | アカウントモーダル内のメニュー(タブ切り替え) |
| `_share/account/category_confirm.ejs` | カテゴリ選択の確認ダイアログ |
| `_share/account/section_achievement.ejs` | 達成度表示セクション |
| `_share/account/section_activity.ejs` | 学習活動グラフセクション |
| `_share/account/section_checks.ejs` | チェック問題一覧・復習開始セクション |
| `_share/account/section_history.ejs` | 解答履歴一覧セクション (未解答blank含む全件) |
| `_share/account/section_profile.ejs` | プロフィール表示・編集セクション |
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
| `js/auth.js` | 認証モーダル(ログイン/新規登録)のフロントエンドロジック |
| `js/account/achievement.js` | 達成度データの取得・表示ロジック |
| `js/account/activity.js` | 学習活動データの取得・グラフ表示ロジック |
| `js/account/chart-loader.js` | Chart.jsの動的読み込みユーティリティ |
| `js/account/checks.js` | チェック問題の取得・表示・復習開始ロジック |
| `js/account/history.js` | 解答履歴データの取得・テーブル表示ロジック |
| `js/account/modal.js` | アカウントモーダルの開閉・タブ切り替え制御 |
| `js/account/profile.js` | プロフィール編集(ユーザー名・目標級・受験予定日)のロジック |
| `js/account/radar.js` | カテゴリ別正解率のレーダーチャート描画 |
| `js/account/settings.js` | アカウント設定(削除等)のロジック |
| `js/tools/api-client.js` | ツールAPI (`/tools/api/*`) との通信クライアント |
| `js/tools/wizard.js` | 仮説検定の入力ウィザード制御 |
| `js/tools/input-cards.js` | 仮説検定の入力カードUI |
| `js/tools/graph.js` | 仮説検定の確率分布グラフCanvas描画 |
| `js/tools/simulate.js` | 仮説検定シミュレーターのメインモジュール |
| `js/tools/cc-data-gen.js` | 管制図シミュレーターのデータ生成 |
| `js/tools/cc-nelson.js` | ネルソンルールによる異常判定 |
| `js/tools/cc-chart.js` | 管制図のCanvas描画 |
| `js/tools/cc-beginner.js` | 管制図ビギナーモード |
| `js/tools/cc-expert.js` | 管制図エキスパートモード |
| `js/tools/cc-main.js` | 管制図シミュレーターのメインモジュール |
| `js/tools/dm-pdf.js` | 分布族マップの確率密度関数計算 |
| `js/tools/dm-canvas.js` | 分布族マップのCanvas描画 |
| `js/tools/dm-map.js` | 分布族マップのレイアウト定義 |
| `js/tools/dm-detail.js` | 分布族詳細パネル |
| `js/tools/dm-anim.js` | 分布族マップのアニメーション |
| `js/tools/dm-main.js` | 分布族マップのメインモジュール |

### `scripts/` - ユーティリティスクリプト

| ファイル | 役割 |
|---|---|
| `check-env.js` | 起動時に必須環境変数の存在を検証する。未設定の場合はエラーを出力する |
| `verify-dark-mode.js` | ダークモード関連の設定を検証するスクリプト |

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
| `app.js` | エントリーポイント。Express初期化、Helmet(セキュリティヘッダー)、body-parser、cookie-parser、session、Passport初期化、CSRFトークン生成・検証、MySQLセッションストア設定、ルート登録、quiz_sessionsの定期クリーンアップ、サーバー起動 |
| `package.json` | プロジェクト名・バージョン・依存パッケージの定義 |
| `.env` | 環境変数(DB認証情報・メール設定等、Gitには含めない) |
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
| セキュリティヘッダー | helmet (CSP, HSTS等) |
| CSRF対策 | カスタム実装 (セッションベーストークン) |
| レート制限 | express-rate-limit |
| フラッシュメッセージ | connect-flash |
| メール送信 | Nodemailer |
| 数式レンダリング | KaTeX (CDN) |
| グラフ描画 | Chart.js (動的読み込み) + Canvas API (直接描画) |
| フロントエンド | Vanilla JavaScript (フレームワークなし) |
| CSSリセット | RESS |
| Lint | ESLint |
