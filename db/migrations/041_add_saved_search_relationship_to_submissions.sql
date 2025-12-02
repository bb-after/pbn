-- Migration: Add saved_stillbrook_search_id to stillbrook_submissions table
-- Description: Track which saved search was used to generate each submission for analytics

ALTER TABLE stillbrook_submissions 
ADD COLUMN saved_stillbrook_search_id INT NULL AFTER search_type,
ADD INDEX idx_saved_stillbrook_search_id (saved_stillbrook_search_id);

-- Add foreign key constraint (optional, but good for data integrity)
-- Note: This assumes the saved_stillbrook_searches table exists
-- ALTER TABLE stillbrook_submissions 
-- ADD CONSTRAINT fk_stillbrook_submissions_saved_search 
-- FOREIGN KEY (saved_stillbrook_search_id) REFERENCES saved_stillbrook_searches(id) ON DELETE SET NULL;