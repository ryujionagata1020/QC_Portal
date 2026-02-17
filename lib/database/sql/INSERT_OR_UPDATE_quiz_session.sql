INSERT INTO quiz_sessions (user_id, question_ids, current_index, session_started_at, expires_at)
VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))
ON DUPLICATE KEY UPDATE
  question_ids = VALUES(question_ids),
  current_index = VALUES(current_index),
  session_started_at = VALUES(session_started_at),
  created_at = NOW(),
  expires_at = DATE_ADD(NOW(), INTERVAL 48 HOUR);
