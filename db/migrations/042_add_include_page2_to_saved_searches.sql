-- Migration: Add include_page2 to saved_stillbrook_searches table
-- Description: Add option to include page 2 of search results

ALTER TABLE saved_stillbrook_searches 
ADD COLUMN include_page2 BOOLEAN DEFAULT FALSE AFTER enable_positive_keywords;