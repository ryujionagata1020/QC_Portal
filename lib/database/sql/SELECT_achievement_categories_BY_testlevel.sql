SELECT
  qlc.large_category_id,
  qlc.large_category_name,
  qsc.small_category_id,
  qsc.small_category_name,
  COUNT(ur.response_id) as total_attempts,
  COALESCE(SUM(ur.is_correct), 0) as correct_count,
  SUM(CASE WHEN ur.answered_at < DATE_SUB(NOW(), INTERVAL 14 DAY) THEN 1 ELSE 0 END) as attempts_2w,
  COALESCE(SUM(CASE WHEN ur.answered_at < DATE_SUB(NOW(), INTERVAL 14 DAY) AND ur.is_correct = 1 THEN 1 ELSE 0 END), 0) as correct_2w,
  SUM(CASE WHEN ur.answered_at < DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 ELSE 0 END) as attempts_1m,
  COALESCE(SUM(CASE WHEN ur.answered_at < DATE_SUB(NOW(), INTERVAL 1 MONTH) AND ur.is_correct = 1 THEN 1 ELSE 0 END), 0) as correct_1m
FROM quiz_small_category qsc
JOIN quiz_large_category qlc ON qsc.large_category_id = qlc.large_category_id
LEFT JOIN (
  SELECT qq.small_category_id, ur2.is_correct, ur2.response_id, ur2.answered_at
  FROM user_responses ur2
  JOIN quiz_blanks qb ON ur2.blank_id = qb.blank_id
  JOIN quiz_questions qq ON qb.question_id = qq.question_id
  WHERE ur2.user_id = ? AND qq.testlevel = ?
) ur ON qsc.small_category_id = ur.small_category_id
WHERE qsc.scope_exam >= ?
GROUP BY qlc.large_category_id, qlc.large_category_name,
         qsc.small_category_id, qsc.small_category_name
ORDER BY qlc.num, qsc.num
