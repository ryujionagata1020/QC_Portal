-- ユーザーの回答履歴を級ごとに取得（直近3回まで、カテゴリ情報付き）
SELECT
  ur.blank_id,
  LEFT(ur.blank_id, LOCATE('-B', ur.blank_id) - 1) AS question_id,
  qb.blank_number,
  ur.is_correct,
  ur.answered_at,
  q.testlevel,
  qsc.small_category_name,
  qlc.large_category_name,
  ROW_NUMBER() OVER (
    PARTITION BY ur.blank_id
    ORDER BY ur.answered_at DESC
  ) AS attempt_rank
FROM user_responses ur
JOIN quiz_blanks qb ON ur.blank_id = qb.blank_id
JOIN quiz_questions q ON LEFT(ur.blank_id, LOCATE('-B', ur.blank_id) - 1) = q.question_id
JOIN quiz_small_category qsc ON q.small_category_id = qsc.small_category_id
JOIN quiz_large_category qlc ON qsc.large_category_id = qlc.large_category_id
WHERE ur.user_id = ?
  AND q.testlevel = ?
ORDER BY qlc.num, qsc.num, q.question_id, ur.blank_id, ur.answered_at DESC;
