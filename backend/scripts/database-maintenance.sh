#!/bin/bash

# Database Maintenance Script for QMS
# This script should be run via cron job for automated database maintenance

# Database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-qms}"
DB_USER="${DB_USER:-postgres}"

# Retention periods
AUDIT_LOG_RETENTION_DAYS=90
EMAIL_LOG_RETENTION_DAYS=30
PASSWORD_RESET_TOKEN_RETENTION_DAYS=7

echo "Starting database maintenance at $(date)"

# Function to execute SQL commands
execute_sql() {
    local sql=$1
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql"
}

# Clean up old audit logs
echo "Cleaning up audit logs older than $AUDIT_LOG_RETENTION_DAYS days"
execute_sql "DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '$AUDIT_LOG_RETENTION_DAYS days';"

# Clean up old email logs
echo "Cleaning up email logs older than $EMAIL_LOG_RETENTION_DAYS days"
execute_sql "DELETE FROM email_logs WHERE created_at < NOW() - INTERVAL '$EMAIL_LOG_RETENTION_DAYS days';"

# Clean up expired password reset tokens
echo "Cleaning up expired password reset tokens"
execute_sql "DELETE FROM password_reset_tokens WHERE expires_at < NOW();"

# Clean up old password reset tokens based on retention
echo "Cleaning up password reset tokens older than $PASSWORD_RESET_TOKEN_RETENTION_DAYS days"
execute_sql "DELETE FROM password_reset_tokens WHERE created_at < NOW() - INTERVAL '$PASSWORD_RESET_TOKEN_RETENTION_DAYS days';"

# Vacuum and analyze database for performance optimization
echo "Running VACUUM ANALYZE on database"
execute_sql "VACUUM ANALYZE;"

# Reindex database for performance
echo "Running REINDEX DATABASE"
execute_sql "REINDEX DATABASE $DB_NAME;"

# Update database statistics
echo "Updating database statistics"
execute_sql "ANALYZE;"

# Check database size
echo "Checking database size"
execute_sql "
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE pg_database.datname = '$DB_NAME';
"

# Check table sizes
echo "Checking table sizes"
execute_sql "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check for long-running queries
echo "Checking for long-running queries"
execute_sql "
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND state != 'idle';
"

echo "Database maintenance completed at $(date)"