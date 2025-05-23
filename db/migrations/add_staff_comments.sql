-- First drop any existing constraints that might reference the columns we're modifying
ALTER TABLE approval_request_section_comments
DROP CONSTRAINT IF EXISTS check_comment_author;

-- Add columns for user comments to the approval_request_section_comments table
ALTER TABLE approval_request_section_comments
ADD COLUMN user_id VARCHAR(255) NULL AFTER contact_id;

-- Update the contact_id column to allow NULL (for staff comments)
ALTER TABLE approval_request_section_comments
MODIFY COLUMN contact_id INT(11) NULL;

-- Make sure either contact_id or user_id is filled (not both null or both filled)
ALTER TABLE approval_request_section_comments
ADD CONSTRAINT check_comment_author 
CHECK ((contact_id IS NULL AND user_id IS NOT NULL) OR (contact_id IS NOT NULL AND user_id IS NULL)); 