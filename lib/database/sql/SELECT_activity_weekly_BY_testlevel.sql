SELECT
  DATE_FORMAT(ur.answered_at, '%x-W%v') AS period_key,
  COUNT(*) AS answer_count,
  SUM(ur.is_correct) AS correct_count
FROM user_responses ur
JOIN quiz_blanks qb ON ur.blank_id = qb.blank_id
JOIN quiz_questions qq ON qb.question_id = qq.question_id
WHERE ur.user_id = ?
  AND qq.testlevel = ?
  AND ur.answered_at >= ?
GROUP BY period_key
ORDER BY period_key ASC
