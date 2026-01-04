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
  c.text,
  a.blank_id,
  ab.blank_number
FROM quiz_questions AS q
JOIN quiz_small_category AS s ON q.small_category_id = s.small_category_id
JOIN quiz_large_category AS l ON s.large_category_id = l.large_category_id
LEFT JOIN quiz_choices AS c ON q.question_id = c.question_id
LEFT JOIN quiz_answers AS a ON q.question_id = LEFT(a.blank_id, LOCATE('-B', a.blank_id) - 1)
LEFT JOIN (
  SELECT blank_id, blank_number FROM quiz_blanks
) AS ab ON a.blank_id = ab.blank_id
WHERE q.question_id = ?
ORDER BY ab.blank_number, c.choice_id;