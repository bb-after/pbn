CREATE TABLE webhook_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country VARCHAR(100) NOT NULL,
  job VARCHAR(100) NOT NULL,
  webhook_url TEXT NOT NULL,
  webhook_response TEXT,
  webhook_status VARCHAR(20),
  apollo_data JSON,
  apollo_total_count INT DEFAULT 0,
  apollo_unlocked_data JSON,
  apollo_emails_unlocked INT DEFAULT 0,
  apollo_credits_used INT DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  webhook_sent_at TIMESTAMP NULL,
  webhook_response_at TIMESTAMP NULL
);

CREATE TABLE webhook_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT,
  response_data JSON,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES webhook_submissions(id) ON DELETE CASCADE
);