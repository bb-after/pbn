-- Migration: Create stillbrook_submissions table
-- Description: Track when users submit screenshot requests through Stillbrook

CREATE TABLE IF NOT EXISTS stillbrook_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  username VARCHAR(255),
  email VARCHAR(255),
  search_query VARCHAR(500) NOT NULL,
  search_type ENUM('exact_url_match', 'keyword_match', 'sentiment_analysis') NOT NULL,
  urls JSON,
  keywords JSON,
  location VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',
  country VARCHAR(10) DEFAULT 'us',
  matched_results_count INT DEFAULT 0,
  status ENUM('success', 'error', 'no_results') NOT NULL,
  error_message TEXT,
  serpapi_search_id VARCHAR(255),
  raw_html_url VARCHAR(500),
  has_highlighted_content BOOLEAN DEFAULT FALSE,
  processing_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_search_type (search_type),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
);