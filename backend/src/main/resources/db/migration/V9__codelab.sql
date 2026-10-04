CREATE TABLE code_questions (
 id INT PRIMARY KEY, slug VARCHAR(100) NOT NULL UNIQUE, title VARCHAR(160) NOT NULL,
 topic VARCHAR(50) NOT NULL, difficulty VARCHAR(10) NOT NULL CHECK(difficulty IN ('Easy','Medium','Hard')),
 statement_json TEXT NOT NULL, checker VARCHAR(30) NOT NULL DEFAULT 'TOKENS',
 content_version INT NOT NULL DEFAULT 1
);
CREATE INDEX idx_code_question_filters ON code_questions(topic,difficulty,id);
CREATE TABLE code_languages (
 id VARCHAR(10) PRIMARY KEY, name VARCHAR(20) NOT NULL
);
INSERT INTO code_languages VALUES ('java','Java'),('cpp','C++'),('python','Python');
CREATE TABLE code_solutions (
 question_id INT NOT NULL REFERENCES code_questions(id), language_id VARCHAR(10) NOT NULL REFERENCES code_languages(id),
 starter TEXT NOT NULL, solution TEXT NOT NULL, PRIMARY KEY(question_id,language_id)
);
CREATE TABLE code_test_cases (
 question_id INT NOT NULL REFERENCES code_questions(id), position INT NOT NULL,
 sample BOOLEAN NOT NULL, input_text TEXT NOT NULL, expected_text TEXT NOT NULL,
 PRIMARY KEY(question_id,position)
);
CREATE TABLE code_drafts (
 user_id VARCHAR(36) NOT NULL REFERENCES app_users(id), question_id INT NOT NULL REFERENCES code_questions(id),
 language_id VARCHAR(10) NOT NULL REFERENCES code_languages(id), source_code TEXT NOT NULL,
 revision INT NOT NULL DEFAULT 1, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,question_id,language_id)
);
CREATE TABLE code_submissions (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL REFERENCES app_users(id),
 question_id INT NOT NULL REFERENCES code_questions(id), language_id VARCHAR(10) NOT NULL REFERENCES code_languages(id),
 request_key VARCHAR(36) NOT NULL, mode VARCHAR(10) NOT NULL CHECK(mode IN ('RUN','SUBMIT')),
 source_code TEXT NOT NULL, status VARCHAR(30) NOT NULL, passed INT NOT NULL DEFAULT 0,
 total INT NOT NULL, result_json TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finished_at TIMESTAMP, UNIQUE(user_id,request_key)
);
CREATE INDEX idx_code_submissions_owner ON code_submissions(user_id,created_at);
CREATE INDEX idx_code_submissions_progress ON code_submissions(user_id,question_id,mode,status);
