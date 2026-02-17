SELECT
  (SELECT COUNT(DISTINCT qb.question_id)
   FROM user_responses ur
   JOIN quiz_blanks qb ON ur.blank_id = qb.blank_id
   JOIN quiz_questions qq ON qb.question_id = qq.question_id
   WHERE ur.user_id = ? AND qq.testlevel = ?) as answered_count,
  (SELECT COUNT(*) FROM quiz_questions WHERE testlevel = ?) as total_count
