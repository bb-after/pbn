CREATE TABLE ramp_sync_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sync_user_id VARCHAR(255), -- Who performed the sync (from session/auth)
  target_user_id VARCHAR(255), -- Whose expense data was synced
  target_user_name VARCHAR(255), -- Name for easier reading
  sync_month VARCHAR(7), -- YYYY-MM format (e.g., "2025-01")
  google_sheet_url TEXT, -- Full Google Sheets URL
  sheet_tab_name VARCHAR(255), -- Specific tab name (e.g., "Expenses - January 2025")
  expense_count INT DEFAULT 0, -- Number of expenses synced
  total_amount DECIMAL(10,2) DEFAULT 0.00, -- Total dollar amount synced
  unique_clients_count INT DEFAULT 0, -- Number of unique clients mapped
  sync_type ENUM('matrix', 'tabular') DEFAULT 'matrix', -- Format used for sync
  status ENUM('started', 'success', 'failed') DEFAULT 'started', -- Sync status
  error_message TEXT, -- Error details if sync failed
  client_mappings JSON, -- Store the client mappings used
  expense_category_mappings JSON, -- Store the expense category mappings used
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When sync started
  completed_at TIMESTAMP NULL, -- When sync finished
  sync_duration_ms INT, -- How long the sync took
  
  INDEX idx_sync_user_id (sync_user_id),
  INDEX idx_target_user_id (target_user_id),
  INDEX idx_sync_month (sync_month),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);