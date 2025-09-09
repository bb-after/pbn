-- Migration: Add list_type to user_partial_list_submissions table
-- Created: 2024-12-19  
-- Description: Add list_type field to distinguish between company and individual partial lists

ALTER TABLE user_partial_list_submissions 
ADD COLUMN list_type ENUM('company', 'individual') NOT NULL DEFAULT 'company';

-- Add index for list_type for efficient queries
ALTER TABLE user_partial_list_submissions 
ADD INDEX idx_list_type (list_type);

-- Update table comment
ALTER TABLE user_partial_list_submissions 
COMMENT = 'Tracks user submissions of CSV data for lead enrichment - supports both company and individual lists'; 