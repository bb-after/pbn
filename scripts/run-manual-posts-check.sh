#!/bin/bash

# Enhanced Untracked Posts Check - Runs twice daily
# Analyzes WordPress posts from last 7 days and categorizes as manual/automated
# Uses content analysis: hyperlinks = manual, no hyperlinks + 1 image = automated

# Change to the project directory
cd /Users/brettboskoff/pbn

# Load environment variables
export NODE_ENV=production

# Log file for cron output
LOG_FILE="/Users/brettboskoff/pbn/logs/untracked-posts-check.log"

# Create logs directory if it doesn't exist
mkdir -p /Users/brettboskoff/pbn/logs

# Run the enhanced script with import flag and log output
echo "$(date): Starting enhanced untracked posts check (last 7 days)..." >> "$LOG_FILE"
node scripts/findManualSuperstarPosts.js --import >> "$LOG_FILE" 2>&1
echo "$(date): Enhanced untracked posts check completed." >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE" 