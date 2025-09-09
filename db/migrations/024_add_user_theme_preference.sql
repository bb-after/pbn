-- Add theme preference field to users table
ALTER TABLE users ADD COLUMN theme_preference ENUM('light', 'dark', 'system') DEFAULT 'system';

-- Add index for better performance
CREATE INDEX idx_users_theme_preference ON users(theme_preference);