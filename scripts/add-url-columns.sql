-- DBにS3 URLカラムを追加する（既存のblobカラムはそのまま残す）
-- 実行: mysql -u qcuser -p qc_portal < scripts/add-url-columns.sql

ALTER TABLE quiz_questions
  ADD COLUMN image_url VARCHAR(500) DEFAULT NULL AFTER image_data,
  ADD COLUMN explanation_url VARCHAR(500) DEFAULT NULL AFTER explanation_data;

ALTER TABLE quiz_blanks
  ADD COLUMN explanation_url VARCHAR(500) DEFAULT NULL AFTER explanation_data;
