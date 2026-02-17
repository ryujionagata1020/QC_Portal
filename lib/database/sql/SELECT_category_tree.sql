SELECT
  l.large_category_id,
  l.large_category_name,
  l.category_id,
  s.small_category_id,
  s.small_category_name,
  s.scope_exam
FROM quiz_large_category AS l
JOIN quiz_small_category AS s
  ON l.large_category_id = s.large_category_id
ORDER BY l.category_id, l.num, s.num;