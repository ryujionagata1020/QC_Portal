SELECT
  l.large_category_id,
  l.large_category_name,
  s.small_category_id,
  s.small_category_name,
  s.scope_exam   -- ← これを追加
FROM quiz_large_category AS l
JOIN quiz_small_category AS s
  ON l.large_category_id = s.large_category_id
ORDER BY l.large_category_id, s.small_category_id;