-- Migration: Create geo_scheduled_analyses table
-- This table stores scheduled GEO analysis configurations

CREATE TABLE geo_scheduled_analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  keyword VARCHAR(500) NOT NULL,
  analysis_type ENUM('brand', 'individual') NOT NULL,
  intent_category VARCHAR(100) NOT NULL,
  custom_prompt TEXT NOT NULL,
  selected_engine_ids JSON NOT NULL COMMENT 'Array of engine IDs to use',
  
  -- Schedule configuration
  frequency ENUM('hourly', 'daily', 'weekly', 'monthly') NOT NULL,
  day_of_week INT DEFAULT NULL COMMENT '0=Sunday, 1=Monday, etc. (for weekly schedules)',
  day_of_month INT DEFAULT NULL COMMENT '1-31 (for monthly schedules)',
  time_of_day TIME NOT NULL COMMENT 'Time to run the analysis',
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  
  -- Schedule status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at DATETIME DEFAULT NULL,
  next_run_at DATETIME NOT NULL,
  run_count INT NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for efficient querying
  INDEX idx_user_id (user_id),
  INDEX idx_next_run (next_run_at, is_active),
  INDEX idx_client_keyword (client_name, keyword),
  INDEX idx_frequency (frequency)
);

-- Table to track individual runs of scheduled analyses
CREATE TABLE geo_scheduled_analysis_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scheduled_analysis_id INT NOT NULL,
  analysis_result_id INT DEFAULT NULL COMMENT 'Links to geo_analysis_results table',
  
  -- Run status
  status ENUM('pending', 'running', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  started_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  
  -- Metadata
  scheduled_for DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (scheduled_analysis_id) REFERENCES geo_scheduled_analyses(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_scheduled_analysis (scheduled_analysis_id),
  INDEX idx_status (status),
  INDEX idx_scheduled_for (scheduled_for)
);