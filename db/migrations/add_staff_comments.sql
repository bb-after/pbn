-- Add columns for staff comments to the approval_request_section_comments table
ALTER TABLE approval_request_section_comments
ADD COLUMN staff_id VARCHAR(255) NULL AFTER contact_id,
ADD COLUMN staff_name VARCHAR(255) NULL AFTER staff_id;

-- Update the contact_id column to allow NULL (for staff comments)
ALTER TABLE approval_request_section_comments
MODIFY COLUMN contact_id INT(11) NULL;

-- Make sure either contact_id or staff_id is filled (not both null or both filled)
ALTER TABLE approval_request_section_comments
ADD CONSTRAINT check_comment_author 
CHECK ((contact_id IS NULL AND staff_id IS NOT NULL) OR (contact_id IS NOT NULL AND staff_id IS NULL)); 