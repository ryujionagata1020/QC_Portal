SELECT q.question_id
FROM quiz_questions AS q
JOIN quiz_small_category AS s ON q.small_category_id = s.small_category_id
WHERE q.testlevel = ?
  AND s.scope_exam = ?
ORDER BY q.question_id;
