-- Create SerpAPI locations table for location typeahead functionality
-- This replaces the need to call SerpAPI locations endpoint for every search

CREATE TABLE IF NOT EXISTS serpapi_locations (
    id VARCHAR(255) PRIMARY KEY,
    google_id INTEGER NOT NULL,
    google_parent_id INTEGER,
    name VARCHAR(255) NOT NULL,
    canonical_name VARCHAR(500) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    reach INTEGER DEFAULT 0,
    gps_longitude DECIMAL(10, 7),
    gps_latitude DECIMAL(10, 7),
    location_keys TEXT, -- pipe-separated keywords for searching
    deprecated_by_google BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create indexes for fast searching
CREATE INDEX idx_locations_name ON serpapi_locations (name);
CREATE INDEX idx_locations_canonical_name ON serpapi_locations (canonical_name);
CREATE INDEX idx_locations_country_code ON serpapi_locations (country_code);
CREATE INDEX idx_locations_target_type ON serpapi_locations (target_type);
CREATE INDEX idx_locations_reach ON serpapi_locations (reach DESC);
CREATE INDEX idx_locations_deprecated ON serpapi_locations (deprecated_by_google);

-- Composite index for common searches
CREATE INDEX idx_locations_search ON serpapi_locations (name, canonical_name, country_code, deprecated_by_google);

-- Full-text search index on name and canonical_name (MySQL/MariaDB specific)
-- Comment out if using PostgreSQL or SQLite
CREATE FULLTEXT INDEX ft_locations_search ON serpapi_locations (name, canonical_name, location_keys);

-- Sample data for testing (comment out after importing real data)
-- INSERT INTO serpapi_locations (
--     id, google_id, google_parent_id, name, canonical_name, 
--     country_code, target_type, reach, gps_longitude, gps_latitude, keys
-- ) VALUES 
-- ('test1', 1013962, 21137, 'Los Angeles', 'Los Angeles,California,United States', 
--  'US', 'City', 18700000, -118.2436849, 34.0522342, 'los|angeles|california|united|states'),
-- ('test2', 1003303, 20154, 'Los Angeles', 'Los Angeles,Bio Bio,Chile', 
--  'CL', 'City', 227000, -72.3612251, -37.4629159, 'los|angeles|bio|bio|chile');