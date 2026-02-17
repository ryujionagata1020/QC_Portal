SELECT
  q.question_id,
  q.body,
  q.testlevel,
  q.image_data,
  q.explanation,
  s.small_category_name,
  l.large_category_name,
  c.choice_id,
  c.label,
  c.choice_text
FROM quiz_questions AS q
JOIN quiz_small_category AS s ON q.small_category_id = s.small_category_id
JOIN quiz_large_category AS l ON s.large_category_id = l.large_category_id
LEFT JOIN quiz_blanks AS b ON q.question_id = b.question_id
LEFT JOIN quiz_choices AS c ON b.blank_id = c.blank_id
WHERE q.question_id = ?
ORDER BY b.blank_number, c.choice_id;