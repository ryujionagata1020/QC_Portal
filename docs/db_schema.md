# QC Portal データベーススキーマ定義

このプロジェクトのデータベース構造は下記のテーブルで構成される。

## テーブル一覧

1. **問題関連テーブル**
   - `quiz_questions` - 問題本体
   - `quiz_blanks` - 空欄情報
   - `quiz_choices` - 選択肢
   - `quiz_answers` - 正解情報

2. **カテゴリ関連テーブル**
   - `quiz_large_category` - 大分類
   - `quiz_small_category` - 小分類
   - `theorypractice` - 理論/実践区分

3. **ユーザー関連テーブル**
   - `users` - ユーザー情報
   - `user_responses` - 解答履歴
   - `user_question_checks` - 問題チェック管理 (黄・緑・赤フラグ)

4. **セッション関連テーブル**
   - `sessions` - セッション管理 (express-mysql-session)
   - `quiz_sessions` - クイズセッション (中断再開機能)

5. **お知らせテーブル**
   - `announcements` - お知らせ情報

---

## 1. 問題関連テーブル

### `quiz_questions` - 問題本体

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| question_id | varchar(50) | NO | PRI | | |
| title | varchar(255) | YES | | | |
| image_data | longblob | YES | | | |
| body | text | YES | | | |
| created_at | datetime | NO | | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| small_category_id | varchar(50) | NO | MUL | | |
| explanation | text | YES | | | |
| explanation_data | longblob | YES | | | |

**説明**:
- QC検定の問題本体を格納する
- `image_data`: 問題画像（longblob形式）
- `explanation_data`: 解説画像（longblob形式）
- `small_category_id`: 小分類へのFK

### `quiz_blanks` - 空欄情報

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| blank_id | varchar(50) | NO | PRI | | |
| question_id | varchar(50) | NO | MUL | | |
| blank_number | int | NO | | | |
| explanation | text | YES | | | |
| explanation_data | longblob | YES | | | |

**説明**:
- 問題内の空欄（穴埋め箇所）を管理する
- `blank_number`: 問題内での空欄の順序
- `explanation`: 空欄別の解説
- `explanation_data`: 解説画像（longblob形式）

### `quiz_choices` - 選択肢

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| choice_id | varchar(50) | NO | PRI | | |
| blank_id | varchar(50) | NO | MUL | | |
| label | varchar(10) | NO | | | |
| choice_text | text | NO | | | |

**説明**:
- 各空欄に対する選択肢を格納する
- `label`: 選択肢のラベル（例: "ア", "イ", "ウ"）
- `choice_text`: 選択肢の内容

### `quiz_answers` - 正解情報

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| blank_id | varchar(50) | NO | PRI | | |
| correct_choice_id | varchar(50) | NO | MUL | | |

**説明**:
- 各空欄の正解選択肢を定義する
- 1つの空欄に対して1つの正解を格納

---

## 2. カテゴリ関連テーブル

### `quiz_large_category` - 大分類

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| large_category_id | varchar(50) | NO | PRI | | |
| large_category_name | varchar(100) | NO | | | |
| num | int | YES | | | |
| category_id | varchar(50) | YES | | | |

**説明**:
- 品質管理の大分類を管理する（例: "品質の概念", "管理図"）
- `num`: 表示順序
- `category_id`: theorypracticeテーブルへのFK（理論/実践区分）

### `quiz_small_category` - 小分類

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| small_category_id | varchar(50) | NO | PRI | | |
| small_category_name | varchar(100) | NO | | | |
| large_category_id | varchar(50) | NO | MUL | | |
| scope_exam | int | YES | | | |
| num | int | YES | | | |

**説明**:
- 品質管理の小分類を管理する
- `scope_exam`: 出題範囲の級（1, 2, 3, 4級）
- `num`: 表示順序
- `large_category_id`: 大分類へのFK

### `theorypractice` - 理論/実践区分

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| category_id | varchar(50) | NO | PRI | | |
| category_name | varchar(20) | NO | | | |

**説明**:
- カテゴリが理論か実践かを区分する
- 例: "理論", "実践"

---

## 3. ユーザー関連テーブル

### `users` - ユーザー情報

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI | | auto_increment |
| user_id | varchar(50) | NO | UNI | | |
| password_hash | varchar(255) | NO | | | |
| mail | varchar(255) | YES | | | |
| created_at | timestamp | YES | | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| last_login_at | timestamp | YES | | | |
| update_at | timestamp | YES | | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| reset_token | varchar(255) | YES | MUL | | |
| reset_token_expire | timestamp | YES | | | |
| is_active | tinyint(1) | YES | | 1 | |
| want_grade1 | varchar(191) | YES | | | |
| want_grade2 | varchar(191) | YES | | | |
| user_name | varchar(191) | YES | | | |
| scheduled_exam_date | date | YES | | | |

**説明**:
- ユーザーアカウント情報を管理する
- `password_hash`: bcryptでハッシュ化されたパスワード
- `reset_token`: パスワードリセット用トークン
- `want_grade1`, `want_grade2`: 第一志望級、第二志望級
- `user_name`: ユーザー表示名
- `scheduled_exam_date`: 試験予定日

### `user_responses` - 解答履歴

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| response_id | bigint | NO | PRI | | auto_increment |
| user_id | varchar(50) | NO | MUL | | |
| blank_id | varchar(50) | NO | MUL | | |
| selected_choice_id | varchar(50) | NO | MUL | | |
| is_correct | tinyint(1) | NO | | | |
| answered_at | datetime | NO | | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

**説明**:
- ユーザーの解答履歴を記録する
- `is_correct`: 正誤フラグ（1=正解, 0=不正解）
- 空欄単位で解答を記録する

### `user_question_checks` - 問題チェック管理

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | bigint | NO | PRI | | auto_increment |
| user_id | varchar(50) | NO | MUL | | |
| question_id | varchar(50) | NO | MUL | | |
| color | enum('yellow','green','red') | NO | | | |
| created_at | datetime | NO | | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

**説明**:
- ユーザーが問題に付けるチェックフラグを管理する
- `color`:
  - `yellow`: 後で見直す
  - `green`: 理解済み
  - `red`: 要復習
- ユーザーごとに問題の学習状態を管理できる

---

## 4. セッション関連テーブル

### `sessions` - セッション管理

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| session_id | varchar(128) | NO | PRI | | |
| expires | int unsigned | NO | | | |
| data | mediumtext | YES | | | |

**説明**:
- express-mysql-session が自動管理する
- ユーザーのログインセッション情報を永続化する

### `quiz_sessions` - クイズセッション

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI | | auto_increment |
| user_id | varchar(50) | NO | UNI | | |
| question_ids | json | NO | | | |
| current_index | int | NO | | 0 | |
| session_started_at | datetime | NO | | | |
| created_at | datetime | NO | | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| expires_at | datetime | NO | | | |

**説明**:
- 連続出題モードの中断再開機能を実現する
- `question_ids`: 出題する問題IDのリスト（JSON形式）
- `current_index`: 現在の問題位置（0-indexed）
- `expires_at`: セッション有効期限（定期クリーンアップの基準）
- ユーザーごとに1つのセッションを保持（`user_id` UNIQUE制約）

---

## 5. お知らせテーブル

### `announcements` - お知らせ情報

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| announcement_id | int | NO | PRI | | auto_increment |
| genre | enum('update','bugfix','news') | NO | MUL | | |
| title | varchar(255) | NO | | | |
| content | text | NO | | | |
| published_at | datetime | NO | MUL | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| is_visible | tinyint(1) | NO | | 1 | |
| created_at | datetime | NO | | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime | NO | | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

**説明**:
- サイトのお知らせ・更新情報を管理する
- `genre`:
  - `update`: 機能更新
  - `bugfix`: バグ修正
  - `news`: ニュース
- `is_visible`: 公開フラグ（1=公開, 0=非公開）
- `published_at`, `genre` にインデックスを設定（最新のお知らせ取得クエリの最適化）

---

## リレーションシップ

```
theorypractice
    ↓ (1:N)
quiz_large_category
    ↓ (1:N)
quiz_small_category
    ↓ (1:N)
quiz_questions
    ↓ (1:N)
quiz_blanks
    ↓ (1:N)
quiz_choices
    ↑
    quiz_answers (正解選択肢を指定)

users
    ↓ (1:N)
user_responses (解答履歴)

users
    ↓ (1:N)
user_question_checks (問題チェックフラグ)

users
    ↓ (1:1)
quiz_sessions (クイズセッション)
```

---

## インデックス戦略

- **PRIMARY KEY**: 各テーブルの主キー（自動的にインデックス）
- **UNIQUE KEY**: `users.user_id`, `quiz_sessions.user_id`
- **FOREIGN KEY (MUL)**:
  - `quiz_questions.small_category_id`
  - `quiz_blanks.question_id`
  - `quiz_choices.blank_id`
  - `quiz_answers.correct_choice_id`
  - `quiz_small_category.large_category_id`
  - `user_responses.user_id`, `user_responses.blank_id`, `user_responses.selected_choice_id`
  - `user_question_checks.user_id`, `user_question_checks.question_id`
  - `users.reset_token`
  - `announcements.genre`, `announcements.published_at`

---

## データ整合性

- **外部キー制約**: 参照整合性を保証
- **ENUM型**: `color`, `genre` などで値の範囲を制限
- **NOT NULL制約**: 必須フィールドに適用
- **DEFAULT値**: `created_at`, `is_active`, `current_index` など
- **AUTO_INCREMENT**: サロゲートキーに適用

---

## バックアップ・メンテナンス

### 定期クリーンアップ
- **quiz_sessions**: `app.js` で1時間ごとに `DELETE_expired_quiz_sessions.sql` を実行し、期限切れセッションを削除

### データ保護
- **カスケード削除**: ユーザー削除時に関連する `user_responses`, `user_question_checks` も削除される
- **論理削除**: `users.is_active` フラグで論理削除を実現（物理削除も選択可能）

---

## 統計クエリ最適化

以下のクエリが頻繁に実行されるため、適切なインデックスが必要:

- `SELECT_user_history_BY_testlevel.sql`: `user_id`, `blank_id` のインデックス
- `SELECT_achievement_categories_BY_testlevel.sql`: `user_id`, `small_category_id` のインデックス
- `SELECT_activity_*_BY_testlevel.sql`: `user_id`, `answered_at` のインデックス
- `SELECT_announcements_latest.sql`: `genre`, `published_at`, `is_visible` のインデックス

---

## テーブルサイズ見積もり

| テーブル | 想定レコード数 | 備考 |
|---------|--------------|------|
| quiz_questions | ~1,000 | 問題数 |
| quiz_blanks | ~3,000 | 問題あたり平均3空欄 |
| quiz_choices | ~12,000 | 空欄あたり平均4選択肢 |
| users | ~10,000 | 想定ユーザー数 |
| user_responses | ~1,000,000 | 1ユーザーあたり平均100解答 |
| user_question_checks | ~50,000 | 1ユーザーあたり平均5チェック |
| quiz_sessions | ~1,000 | アクティブセッション（定期削除） |
| announcements | ~100 | お知らせ履歴 |

---

## セキュリティ考慮事項

- **パスワード**: bcryptハッシュ化、平文保存なし
- **SQL injection**: プリペアドステートメント使用（mysql2/promise）
- **CSRF**: app.js でトークン検証実装
- **XSS**: EJSの自動エスケープ機能を利用
- **セッション固定**: express-session のデフォルト設定で対策済み
