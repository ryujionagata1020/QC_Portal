SELECT
  q.question_id,
  q.body,
  q.testlevel,
  q.image_data,
  q.explanation,
  s.small_category_name,
  l.large_category_name
FROM quiz_questions AS q
JOIN quiz_small_category AS s ON q.small_category_id = s.small_category_id
JOIN quiz_large_category AS l ON s.large_category_id = l.large_category_id
WHERE q.testlevel IN (?)
  AND s.scope_exam IN (?)
ORDER BY q.question_id;