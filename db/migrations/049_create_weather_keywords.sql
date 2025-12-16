-- Migration: Create weather alert keywords table
-- Created: 2025-12-15
-- Description: Table for managing configurable weather alert keywords

CREATE TABLE weather_alert_keywords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (active),
    INDEX idx_keyword (keyword)
) COMMENT = 'Configurable keywords for filtering weather alerts';

-- Insert default winter storm keywords
INSERT INTO weather_alert_keywords (keyword, description) VALUES
('winter storm', 'General winter storm alerts'),
('blizzard', 'Severe winter storms with heavy snow and wind'),
('ice storm', 'Freezing rain causing ice accumulation'),
('freezing rain', 'Precipitation that freezes on contact'),
('heavy snow', 'Significant snow accumulation alerts'),
('snow squall', 'Intense but brief snow showers'),
('winter weather', 'General winter weather advisories'),
('frost', 'Freezing temperatures affecting crops/plants'),
('freeze', 'Below freezing temperature warnings'),
('wind chill', 'Dangerous cold due to wind and temperature'),
('wind', 'High wind advisories and warnings');