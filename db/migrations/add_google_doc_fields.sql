-- Add content_type and google_doc_id fields to client_approval_requests table
ALTER TABLE client_approval_requests
ADD COLUMN content_type VARCHAR(50) DEFAULT 'html',
ADD COLUMN google_doc_id VARCHAR(255) DEFAULT NULL;

-- Add content_type and google_doc_id fields to approval_request_versions table
ALTER TABLE approval_request_versions
ADD COLUMN content_type VARCHAR(50) DEFAULT 'html',
ADD COLUMN google_doc_id VARCHAR(255) DEFAULT NULL;

-- Update existing records to set content_type = 'html' where inline_content is not NULL
UPDATE client_approval_requests
SET content_type = 'html'
WHERE inline_content IS NOT NULL AND content_type IS NULL;

UPDATE approval_request_versions
SET content_type = 'html'
WHERE inline_content IS NOT NULL AND content_type IS NULL; 