-- Migration: Add 'hourly' option to frequency enum for testing purposes
-- This allows for easier testing of the scheduled GEO analysis system

ALTER TABLE geo_scheduled_analyses 
MODIFY COLUMN frequency ENUM('hourly', 'daily', 'weekly', 'monthly') NOT NULL;