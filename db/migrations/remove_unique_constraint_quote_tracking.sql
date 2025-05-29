-- Remove unique constraint from quote_request_tracking table
-- This allows the same deal to be processed multiple times (just not within 5-minute windows)
ALTER TABLE quote_request_tracking DROP INDEX unique_deal_processing; 