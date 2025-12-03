-- Migration: Create saved_stillbrook_searches table
-- Description: Store saved Stillbrook searches for future reuse

CREATE TABLE IF NOT EXISTS saved_stillbrook_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_id INT NOT NULL,
  search_name VARCHAR(255) NOT NULL,
  search_query VARCHAR(500) NOT NULL,
  search_type VARCHAR(100),
  
  -- Search parameters
  urls JSON,
  keywords JSON,
  positive_urls JSON,
  positive_keywords JSON,
  location VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',
  country VARCHAR(10) DEFAULT 'us',
  google_domain VARCHAR(100) DEFAULT 'google.com',
  
  -- Highlight options
  enable_negative_urls BOOLEAN DEFAULT FALSE,
  enable_negative_sentiment BOOLEAN DEFAULT FALSE,
  enable_negative_keywords BOOLEAN DEFAULT FALSE,
  enable_positive_urls BOOLEAN DEFAULT FALSE,
  enable_positive_sentiment BOOLEAN DEFAULT FALSE,
  enable_positive_keywords BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_client_id (client_id),
  INDEX idx_user_client (user_id, client_id),
  INDEX idx_created_at (created_at),
  
  -- Foreign key constraints
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate search names per user
  UNIQUE KEY unique_user_search_name (user_id, search_name)
);