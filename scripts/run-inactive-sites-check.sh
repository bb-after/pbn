#!/bin/bash

# Superstar Sites Inactivity Monitor
# Checks for superstar sites that haven't had posts in X days and sends Slack alerts
# Can be run manually or via cron

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Set up logging
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/inactive-sites-check.log"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start logging
log "=== Superstar Sites Inactivity Monitor Started ==="
log "Script location: $SCRIPT_DIR"
log "Project directory: $PROJECT_DIR"

# Change to project directory
cd "$PROJECT_DIR"

# Check if .env file exists
if [ ! -f .env ]; then
    log "ERROR: .env file not found in $PROJECT_DIR"
    log "Please ensure you have a .env file with required environment variables"
    exit 1
fi

# Load environment variables
log "Loading environment variables from .env file..."
set -a
source .env
set +a

# Parse command line arguments
DRY_RUN=false
QUIET=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            log "DRY RUN mode enabled - no Slack notifications will be sent"
            ;;
        --quiet)
            QUIET=true
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --dry-run    Run without sending Slack notifications"
            echo "  --quiet      Suppress verbose output"
            echo "  --help       Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  SUPERSTAR_INACTIVITY_THRESHOLD_DAYS  Number of days to consider inactive (default: 7)"
            echo "  SLACK_WEBHOOK_URL                    Slack webhook URL for notifications"
            echo "  SLACK_SUPERSTAR_ALERTS_CHANNEL       Slack channel for alerts (optional)"
            echo ""
            exit 0
            ;;
    esac
done

# Check required environment variables
if [ -z "$DB_HOST_NAME" ] || [ -z "$DB_USER_NAME" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_DATABASE" ]; then
    log "ERROR: Required database environment variables are missing"
    log "Required: DB_HOST_NAME, DB_USER_NAME, DB_PASSWORD, DB_DATABASE"
    exit 1
fi

# Set threshold (default to 7 days if not set)
THRESHOLD_DAYS=${SUPERSTAR_INACTIVITY_THRESHOLD_DAYS:-7}
log "Inactivity threshold: $THRESHOLD_DAYS days"

if [ -z "$SLACK_WEBHOOK_URL" ]; then
    log "WARNING: SLACK_WEBHOOK_URL not set - no Slack notifications will be sent"
fi

# Temporarily disable Slack for dry run
if [ "$DRY_RUN" = true ]; then
    unset SLACK_WEBHOOK_URL
fi

# Run the Node.js script
log "Running inactive sites check..."

if [ "$QUIET" = true ]; then
    node scripts/checkInactiveSuperstarSites.js --quiet >> "$LOG_FILE" 2>&1
    SCRIPT_EXIT_CODE=$?
else
    node scripts/checkInactiveSuperstarSites.js | tee -a "$LOG_FILE"
    SCRIPT_EXIT_CODE=$?
fi

# Check script exit code
if [ $SCRIPT_EXIT_CODE -eq 0 ]; then
    log "✅ Inactive sites check completed successfully"
else
    log "❌ Inactive sites check failed with exit code $SCRIPT_EXIT_CODE"
    exit $SCRIPT_EXIT_CODE
fi

log "=== Superstar Sites Inactivity Monitor Completed ==="

# Add a blank line for readability in log file
echo "" >> "$LOG_FILE" 