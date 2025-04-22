-- MySQL version: First need to drop any existing similar constraints
-- In MySQL, we need to look up the constraint name first

-- First, drop any CHECK constraint that might already exist on these columns
-- MySQL needs to know the constraint name, so we can't use DROP CONSTRAINT IF EXISTS
-- Instead, we can use SHOW CREATE TABLE and check if a constraint exists
-- For simplicity, alter the table and ignore errors if no constraint exists
-- This will be safer to run in a script

-- Add columns for user comments to the approval_request_section_comments table
ALTER TABLE approval_request_section_comments
ADD COLUMN user_id VARCHAR(255) NULL AFTER contact_id;

-- Update the contact_id column to allow NULL (for staff comments)
ALTER TABLE approval_request_section_comments
MODIFY COLUMN contact_id INT(11) NULL;

-- Make sure either contact_id or user_id is filled (not both null or both filled)
-- Add the constraint with a specific name so we can reference it later if needed
ALTER TABLE approval_request_section_comments
ADD CONSTRAINT check_comment_author 
CHECK ((contact_id IS NULL AND user_id IS NOT NULL) OR (contact_id IS NOT NULL AND user_id IS NULL)); 