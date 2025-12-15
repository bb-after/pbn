-- Migration: Create weather monitoring tables
-- Created: 2025-12-15
-- Description: Tables for monitoring weather alerts in specified cities and tracking sent notifications

-- Table for cities to monitor
CREATE TABLE weather_monitored_cities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    country_code VARCHAR(2) DEFAULT 'US',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    client_id INT NULL,
    slack_channel VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (active),
    INDEX idx_client (client_id),
    UNIQUE KEY unique_city_location (city_name, state_code, latitude, longitude)
) COMMENT = 'Cities to monitor for weather alerts';

-- Table for tracking sent alerts to prevent duplicates
CREATE TABLE weather_alerts_sent (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city_id INT NOT NULL,
    alert_id VARCHAR(255) NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    alert_title VARCHAR(500) NOT NULL,
    alert_description TEXT,
    severity VARCHAR(50),
    expires_at TIMESTAMP NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_date DATE GENERATED ALWAYS AS (sent_at) STORED,
    slack_channel VARCHAR(100) NOT NULL,
    slack_message_ts VARCHAR(50) NULL,
    FOREIGN KEY (city_id) REFERENCES weather_monitored_cities(id) ON DELETE CASCADE,
    INDEX idx_city_alert (city_id, alert_id),
    INDEX idx_sent_date (sent_at),
    INDEX idx_expires (expires_at),
    UNIQUE KEY unique_daily_alert (city_id, alert_id, sent_date)
) COMMENT = 'Tracks weather alerts that have been sent to prevent duplicates';