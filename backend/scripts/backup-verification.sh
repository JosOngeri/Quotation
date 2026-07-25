#!/bin/bash

# Backup Verification Script for QMS
# This script verifies the integrity of backups and sends alerts if issues are found

# Configuration
BACKUP_DIR="/var/backups/qms"
ALERT_EMAIL="${ALERT_EMAIL:-admin@qms.example.com}"
MIN_BACKUP_SIZE_MB=10
MAX_BACKUP_AGE_HOURS=24

echo "Starting backup verification at $(date)"

# Function to send alert email
send_alert() {
    local subject=$1
    local message=$2
    
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
}

# Function to verify backup integrity
verify_backup() {
    local backup_file=$1
    local file_size=$(du -m "$backup_file" | cut -f1)
    local file_age_hours=$(( ($(date +%s) - $(stat -c %Y "$backup_file")) / 3600 ))
    
    echo "Checking backup: $backup_file"
    echo "Size: ${file_size}MB, Age: ${file_age_hours}h"
    
    # Check if backup is too small
    if [ "$file_size" -lt "$MIN_BACKUP_SIZE_MB" ]; then
        echo "ERROR: Backup is too small (${file_size}MB < ${MIN_BACKUP_SIZE_MB}MB)"
        send_alert "Backup Too Small" "Backup file $backup_file is too small (${file_size}MB). Expected minimum: ${MIN_BACKUP_SIZE_MB}MB."
        return 1
    fi
    
    # Check if backup is too old
    if [ "$file_age_hours" -gt "$MAX_BACKUP_AGE_HOURS" ]; then
        echo "ERROR: Backup is too old (${file_age_hours}h > ${MAX_BACKUP_AGE_HOURS}h)"
        send_alert "Backup Too Old" "Backup file $backup_file is too old (${file_age_hours}h). Maximum age: ${MAX_BACKUP_AGE_HOURS}h."
        return 1
    fi
    
    # Try to restore backup to verify integrity
    echo "Testing backup integrity..."
    if [[ "$backup_file" == *.sql.gz ]]; then
        # Test SQL backup
        if gunzip -t "$backup_file"; then
            echo "SQL backup integrity verified"
            return 0
        else
            echo "ERROR: SQL backup integrity check failed"
            send_alert "Backup Integrity Failed" "Backup file $backup_file failed integrity check."
            return 1
        fi
    elif [[ "$backup_file" == *.tar.gz ]]; then
        # Test tar backup
        if tar -tzf "$backup_file" > /dev/null; then
            echo "Tar backup integrity verified"
            return 0
        else
            echo "ERROR: Tar backup integrity check failed"
            send_alert "Backup Integrity Failed" "Backup file $backup_file failed integrity check."
            return 1
        fi
    else
        echo "WARNING: Unknown backup format, skipping integrity check"
        return 0
    fi
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory not found: $BACKUP_DIR"
    send_alert "Backup Directory Not Found" "Backup directory $BACKUP_DIR does not exist."
    exit 1
fi

# Verify all backups
backup_count=0
failed_count=0

for backup_file in "$BACKUP_DIR"/*; do
    if [ -f "$backup_file" ]; then
        backup_count=$((backup_count + 1))
        if ! verify_backup "$backup_file"; then
            failed_count=$((failed_count + 1))
        fi
    fi
done

# Summary
echo "Backup verification completed"
echo "Total backups checked: $backup_count"
echo "Failed backups: $failed_count"

if [ "$backup_count" -eq 0 ]; then
    echo "ERROR: No backups found"
    send_alert "No Backups Found" "No backup files found in $BACKUP_DIR."
    exit 1
fi

if [ "$failed_count" -gt 0 ]; then
    echo "ERROR: Some backups failed verification"
    send_alert "Backup Verification Failed" "$failed_count out of $backup_count backups failed verification."
    exit 1
else
    echo "All backups verified successfully"
fi

echo "Backup verification completed at $(date)"