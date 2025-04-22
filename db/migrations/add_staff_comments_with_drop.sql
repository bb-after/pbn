-- MySQL version to safely drop constraints by checking if they exist first
-- This approach uses information_schema to find out if the constraint exists

-- First check and drop constraint if it exists
SET @query = (
    SELECT IF(
        EXISTS(
            SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
            WHERE CONSTRAINT_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'approval_request_section_comments' 
            AND CONSTRAINT_NAME = 'check_comment_author'
        ),
        'ALTER TABLE approval_request_section_comments DROP CHECK check_comment_author',
        'SELECT 1'
    )
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Now make the needed alterations

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