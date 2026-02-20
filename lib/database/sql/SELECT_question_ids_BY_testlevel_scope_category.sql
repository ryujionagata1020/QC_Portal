SELECT q.question_id
FROM quiz_questions AS q
JOIN quiz_small_category AS s ON q.small_category_id = s.small_category_id
JOIN quiz_large_category AS l ON s.large_category_id = l.large_category_id
JOIN theorypractice AS tp ON l.category_id = tp.category_id
WHERE q.testlevel = ?
  AND s.scope_exam = ?
  AND tp.category_name = ?
ORDER BY q.question_id;
