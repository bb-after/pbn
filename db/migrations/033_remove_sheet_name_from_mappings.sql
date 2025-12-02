-- Remove redundant sheet_name column since we auto-generate based on dates
ALTER TABLE ramp_user_sheet_mappings DROP COLUMN sheet_name;