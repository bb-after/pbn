-- Create table for mapping Ramp users to Google Sheets
CREATE TABLE ramp_user_sheet_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ramp_user_id VARCHAR(255) NOT NULL,
    ramp_user_name VARCHAR(255) NOT NULL,
    ramp_user_email VARCHAR(255) NOT NULL,
    google_sheet_url TEXT NOT NULL,
    sheet_name VARCHAR(255) NOT NULL DEFAULT 'Sheet1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_ramp_user (ramp_user_id),
    INDEX idx_ramp_user_id (ramp_user_id),
    INDEX idx_ramp_user_email (ramp_user_email)
);