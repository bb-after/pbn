-- Add google_id to users table for OAuth integration
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL;

-- Add index for google_id lookups
CREATE INDEX idx_users_google_id ON users(google_id);

-- Add unique constraint to prevent duplicate google accounts
ALTER TABLE users ADD CONSTRAINT unique_google_id UNIQUE (google_id);