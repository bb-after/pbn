-- Add required_approvals field to client_approval_requests table
ALTER TABLE client_approval_requests
ADD COLUMN required_approvals INT DEFAULT NULL AFTER google_doc_id;

-- Update existing records to set required_approvals equal to total_contacts
UPDATE client_approval_requests ar
SET required_approvals = (
  SELECT COUNT(*) 
  FROM approval_request_contacts arc 
  WHERE arc.request_id = ar.request_id
);

-- Add an index to improve query performance
ALTER TABLE client_approval_requests
ADD INDEX idx_required_approvals (required_approvals); 