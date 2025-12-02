-- Create separate table for external API users
CREATE TABLE external_api_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_user_id VARCHAR(255) NOT NULL COMMENT 'External application user identifier',
  external_user_name VARCHAR(255) NOT NULL COMMENT 'Display name from external application',
  application_name VARCHAR(100) NOT NULL COMMENT 'Name of external application',
  api_key_used VARCHAR(255) NOT NULL COMMENT 'API key used for this user',
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  total_requests INT DEFAULT 0 COMMENT 'Total API requests made',
  
  -- Indexes for efficient lookups
  UNIQUE KEY uniq_external_user (external_user_id, application_name),
  INDEX idx_application_name (application_name),
  INDEX idx_api_key (api_key_used),
  INDEX idx_last_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Update geo_analysis_results to reference external users instead of main users
ALTER TABLE geo_analysis_results ADD COLUMN external_api_user_id INT NULL COMMENT 'Reference to external_api_users table';
ALTER TABLE geo_analysis_results ADD COLUMN external_metadata JSON NULL COMMENT 'Metadata for external API requests';

-- Add foreign key constraint
ALTER TABLE geo_analysis_results ADD CONSTRAINT fk_geo_analysis_external_user 
  FOREIGN KEY (external_api_user_id) REFERENCES external_api_users(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX idx_geo_analysis_external_user ON geo_analysis_results(external_api_user_id);
CREATE INDEX idx_geo_analysis_external_metadata ON geo_analysis_results(external_metadata);