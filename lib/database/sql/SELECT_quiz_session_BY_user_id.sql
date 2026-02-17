SELECT question_ids, current_index, session_started_at
FROM quiz_sessions
WHERE user_id = ?
  AND expires_at > NOW();
