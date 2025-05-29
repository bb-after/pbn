-- Create quote_request_tracking table for deduplication
CREATE TABLE quote_request_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hubspot_deal_id VARCHAR(50) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Add unique constraint to prevent duplicate processing
  UNIQUE KEY unique_deal_processing (hubspot_deal_id, processed_at),
  
  -- Add index for quick lookups
  INDEX idx_hubspot_deal_id (hubspot_deal_id),
  INDEX idx_processed_at (processed_at),
  INDEX idx_status (status)
);

-- Add a comment to explain the table purpose
ALTER TABLE quote_request_tracking COMMENT = 'Tracks quote request processing to prevent duplicates and provide audit trail'; 