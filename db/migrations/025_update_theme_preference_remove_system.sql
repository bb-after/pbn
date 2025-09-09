-- Update theme preference to remove system option and default to light
ALTER TABLE users MODIFY COLUMN theme_preference ENUM('light', 'dark') DEFAULT 'light';

-- Update any existing 'system' values to 'light'
UPDATE users SET theme_preference = 'light' WHERE theme_preference = 'system' OR theme_preference IS NULL;