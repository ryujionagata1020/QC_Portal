# QC_Portal 機能設計書

## 1. トップページ機能

- `GET /` でトップページを表示する
- データベースからランダムに1問取得し、問題のプレビューを表示する
- プレビューには問題タイトル・本文・空欄・選択肢を含む
- 問題プレビューから該当問題の詳細ページへ遷移できる
- 問題選択画面への導線を提供する
- `SELECT_announcements_latest.sql` で最新のお知らせを取得してトップページに表示する

## 2. ユーザー認証機能

### 2.1 ユーザー登録
- `POST /auth/register` でユーザー登録を行う
- ユーザーID・パスワード・メールアドレスを入力として受け付ける
- バリデーション: ユーザーIDは4〜50文字、パスワードは8文字以上
- パスワードはbcryptでハッシュ化して`users`テーブルに保存する
- レート制限: 同一IPから5回/時

### 2.2 ログイン
- `POST /auth/login` でログイン処理を行う
- Passport.js (LocalStrategy) を使用して認証する
- ユーザーIDとパスワードで照合し、bcryptでハッシュ比較を行う
- ログイン成功後、`req.session.regenerate()` でセッションIDを再生成する (セッション固定攻撃対策)
- ログイン時にDBの `quiz_sessions` テーブルから保存済みの出題セッションを復元する
- 「ログイン状態を保持する」をチェックした場合、セッションCookieのmaxAgeを30日に設定する
- レート制限: 同一IPから5回/分

### 2.3 ログアウト
- `POST /auth/logout` でログアウト処理を行う
- 出題中の場合、`quiz_sessions` テーブルに出題セッション (`questionIds`, `currentIndex`, `sessionStartedAt`) を保存する
- セッションを破棄してログアウトする

### 2.4 認証状態確認
- `GET /auth/status` で現在の認証状態をJSON形式で返却する
- フロントエンドからの非同期リクエストで認証状態を確認する用途

## 3. 問題選択機能

### 3.1 問題選択画面の表示
- `GET /questions/select` で問題選択画面を表示する
- `SELECT_category_tree.sql` を使用してカテゴリツリー(大分類・小分類)を取得する
- カテゴリは「実践編 (Practical Application)」と「手法編 (Methods and Techniques)」の2タイプに分類して表示する
- ユーザーは以下の条件で問題を絞り込める
  - 級 (testlevel)
  - 大分類 (quiz_large_category)
  - 小分類 (quiz_small_category)
- 中断再開データの取得
  - セッションに出題データがある場合はそちらを優先して `resumeData` に格納する
  - セッションになくログイン中の場合はDBの `quiz_sessions` を確認する
  - `resumeData` が存在する場合、「中断したところから再開（N/M問目から）」ボタンを表示する

### 3.2 テスト開始
- `POST /questions/start` で選択された条件に基づきテストを開始する
- 動的なSQLで条件に合致する問題IDリストを取得する (testlevels, smalls の複数選択対応)
- `unanswered_only=1` かつ認証済みの場合、解答済み問題をフィルタリングする
- Fisher-Yatesシャッフルでランダム化する
- 問題数制限: `question_limit` パラメータで指定 (101=全問)
- 新セッション開始前にDBの古いquiz_sessionを削除する
- 取得した問題IDリストをセッションに格納し、最初の問題ページへリダイレクトする

### 3.3 おまかせ出題
- `POST /questions/start-omakase` でプリセットモードによるおまかせ出題を開始する
- 利用可能なモード:
  - `grade4_30`: 4級おまかせ10問
  - `grade4_practical_30`: 4級実践編10問
  - `grade4_methods_30`: 4級手法編10問
  - `grade4_all`: 4級対応全問
- `SELECT_question_ids_BY_testlevel_scope.sql` (カテゴリ指定なし) または `SELECT_question_ids_BY_testlevel_scope_category.sql` (カテゴリ指定あり) で問題IDを取得する
- Fisher-Yatesシャッフル後、limitで件数制限してセッションに格納する

## 4. 問題出題・表示機能

### 4.1 問題詳細の表示
- `GET /questions/:question_id` で個別の問題を表示する
- インラインSQLで問題の詳細情報を取得する
  - 問題本文・画像データ・カテゴリ情報
  - 空欄情報 (quiz_blanks) とblanks単位での選択肢グループ化
  - 空欄ごとの解説・解説画像
- 画像データ(longblob)はマジックバイトでMIMEタイプ (JPEG/PNG/GIF) を判定し、Base64に変換して表示する
- 数式はKaTeXでレンダリングする
- 認証済みユーザーの場合、問題のチェック状態 (色) を `SELECT_user_question_checks_BY_question.sql` で取得して渡す
- レート制限: 200回/分

### 4.2 出題モード
- **単問モード**: セッションに問題IDリストがない場合。個別の問題IDを指定して1問だけ表示する
- **連続モード**: セッションに格納された問題IDリストに基づき連続して出題する
  - 現在の問題番号と総問題数を表示する
  - 次の問題への遷移を制御する
  - 問題表示のたびに `req.session.currentIndex` を更新する (再開機能用)

### 4.3 中断再開機能
- ログインユーザーが連続出題モードで途中離脱した場合、中断地点から再開できる
- **セッション内再開**: ブラウザセッションが継続中であれば問題選択画面で再開ボタンが表示される
- **DB経由での再開**: ログアウト後に再ログインした場合でも、DBに保存されたセッションから復元して再開できる
- `GET /questions/resume` でDBからセッションを復元し、中断した問題へリダイレクトする
- 全問完了時の処理
  - `GET /questions/completion-stats` でカテゴリ別のbefore/after正解率を取得して完了画面に表示する
  - 終了オーバーレイの「閉じる」ボタンを押すと `POST /questions/complete` を呼び出す
  - `POST /questions/complete` はセッションオブジェクトとDB両方から出題データを削除する
  - これにより全問完了後は再開ボタンが表示されない
- 新たに「出題開始」を押した場合、既存の出題セッションは上書きされる

## 5. 解答・正誤判定機能

- `POST /questions/answer` で解答を送信する
- 各空欄に対してユーザーが選択した選択肢IDを受け取る
- `SELECT_correct_answer_BY_blank_id.sql` で空欄ごとの正解選択肢を取得する
- 選択された選択肢と正解を比較し正誤を判定する
- 判定結果をJSON形式で返却する
  - 各空欄の正誤結果
  - 正解の選択肢情報
- 認証済みユーザーの場合、解答結果を`user_responses`テーブルに記録する
  - `INSERT_user_response.sql` でuser_id, blank_id, selected_choice_id, is_correctを保存する

## 6. 問題チェック機能

- 認証済みユーザーが問題ページで問題に色付きチェックマークを付けられる
- チェック色: 黄 (yellow) / 緑 (green) / 赤 (red)
- `POST /questions/:question_id/check` でチェックをONにする (`INSERT_IGNORE_user_question_check.sql`)
- `DELETE /questions/:question_id/check` でチェックをOFFにする (`DELETE_user_question_check.sql`)
- チェック状態は問題表示時に `SELECT_user_question_checks_BY_question.sql` で取得してUIに反映する
- `POST /questions/start-from-checks` でチェック済み問題 (色別) をシャッフルして連続出題を開始する

## 7. アカウント管理機能

### 7.1 解答履歴の取得
- `GET /account/history/:testlevel` で級別の解答履歴を取得する
- `SELECT_all_blanks_BY_testlevel.sql` で対象級の全blank一覧をカテゴリ順に取得し、`SELECT_user_history_BY_testlevel.sql` で解答履歴をマージする
- **未解答のblankも含めて全件表示する** (attempts: [] で表現)
- カテゴリ順(大分類num → 小分類num → question_id → blank_number)でソートする
- レスポンスは空欄(blank_id)単位で、各空欄に対し直近3回の解答結果を含む
- 認証済みユーザーのみアクセス可能

### 7.1.1 学習履歴の表示形式
- 表(テーブル)形式で表示する
  - 列: 問題ID、空欄、カテゴリ分野(小分類名)、習熟度
  - 行: 空欄(blank_id)ごとに1行
- 習熟度マークの判定ロジック
  - **◎ (mastery-excellent)**: 直近2回すべて正解 — 習熟
  - **〇 (mastery-good)**: 直近1回正解 — 正解
  - **× (mastery-incorrect)**: 直近1回が不正解 — 要復習
  - **- (mastery-unanswered)**: 未解答
- 判定優先順: × → ◎ → 〇 → -
- テーブル上部に習熟度マークの凡例を表示する

### 7.2 学習統計の取得
- `GET /account/stats/total-learned` でユーザーの総学習数を取得する
- `SELECT_total_learned_count_BY_user.sql` で解答済みの問題数(重複除外)を返却する

### 7.3 達成度の取得
- `GET /account/achievement/:testlevel` で級別の達成度情報を取得する
- 網羅度: `SELECT_achievement_coverage_BY_testlevel.sql` で回答済み問題数 / 全問題数を取得する
- カテゴリ別正解率: `SELECT_achievement_categories_BY_testlevel.sql` で現在・2週間前・1ヶ月前の3期間の正解率を1クエリで取得する
- レスポンスは大分類ごとにグループ化された小分類別の正解率データを含む

### 7.4 学習活動の取得
- `GET /account/activity/:testlevel` で級別・期間別の学習活動データを取得する
- `unit` クエリパラメータで集計単位を指定する (`daily`/`weekly`/`monthly`/`yearly`)
- 各単位の表示期間: daily=30日, weekly=84日(12週), monthly=365日, yearly=1825日(5年)

### 7.5 プロフィール更新
- `PUT /account/profile` でプロフィール情報を更新する
- 更新可能フィールド: `user_name` (50文字以内), `want_grade1`, `want_grade2` (目標級), `scheduled_exam_date` (受験予定日)
- フィールドのホワイトリスト制御でSQLインジェクションを防止する

### 7.6 チェック問題の取得
- `GET /account/checks/:color` で色別のチェック問題一覧を取得する
- 許可する色: `yellow`, `green`, `red`
- `SELECT_user_question_checks_BY_color.sql` でチェック済み問題の詳細情報を返却する

### 7.7 問題閲覧
- `GET /account/view/:question_id` でアカウント画面から個別の問題を閲覧する
- セッションにこの問題IDのみを設定して問題ページへリダイレクトする

### 7.8 アカウント削除
- `DELETE /account/delete` でアカウントを削除する
- `quiz_sessions`, `user_responses`, `users` の順に削除する
- 認証済みユーザーのみ実行可能

### 7.9 アカウント管理UI
- ナビゲーションバーからアカウント管理モーダルを開く
- モーダル内のタブで以下のセクションを切り替える
  - プロフィール (名前・目標級・受験予定日の編集)
  - 解答履歴
  - 達成度・レーダーチャート
  - 学習活動
  - チェック問題
  - 設定 (アカウント削除等)

## 8. お問い合わせ機能

### 8.1 お問い合わせ入力
- `GET /contact` でお問い合わせ入力フォームを表示する
- 入力項目: お名前・メールアドレス・種別・件名・お問い合わせ内容
- 種別: バグ・不具合報告 / 機能・改善要望 / 使い方の質問 / その他
- バリデーション: 各フィールドの必須チェック・文字数上限チェック・メール形式チェック
- `POST /contact` でバリデーション後、サニタイズしてセッションに保存して確認画面へリダイレクトする
- レート制限: 同一IPから10回/30分
- ハニーポットフィールドによるBot検出

### 8.2 お問い合わせ確認
- `GET /contact/confirm` でセッションに保存されたフォームデータを確認画面に表示する
- `POST /contact/confirm` でDBへ保存 (`INSERT_contact_inquiry.sql`) し、メールを非同期送信する
  - ユーザー向け受付確認メール (受付番号を含む)
  - 管理者向け通知メール
  - メール送信失敗はログ出力のみで、ユーザー体験には影響しない
- セッションの問い合わせデータを削除して完了画面へリダイレクトする

### 8.3 お問い合わせ完了
- `GET /contact/complete` でセッションの完了フラグを確認して完了画面を表示する
- 直接アクセスした場合は入力フォームへリダイレクトする

## 9. ツール機能

ツールページ (`GET /tools/simulate`) はタブ切り替えで3つのツールを提供する。

### 9.1 仮説検定シミュレーター

- t検定・z検定・χ²検定・F検定の実行をサポートする
- 入力ウィザード形式で検定の種類・仮説・有意水準・データを入力する
- `POST /tools/api/simulate` で仮説検定を実行し、統計量・臨界値・p値・判定結果を返却する
- `POST /tools/api/validate` で入力値を検証し、派生値・バッジ情報を返却する
- `POST /tools/api/calculate` でステップバイステップの計算過程を返却する
- `GET /tools/api/critical-values` で分布別・パラメータ別の臨界値を返却する
- `GET /tools/api/contents/templates` でUIテキストテンプレートを返却する
- Canvas APIで確率分布グラフ (棄却域・統計量の位置) を描画する
- レート制限: 60回/分 (`/tools/api/simulate`)

### 9.2 管制図シミュレーター

- 管制図 (X̄-R管理図等) のシミュレーションを行う
- **ビギナーモード**: あらかじめ設定されたデータセットで管制図の読み方を学習する
- **エキスパートモード**: パラメータをカスタマイズしてネルソンルールによる異常判定を体験する
- ネルソンルール (8種類) に基づく異常点の検出と可視化をCanvas APIで描画する
- スコアをLocalStorageに保存する

### 9.3 分布族マップ

- 確率分布の相互関係・特殊ケースをビジュアルマップで表示する
- 各分布のPDF (確率密度関数) をCanvas APIでリアルタイム描画する
- アニメーションで分布間の変化を視覚化する
- 分布をクリックすると詳細パネルに式・パラメータ情報を表示する

## 10. 情報ページ機能

- `GET /qcis` でQC検定の概要情報ページを表示する
- `GET /statisinfo` で統計情報ページを表示する
- `GET /kiyaku` で利用規約ページを表示する
- `GET /privacy-policy` でプライバシーポリシーページを表示する
- `GET /sitemap` でサイトマップページを表示する
- `GET /manual` で使い方ガイドページを表示する

## 11. 共通UI機能

### 11.1 ナビゲーションバー
- 全ページ共通のヘッダーナビゲーション
- 認証状態に応じて表示を切り替える
  - 未ログイン時: ログイン/新規登録ボタン → 認証モーダルを開く
  - ログイン時: アカウントメニュー・ログアウトボタン

### 11.2 認証モーダル
- `views/_share/auth_modal.ejs` で提供するログイン/新規登録用モーダル
- `public/js/auth.js` がAjax送信・エラー表示・ページリロードを制御する

### 11.3 フッター
- 全ページ共通のフッター
- 利用規約・プライバシーポリシーへのリンクを含む

### 11.4 解答結果表示コンポーネント
- 解答送信後に正誤結果を表示する共通コンポーネント
- 正解/不正解の判定結果と正解情報を表示する

### 11.5 コピー防止
- `copy-protection.js` により問題コンテンツのコピーを防止する

## 12. データモデル

### 12.1 問題データ構造
- **quiz_questions**: 問題本体(タイトル, 級, 本文, 画像, 解説)
- **quiz_blanks**: 問題内の空欄(問題IDに紐づく、解説・解説画像を含む)
- **quiz_choices**: 空欄ごとの選択肢(ラベル, 選択肢テキスト)
- **quiz_answers**: 空欄と正解選択肢の対応

### 12.2 カテゴリ構造
- **quiz_large_category**: 大分類
- **quiz_small_category**: 小分類(大分類に紐づく、出題範囲の級情報・category_idを含む)
- **theorypractice**: カテゴリ区分(実践編/手法編など)

### 12.3 ユーザーデータ構造
- **users**: ユーザー情報(ID, パスワードハッシュ, メール, 目標級, 受験予定日, タイムスタンプ等)
- **user_responses**: 解答履歴(ユーザーID, 空欄ID, 選択肢ID, 正誤, 解答日時)
- **user_question_checks**: 問題チェック(ユーザーID, 問題ID, 色)
- **quiz_sessions**: 出題セッション永続化(ユーザーID, 問題IDリスト(JSON), 現在インデックス, 開始日時)
- **sessions**: セッション管理(MySQLセッションストア)

### 12.4 その他
- **contact_inquiries**: お問い合わせ(名前, メール, 種別, 件名, 内容, IP, 送信日時)
- **announcements**: お知らせ(タイトル, 内容, 公開日時)

## 13. セッション管理

- express-sessionとexpress-mysql-sessionを使用する
- セッションデータはMySQL上の`sessions`テーブルに永続化する
- テスト中の問題IDリストをセッションに格納し、連続出題を制御する
- 認証情報(Passportシリアライズ)をセッションに保持する
- CSRFトークンをセッションに保持する
- ログアウト時に出題セッションを `quiz_sessions` テーブルに保存し、次回ログイン時に復元する
- `quiz_sessions` は1時間ごとのバッチで期限切れレコードを自動削除する
