# QC_Portal 機能設計書

## 1. トップページ機能

- `GET /` でトップページを表示する
- データベースからランダムに1問取得し、問題のプレビューを表示する
- プレビューには問題タイトル・本文・空欄・選択肢を含む
- 問題プレビューから該当問題の詳細ページへ遷移できる
- 問題選択画面への導線を提供する

## 2. ユーザー認証機能

### 2.1 ユーザー登録
- `POST /auth/register` でユーザー登録を行う
- ユーザーID・パスワード・メールアドレスを入力として受け付ける
- パスワードはbcryptでハッシュ化して`users`テーブルに保存する
- 登録成功時、自動的にログイン状態にする

### 2.2 ログイン
- `POST /auth/login` でログイン処理を行う
- Passport.js (LocalStrategy) を使用して認証する
- ユーザーIDとパスワードで照合し、bcryptでハッシュ比較を行う
- ログイン成功時、`last_login_at`を更新する
- セッションはexpress-sessionとexpress-mysql-sessionでMySQL上に管理する

### 2.3 ログアウト
- `POST /auth/logout` でセッションを破棄しログアウトする

### 2.4 認証状態確認
- `GET /auth/status` で現在の認証状態をJSON形式で返却する
- フロントエンドからの非同期リクエストで認証状態を確認する用途

## 3. 問題選択機能

### 3.1 問題選択画面の表示
- `GET /questions/select` で問題選択画面を表示する
- `SELECT_category_tree.sql` を使用してカテゴリツリー(大分類・小分類)を取得する
- ユーザーは以下の条件で問題を絞り込める
  - 級 (testlevel)
  - 大分類 (quiz_large_category)
  - 小分類 (quiz_small_category)

### 3.2 テスト開始
- `POST /questions/start` で選択された条件に基づきテストを開始する
- `SELECT_question_BY_conditions.sql` で条件に合致する問題IDリストを取得する
- 取得した問題IDリストをセッションに格納する
- 最初の問題ページへリダイレクトする

## 4. 問題出題・表示機能

### 4.1 問題詳細の表示
- `GET /questions/:question_id` で個別の問題を表示する
- `SELECT_question_detail_WITH_BLANKS.sql` で問題の詳細情報を取得する
  - 問題タイトル・本文・画像データ
  - 空欄情報 (quiz_blanks)
  - 各空欄の選択肢 (quiz_choices)
  - 解説・解説画像
- 数式はKaTeXでレンダリングする
- 画像データ(longblob)がある場合は問題内に表示する

### 4.2 出題モード
- **単問モード**: 個別の問題IDを指定して1問だけ表示する
- **連続モード**: セッションに格納された問題IDリストに基づき連続して出題する
  - 現在の問題番号と総問題数を表示する
  - 次の問題への遷移を制御する

### 4.3 中断再開機能
- ログインユーザーが連続出題モードで途中離脱した場合、中断地点から再開できる
- `GET /questions/:question_id` で問題を表示するたびに `req.session.currentIndex` を現在の問題位置で更新する
- `GET /questions/select` の表示時にセッション内の出題データ (`questionIds`, `currentIndex`) を確認する
  - ログイン中かつ未完了の出題セッションが存在する場合、再開情報 (`resumeData`) をビューに渡す
- 問題選択画面の「出題開始」ボタンの右隣に「中断したところから再開（N/M問目から）」ボタンを表示する
  - ボタンは `resumeData` が存在する場合のみ描画される
  - クリックすると中断した問題ページへ直接遷移する
- 全問完了時の処理
  - 最後の問題で終了オーバーレイの「閉じる」ボタンを押すと `POST /questions/complete` を呼び出す
  - `POST /questions/complete` はセッションから `questionIds` と `currentIndex` を削除し、`req.session.save()` で明示的に保存する
  - セッションクリア完了後に問題選択画面へリダイレクトする
  - これにより全問完了後は再開ボタンが表示されない
- 新たに「出題開始」を押した場合、既存の出題セッションは上書きされる
- 「ログイン状態を保持する」にチェックを入れたユーザーはセッションが30日間持続するため、ブラウザを閉じても再開可能

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

## 6. アカウント管理機能

### 6.1 解答履歴の取得
- `GET /account/history/:testlevel` で級別の解答履歴を取得する
- `SELECT_user_history_BY_testlevel.sql` でROW_NUMBERによるランク付けされた履歴を返却する
- カテゴリ情報(大分類・小分類)を含めて返却する
  - `quiz_small_category`, `quiz_large_category` をJOINして取得
  - カテゴリ順(大分類num → 小分類num → question_id → blank_id)でソートする
- 認証済みユーザーのみアクセス可能
- レスポンスは空欄(blank_id)単位で、各空欄に対し直近3回の解答結果を含む

### 6.1.1 学習履歴の表示形式
- 表(テーブル)形式で表示する
  - 列: 問題ID、空欄、カテゴリ分野(小分類名)、習熟度
  - 行: 空欄(blank_id)ごとに1行
- 習熟度マークの判定ロジック
  - **◎ (mastery-excellent)**: 直近2回すべて正解 — 習熟
  - **〇 (mastery-good)**: 直近1回正解 — 正解
  - **× (mastery-incorrect)**: 直近1回が不正解 — 要復習
- 判定優先順: × → ◎ → 〇
- テーブル上部に習熟度マークの凡例を表示する

### 6.2 学習統計の取得
- `GET /account/stats/total-learned` でユーザーの総学習数を取得する
- `SELECT_total_learned_count_BY_user.sql` で解答済みの問題数(重複除外)を返却する

### 6.3 達成度の取得
- `GET /account/achievement/:testlevel` で級別の達成度情報を取得する

### 6.4 問題閲覧
- `GET /account/view/:question_id` でアカウント画面から個別の問題を閲覧する

### 6.5 アカウント削除
- `DELETE /account/delete` でアカウントを削除する
- 認証済みユーザーのみ実行可能

### 6.6 アカウント管理UI
- ナビゲーションバーからアカウント管理モーダルを開く
- モーダル内で解答履歴・学習統計・アカウント削除の操作を行う

## 7. 情報ページ機能

- `GET /qcis` でQC検定の概要情報ページを表示する
- `GET /statisinfo` で統計情報ページを表示する
- `GET /kiyaku` で利用規約ページを表示する
- `GET /privacy-policy` でプライバシーポリシーページを表示する

## 8. 共通UI機能

### 8.1 ナビゲーションバー
- 全ページ共通のヘッダーナビゲーション
- 認証状態に応じて表示を切り替える
  - 未ログイン時: ログインボタン
  - ログイン時: アカウントメニュー・ログアウトボタン

### 8.2 フッター
- 全ページ共通のフッター
- 利用規約・プライバシーポリシーへのリンクを含む

### 8.3 解答結果表示コンポーネント
- 解答送信後に正誤結果を表示する共通コンポーネント
- 正解/不正解の判定結果と正解情報を表示する

### 8.4 コピー防止
- `copy-protection.js` により問題コンテンツのコピーを防止する

## 9. データモデル

### 9.1 問題データ構造
- **quiz_questions**: 問題本体(タイトル, 級, 本文, 画像, 解説)
- **quiz_blanks**: 問題内の空欄(問題IDに紐づく)
- **quiz_choices**: 空欄ごとの選択肢(ラベル, 選択肢テキスト)
- **quiz_answers**: 空欄と正解選択肢の対応

### 9.2 カテゴリ構造
- **quiz_large_category**: 大分類
- **quiz_small_category**: 小分類(大分類に紐づく、出題範囲の級情報を含む)
- **theorypractice**: カテゴリ区分(理論/実践など)

### 9.3 ユーザーデータ構造
- **users**: ユーザー情報(ID, パスワードハッシュ, メール, タイムスタンプ, リセットトークン, 有効フラグ)
- **user_responses**: 解答履歴(ユーザーID, 空欄ID, 選択肢ID, 正誤, 解答日時)
- **sessions**: セッション管理(MySQLセッションストア)

## 10. セッション管理

- express-sessionとexpress-mysql-sessionを使用する
- セッションデータはMySQL上の`sessions`テーブルに永続化する
- テスト中の問題IDリストをセッションに格納し、連続出題を制御する
- 認証情報(Passportシリアライズ)をセッションに保持する
