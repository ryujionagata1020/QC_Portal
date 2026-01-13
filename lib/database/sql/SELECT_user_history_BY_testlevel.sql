-- ユーザーの回答履歴を級・難易度ごとに取得（直近3回まで）
SELECT
  ur.blank_id,
  LEFT(ur.blank_id, LOCATE('-B', ur.blank_id) - 1) AS question_id,
  qb.blank_number,
  ur.is_correct,
  ur.answered_at,
  q.testlevel,
  ROW_NUMBER() OVER (
    PARTITION BY ur.blank_id
    ORDER BY ur.answered_at DESC
  ) AS attempt_rank
FROM user_responses ur
JOIN quiz_blanks qb ON ur.blank_id = qb.blank_id
JOIN quiz_questions q ON LEFT(ur.blank_id, LOCATE('-B', ur.blank_id) - 1) = q.question_id
WHERE ur.user_id = ?
  AND q.testlevel = ?
ORDER BY q.question_id, ur.blank_id, ur.answered_at DESC;
