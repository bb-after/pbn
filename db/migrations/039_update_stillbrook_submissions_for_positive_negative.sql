-- Migration: Update stillbrook_submissions table to support positive and negative search types
-- Description: Add columns for positive URLs and keywords, update search_type enum

-- Add new columns for positive search parameters
ALTER TABLE stillbrook_submissions 
ADD COLUMN positive_urls JSON AFTER urls,
ADD COLUMN positive_keywords JSON AFTER keywords;

-- Update search_type enum to include new types and combinations
ALTER TABLE stillbrook_submissions 
MODIFY COLUMN search_type VARCHAR(100) NOT NULL;

-- Update the table comment
ALTER TABLE stillbrook_submissions 
COMMENT = 'Track Stillbrook screenshot requests with positive/negative search support';