-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'staff';

-- Create index on role for faster filtering
CREATE INDEX idx_users_role ON users(role);

-- Update existing admin users (replace with actual admin user IDs or emails as needed)
-- Example: Update a specific user to be an admin
-- UPDATE users SET role = 'admin' WHERE id = 1;
-- Or by email:
-- UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';

-- Add a comment explaining the available roles
-- Roles:
-- - 'admin' - Can view/edit all requests and manage users
-- - 'staff' - Standard user that can only view/edit their own requests
