CREATE TABLE linkedin_connections (
  user_id VARCHAR(36) PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  attempt_id VARCHAR(36),
  subject VARCHAR(255),
  display_name VARCHAR(300),
  connected_at TIMESTAMP
);
CREATE TABLE linkedin_oauth_states (
  state_hash VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  session_hash VARCHAR(64) NOT NULL,
  nonce VARCHAR(128) NOT NULL,
  attempt_id VARCHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX linkedin_oauth_expiry ON linkedin_oauth_states(expires_at);
CREATE TABLE linkedin_reports (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  profile_url VARCHAR(500) NOT NULL,
  target_role VARCHAR(160) NOT NULL,
  result_json TEXT NOT NULL,
  consent_version VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX linkedin_reports_owner ON linkedin_reports(user_id, created_at);
