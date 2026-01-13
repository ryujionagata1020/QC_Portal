-- ユーザーの総学習問題数を取得（question_idの重複を除いた数）
-- blank_idは「question_id-Bxx」の形式なので、question_id部分を抽出
SELECT COUNT(DISTINCT LEFT(blank_id, LOCATE('-B', blank_id) - 1)) AS total_count
FROM user_responses
WHERE user_id = ?;
