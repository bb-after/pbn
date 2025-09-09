-- Migration: Create geo analysis results table
-- Created: 2025-01-08
-- Description: Store GEO analysis results with user attribution and filtering capabilities

CREATE TABLE geo_analysis_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  client_name VARCHAR(255) NOT NULL,
  keyword VARCHAR(500) NOT NULL,
  analysis_type ENUM('brand', 'individual') NOT NULL,
  intent_category VARCHAR(100) NOT NULL,
  custom_prompt TEXT,
  
  -- Analysis results JSON
  results JSON NOT NULL,
  aggregated_insights JSON NOT NULL,
  
  -- Metadata
  selected_engine_ids JSON NOT NULL COMMENT 'Array of engine IDs used for this analysis',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes for filtering
CREATE INDEX idx_geo_analysis_client_name ON geo_analysis_results(client_name);
CREATE INDEX idx_geo_analysis_keyword ON geo_analysis_results(keyword);
CREATE INDEX idx_geo_analysis_timestamp ON geo_analysis_results(timestamp);
CREATE INDEX idx_geo_analysis_analysis_type ON geo_analysis_results(analysis_type);
CREATE INDEX idx_geo_analysis_user_id ON geo_analysis_results(user_id);
CREATE INDEX idx_geo_analysis_intent_category ON geo_analysis_results(intent_category);