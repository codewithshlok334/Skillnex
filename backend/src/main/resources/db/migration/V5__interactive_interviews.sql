ALTER TABLE interviews ADD COLUMN ended_at TIMESTAMP;
ALTER TABLE interview_answers ADD COLUMN input_mode VARCHAR(20) NOT NULL DEFAULT 'TEXT';
ALTER TABLE interview_answers ADD COLUMN response_seconds INT;
ALTER TABLE interview_answers ADD COLUMN speech_seconds INT;
ALTER TABLE interview_answers ADD COLUMN spoken_words INT;
ALTER TABLE interviews DROP CONSTRAINT interview_kind_valid;
ALTER TABLE interviews ADD CONSTRAINT interview_kind_valid CHECK (kind IN ('HR','Technical','Behavioral','Coding','Mixed'));
