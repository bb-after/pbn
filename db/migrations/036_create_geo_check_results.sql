-- Create table for storing geo check results from both internal and external usage
CREATE TABLE geo_check_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL COMMENT 'Internal user ID - NULL for external API calls',
  keyword VARCHAR(500) NOT NULL,
  analysis_type ENUM('brand', 'individual') NOT NULL,
  intent_category VARCHAR(100) NOT NULL,
  custom_prompt TEXT NULL,
  selected_engine_ids JSON NOT NULL COMMENT 'Array of engine IDs used',
  results JSON NOT NULL COMMENT 'Full results from AI engines',
  aggregated_insights JSON NOT NULL COMMENT 'Aggregated analysis insights',
  timestamp DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for efficient querying
  INDEX idx_user_id (user_id),
  INDEX idx_keyword (keyword),
  INDEX idx_analysis_type (analysis_type),
  INDEX idx_intent_category (intent_category),
  INDEX idx_timestamp (timestamp),
  INDEX idx_created_at (created_at),
  
  -- Foreign key constraint for internal users
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add index for combined queries
CREATE INDEX idx_geo_check_user_keyword ON geo_check_results(user_id, keyword, timestamp);
CREATE INDEX idx_geo_check_analysis_combo ON geo_check_results(analysis_type, intent_category, timestamp);