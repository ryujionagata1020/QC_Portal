SELECT correct_choice_id
FROM quiz_answers
WHERE blank_id = ?
LIMIT 1;
