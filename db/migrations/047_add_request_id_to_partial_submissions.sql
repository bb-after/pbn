-- Migration: Add request_id to user_partial_list_submissions table
-- Created: 2025-12-04
-- Description: Add request_id field to track submissions for Clay status callbacks

ALTER TABLE user_partial_list_submissions 
ADD COLUMN request_id VARCHAR(36) UNIQUE NULL AFTER id,
ADD INDEX idx_request_id (request_id);

-- Add comment
ALTER TABLE user_partial_list_submissions COMMENT = 'Tracks user submissions of CSV data for lead enrichment with Clay request tracking';