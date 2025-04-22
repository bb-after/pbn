-- Create a table for storing emoji reactions to comments
CREATE TABLE IF NOT EXISTS comment_reactions (
  reaction_id INT NOT NULL AUTO_INCREMENT,
  target_type ENUM('comment', 'section_comment', 'reply') NOT NULL,
  target_id INT NOT NULL,
  user_id VARCHAR(255),
  client_contact_id INT,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reaction_id),
  -- Either user_id or client_contact_id must be set, but not both
  CONSTRAINT chk_reaction_author CHECK (
    (user_id IS NULL AND client_contact_id IS NOT NULL) OR
    (user_id IS NOT NULL AND client_contact_id IS NULL)
  ),
  -- Add indexes for better performance
  INDEX idx_target (target_type, target_id),
  INDEX idx_user_id (user_id),
  INDEX idx_client_contact_id (client_contact_id),
  -- Add uniqueness constraint to prevent multiple same reactions
  UNIQUE KEY unique_reaction (target_type, target_id, user_id, client_contact_id, emoji)
); 