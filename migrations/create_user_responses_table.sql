-- ユーザー回答履歴テーブル作成
CREATE TABLE IF NOT EXISTS user_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  blank_id INT NOT NULL,
  selected_choice_id INT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_blank_id (blank_id),
  INDEX idx_user_blank (user_id, blank_id),
  INDEX idx_answered_at (answered_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
