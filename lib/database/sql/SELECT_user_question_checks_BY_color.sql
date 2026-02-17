SELECT
  c.question_id,
  c.color,
  c.created_at,
  q.title,
  s.small_category_name,
  l.large_category_name
FROM user_question_checks c
JOIN quiz_questions q ON q.question_id = c.question_id
JOIN quiz_small_category s ON s.small_category_id = q.small_category_id
JOIN quiz_large_category l ON s.large_category_id = l.large_category_id
WHERE c.user_id = ? AND c.color = ?
ORDER BY c.created_at DESC;
