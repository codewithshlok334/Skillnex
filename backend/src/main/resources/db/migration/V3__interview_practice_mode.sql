ALTER TABLE interviews ADD COLUMN mode VARCHAR(16) NOT NULL DEFAULT 'AI';
ALTER TABLE interviews ADD CONSTRAINT interview_mode_valid CHECK (mode IN ('AI','PRACTICE'));
