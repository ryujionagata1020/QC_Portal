-- 指定した級の全blank一覧をカテゴリ順に取得
SELECT
  qb.blank_id,
  q.question_id,
  qb.blank_number,
  qsc.small_category_name,
  qlc.large_category_name
FROM quiz_blanks qb
JOIN quiz_questions q   ON qb.question_id       = q.question_id
JOIN quiz_small_category qsc ON q.small_category_id = qsc.small_category_id
JOIN quiz_large_category qlc ON qsc.large_category_id = qlc.large_category_id
WHERE q.testlevel = ?
ORDER BY qlc.num, qsc.num, q.question_id, qb.blank_number;
