# QC_Portal セキュリティ監査結果

監査日: 2026-02-01
対象: リポジトリ全体 (認証・セッション・DB・入力処理・テンプレート・ヘッダー)

---

## CRITICAL (致命的)

### 1. セッションシークレットがハードコード

- **ファイル**: `config/application.config.js:4`
- **現状**:
  ```js
  SESSION_SECRET: "YOUR-SESSION-SECRET-STRING"
  ```
  環境変数を参照せず、全環境で同一のプレースホルダ値が使われている。
- **影響**: この値を知る攻撃者がセッションCookieを偽造し、任意のユーザーになりすませる。
ソースコードが公開された時点で全アカウントが危殆化する。
- **対策**:
  - [x] `process.env.SESSION_SECRET` から読み込むよう変更
  - [x] `.env` に十分な長さ (64文字以上) のランダム文字列を設定
  - [x] 環境変数が未設定の場合はアプリ起動を拒否する (`throw`)

---

### 2. DBパスワードがソースコードにハードコード

- **ファイル**: `config/mysql.config.js:5`
- **現状**:
  ```js
  PASSWORD: process.env.MYSQL_PASSWORD || "i2679nm3328"
  ```
  環境変数が未設定時のフォールバックとして実パスワードがコードに存在する。
- **影響**: リポジトリにアクセスできる全員がDBに直接接続可能。
- **対策**:
  - [ ] フォールバック値を削除し、`process.env.MYSQL_PASSWORD` のみを参照
  - [ ] 環境変数が未設定の場合はアプリ起動を拒否する (`throw`)
  - [ ] 現在のパスワードをローテーション (漏洩済みとみなす)

---

### 3. Stored XSS (格納型クロスサイトスクリプティング)

- **ファイル**: `views/questions/question.ejs:67`
- **現状**:
  ```ejs
  <span class="latex-content" data-latex="true"><%- choice.text %></span>
  ```
  `<%-` はEJSのエスケープなし出力。`choice.text` はDBから取得した値であり、DB内にスクリプトが注入されていた場合、閲覧する全ユーザーのブラウザで任意のJavaScriptが実行される。
- **影響**: セッション窃取、フィッシング、マルウェア配布。
- **対策**:
  - [ ] `<%= choice.text %>` (エスケープ出力) に変更
  - [ ] KaTeXのレンダリングはクライアント側の `renderMathInElement()` がテキストノードから数式を検出するため、HTMLエスケープ済みでも動作する
  - [ ] Content-Security-Policy ヘッダーでインラインスクリプトを制限 (多層防御)

---

### 4. CSRF保護が存在しない

- **対象**: 全POST/DELETEエンドポイント
  - `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`
  - `POST /questions/start`, `POST /questions/answer`, `POST /questions/complete`
  - `DELETE /account/delete`
- **現状**: CSRFトークンの検証がなく、セッションCookieに `sameSite` 属性も未設定。外部サイトから正規ユーザーのブラウザ経由でリクエストを送信可能。
- **影響**: `DELETE /account/delete` はCSRF一発でアカウント削除が可能。
- **対策**:
  - [ ] セッションCookieに `sameSite: 'lax'` を設定 (最低限の対策)
  - [ ] JSON APIには `Origin` / `Referer` ヘッダー検証を導入
  - [ ] フォームベースのPOST (`/questions/start`) にはCSRFトークンを導入

---

### 5. MySQL接続で `insecureAuth: true`

- **ファイル**: `app.js:34`
- **現状**:
  ```js
  insecureAuth: true
  ```
  旧式のMySQL認証プロトコル (`mysql_old_password`) を許可。パスワードが平文で送信される可能性がある。
- **影響**: ネットワーク上での盗聴によるDB認証情報の漏洩。
- **対策**:
  - [ ] `insecureAuth: true` を削除
  - [ ] MySQLサーバー側で `caching_sha2_password` または `mysql_native_password` を使用
  - [ ] 接続にTLSを使用 (`ssl` オプション設定)

---

## HIGH (高)

### 6. ログイン後のセッション再生成がない (Session Fixation)

- **ファイル**: `routes/auth.js:18`
- **現状**: `req.logIn()` の後に `req.session.regenerate()` を呼んでいない。
- **影響**: 攻撃者がログイン前のセッションIDを被害者に踏ませた場合、ログイン後のセッションを乗っ取れる。
- **対策**:
  - [ ] `req.logIn()` コールバック内で `req.session.regenerate()` を実行し、その後にレスポンスを返す

---

### 7. 認証エンドポイントにレート制限がない

- **ファイル**: `routes/auth.js:8`, `routes/auth.js:43`
- **現状**: `/auth/login` と `/auth/register` にレート制限がなく、無制限にリクエスト可能。
- **影響**: ブルートフォース攻撃によるパスワード推測、アカウント大量作成。
- **対策**:
  - [ ] `express-rate-limit` 等のミドルウェアを導入
  - [ ] ログイン: IP単位で 5回/分 程度に制限
  - [ ] 登録: IP単位で 3回/時 程度に制限
  - [ ] 連続失敗時のアカウントロック機能を検討

---

### 8. セッションCookieの属性不備

- **ファイル**: `app.js:43-47`
- **現状**:
  ```js
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: null
  }
  ```
  `secure: false` のため HTTPS環境でもHTTP経由でCookieが送信されうる。`sameSite` 未設定のためCSRFリスクが増大。
- **対策**:
  - [ ] 本番環境で `secure: true` を設定 (環境変数で切り替え)
  - [ ] `sameSite: 'lax'` を追加
  - [ ] `maxAge` にセッション有効期限を明示的に設定

---

## MEDIUM (中)

### 9. セキュリティヘッダーが未設定

- **現状**: `app.disable("x-powered-by")` のみ。以下のヘッダーが欠落。
  - `Content-Security-Policy` — XSSの軽減
  - `X-Content-Type-Options` — MIMEスニッフィング防止
  - `Strict-Transport-Security` — HTTPS強制
  - `X-Frame-Options` — クリックジャッキング防止
- **対策**:
  - [ ] `helmet` パッケージを導入
  - [ ] `Content-Security-Policy` でインラインスクリプト制限を段階的に適用

---

### 10. `question_id` パラメータの入力検証なし

- **ファイル**: `routes/account.js:193`
- **現状**:
  ```js
  const questionId = req.params.question_id;
  req.session.questionIds = [questionId];
  res.redirect(`/questions/${questionId}`);
  ```
  `question_id` が数値かどうかの検証がなく、任意の文字列がセッションに格納されリダイレクト先URLに組み込まれる。
- **対策**:
  - [ ] `parseInt()` + `isNaN()` で数値のみ受け付けるよう検証
  - [ ] 不正な値の場合は 400 エラーを返す

---

### 11. デバッグ用 `console.log` が本番コードに残存

- **ファイル**: `routes/question_start.js:10-11`, `routes/question_select.js:39`
- **現状**:
  ```js
  console.log('[question_start] req.body:', JSON.stringify(req.body));
  ```
  リクエストボディの全内容がサーバーログに出力される。
- **影響**: ログが流出した場合の情報漏洩リスク。
- **対策**:
  - [ ] デバッグ用 `console.log` を削除、または `NODE_ENV` で制御
  - [ ] 本番環境では構造化ログライブラリ (winston等) を使用

---

## 対応優先度まとめ

| 優先度 | # | 問題 | 影響 |
|---|---|---|---|
| **CRITICAL** | 1 | セッションシークレットのハードコード | 全ユーザーへのなりすまし |
| **CRITICAL** | 2 | DBパスワードのハードコード | データベース全体の漏洩 |
| **CRITICAL** | 3 | Stored XSS (`<%- choice.text %>`) | セッション窃取・フィッシング |
| **CRITICAL** | 4 | CSRF保護なし | アカウント削除等の不正操作 |
| **CRITICAL** | 5 | `insecureAuth: true` | DB認証情報の盗聴 |
| HIGH | 6 | Session Fixation | セッション乗っ取り |
| HIGH | 7 | 認証レート制限なし | ブルートフォース攻撃 |
| HIGH | 8 | Cookie属性の不備 | セッションCookie漏洩 |
| MEDIUM | 9 | セキュリティヘッダー未設定 | 多層防御の欠如 |
| MEDIUM | 10 | 入力検証なし (question_id) | 不正データのセッション格納 |
| MEDIUM | 11 | デバッグログ残存 | 情報漏洩リスク |
