-- Simplest MySQL version that will work in most environments
-- First modify the table structure

-- Add user_id column if it doesn't exist
ALTER TABLE approval_request_section_comments
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) NULL AFTER contact_id;

-- Update the contact_id column to allow NULL (for staff comments)
ALTER TABLE approval_request_section_comments
MODIFY COLUMN contact_id INT(11) NULL;

-- Make sure to only add constraint if it doesn't already exist
-- (MySQL 8.0.16+ supports CHECK constraints)
-- Note: This won't check if the constraint already exists - you would need 
-- to manually remove it first if it does

ALTER TABLE approval_request_section_comments
ADD CONSTRAINT check_comment_author 
CHECK ((contact_id IS NULL AND user_id IS NOT NULL) OR (contact_id IS NOT NULL AND user_id IS NULL)); 