-- Create a table for storing replies to section comments
CREATE TABLE IF NOT EXISTS approval_request_comment_replies (
  reply_id INT AUTO_INCREMENT PRIMARY KEY,
  section_comment_id INT NOT NULL,
  staff_id VARCHAR(255) NULL,
  staff_name VARCHAR(255) NULL,
  contact_id INT NULL,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure either staff_id or contact_id is provided (not both or neither)
  CONSTRAINT check_reply_author CHECK ((staff_id IS NULL AND contact_id IS NOT NULL) OR (staff_id IS NOT NULL AND contact_id IS NULL)),
  
  -- Add foreign key to section comments
  FOREIGN KEY (section_comment_id) REFERENCES approval_request_section_comments(section_comment_id) ON DELETE CASCADE,
  
  -- Add index for looking up replies by comment
  INDEX idx_section_comment_id (section_comment_id)
); 