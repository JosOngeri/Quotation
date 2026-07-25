#!/bin/bash

# Log Rotation Script for QMS Backend
# This script should be run via cron job for automated log rotation

LOG_DIR="/var/log/qms"
BACKUP_DIR="/var/log/qms/backups"
MAX_AGE_DAYS=30
MAX_SIZE_MB=100

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to rotate logs
rotate_logs() {
    local log_file=$1
    local file_size=$(du -m "$log_file" | cut -f1)
    
    if [ "$file_size" -gt "$MAX_SIZE_MB" ]; then
        echo "Rotating log file: $log_file (Size: ${file_size}MB)"
        
        # Create timestamp for backup
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_file="${BACKUP_DIR}/$(basename $log_file).${timestamp}"
        
        # Copy current log to backup
        cp "$log_file" "$backup_file"
        
        # Clear current log file
        > "$log_file"
        
        # Compress backup
        gzip "$backup_file"
        
        echo "Log rotation completed for: $log_file"
    fi
}

# Rotate application logs
for log_file in "$LOG_DIR"/*.log; do
    if [ -f "$log_file" ]; then
        rotate_logs "$log_file"
    fi
done

# Clean up old log backups
echo "Cleaning up log backups older than $MAX_AGE_DAYS days"
find "$BACKUP_DIR" -name "*.gz" -type f -mtime +$MAX_AGE_DAYS -delete

# Clean up old audit logs from database
echo "Cleaning up old audit logs from database"
# This would typically be done via a database maintenance script
# Example: psql -c "DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';"

echo "Log rotation completed at $(date)"