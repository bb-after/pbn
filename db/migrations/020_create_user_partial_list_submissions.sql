-- Migration: Create user_partial_list_submissions table
-- Created: 2024-01-30
-- Description: Table to track user submissions of partial company lists for enrichment

CREATE TABLE IF NOT EXISTS user_partial_list_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    rows_submitted INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add comment to table
ALTER TABLE user_partial_list_submissions COMMENT = 'Tracks user submissions of CSV data for lead enrichment'; 