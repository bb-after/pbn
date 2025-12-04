-- Migration: Create lead_enricher_processing_status table
-- Created: 2025-12-04
-- Description: Track processing status of Lead Enricher submissions in Clay

CREATE TABLE IF NOT EXISTS lead_enricher_processing_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(36) UNIQUE NOT NULL,
    submission_id INT NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    processed_count INT DEFAULT 0,
    total_count INT NOT NULL,
    error_message TEXT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_request_id (request_id),
    INDEX idx_submission_id (submission_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (submission_id) REFERENCES user_partial_list_submissions(id) ON DELETE CASCADE
);

-- Add comment to table
ALTER TABLE lead_enricher_processing_status COMMENT = 'Tracks real-time processing status of Lead Enricher submissions in Clay';