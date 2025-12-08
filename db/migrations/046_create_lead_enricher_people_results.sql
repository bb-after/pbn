-- Migration: Create lead_enricher_people_results table
-- Created: 2025-12-04
-- Description: Track individual people found for each company in Lead Enricher

CREATE TABLE IF NOT EXISTS lead_enricher_people_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_row_number INT NOT NULL,
    
    -- Person details from Clay
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    email VARCHAR(255),
    linkedin_url VARCHAR(500),
    job_title VARCHAR(200),
    department VARCHAR(100),
    
    -- Status tracking
    found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    clay_person_id VARCHAR(100), -- Clay's internal ID for deduplication
    
    INDEX idx_request_id (request_id),
    INDEX idx_company_name (company_name),
    INDEX idx_company_row (company_row_number),
    INDEX idx_email (email),
    INDEX idx_found_at (found_at),
    
    FOREIGN KEY (request_id) REFERENCES lead_enricher_processing_status(request_id) ON DELETE CASCADE
);

-- Add people tracking columns to existing status table
ALTER TABLE lead_enricher_processing_status 
ADD COLUMN companies_completed INT DEFAULT 0 AFTER processed_count,
ADD COLUMN people_search_status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started' AFTER status,
ADD COLUMN total_people_found INT DEFAULT 0,
ADD COLUMN companies_with_people INT DEFAULT 0,
ADD COLUMN companies_without_people INT DEFAULT 0;

-- Add comment to new table
ALTER TABLE lead_enricher_people_results COMMENT = 'Individual people found during Lead Enricher company enrichment process';