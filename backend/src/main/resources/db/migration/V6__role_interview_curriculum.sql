ALTER TABLE interviews ADD COLUMN curriculum_version VARCHAR(20) NOT NULL DEFAULT 'LEGACY';
ALTER TABLE interview_questions ADD COLUMN phase VARCHAR(20) NOT NULL DEFAULT 'Legacy';
ALTER TABLE interview_questions ADD COLUMN turn_kind VARCHAR(20) NOT NULL DEFAULT 'MAIN';
ALTER TABLE interview_questions ADD COLUMN plan_index INT;
ALTER TABLE interview_answers ADD COLUMN feedback_json TEXT;
