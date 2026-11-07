CREATE TABLE aptitude_questions (
 id INT PRIMARY KEY, title VARCHAR(180) NOT NULL,
 category VARCHAR(20) NOT NULL CHECK(category IN ('Quantitative','Reasoning','Verbal')),
 topic VARCHAR(70) NOT NULL, difficulty VARCHAR(10) NOT NULL CHECK(difficulty IN ('Easy','Medium','Hard')),
 prompt TEXT NOT NULL, passage TEXT NOT NULL, options_json TEXT NOT NULL,
 correct_index INT NOT NULL CHECK(correct_index BETWEEN 0 AND 3), explanation TEXT NOT NULL,
 source_kind VARCHAR(20) NOT NULL CHECK(source_kind IN ('ORIGINAL','GATE_PYQ')),
 source_json TEXT NOT NULL, content_version INT NOT NULL DEFAULT 1
);
CREATE INDEX idx_aptitude_filters ON aptitude_questions(category,topic,difficulty,id);
CREATE TABLE aptitude_mocks (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL REFERENCES app_users(id),
 request_key VARCHAR(36) NOT NULL, status VARCHAR(12) NOT NULL CHECK(status IN ('ACTIVE','COMPLETED')),
 category VARCHAR(20) NOT NULL, difficulty VARCHAR(10) NOT NULL,
 question_ids TEXT NOT NULL, answers_json TEXT NOT NULL DEFAULT '{}', review_json TEXT NOT NULL DEFAULT '[]',
 revision INT NOT NULL DEFAULT 0, created_ms BIGINT NOT NULL, expires_ms BIGINT NOT NULL,
 finished_ms BIGINT, score INT, total INT NOT NULL, UNIQUE(user_id,request_key)
);
CREATE INDEX idx_aptitude_mocks_owner ON aptitude_mocks(user_id,created_ms);
CREATE TABLE aptitude_attempts (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL REFERENCES app_users(id),
 question_id INT NOT NULL REFERENCES aptitude_questions(id),
 mock_id VARCHAR(36) REFERENCES aptitude_mocks(id), request_key VARCHAR(36) NOT NULL,
 selected_index INT CHECK(selected_index BETWEEN 0 AND 3), correct BOOLEAN NOT NULL,
 created_ms BIGINT NOT NULL, UNIQUE(user_id,request_key), UNIQUE(mock_id,question_id)
);
CREATE INDEX idx_aptitude_progress ON aptitude_attempts(user_id,question_id,correct);
CREATE INDEX idx_aptitude_history ON aptitude_attempts(user_id,created_ms);
