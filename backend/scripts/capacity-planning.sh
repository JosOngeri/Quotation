#!/bin/bash

# Capacity Planning Script for QMS
# This script analyzes system resources and provides capacity planning recommendations

# Configuration
WARNING_THRESHOLD=70
CRITICAL_THRESHOLD=85
ALERT_EMAIL="${ALERT_EMAIL:-admin@qms.example.com}"

echo "Starting capacity planning analysis at $(date)"

# Function to send alert email
send_alert() {
    local subject=$1
    local message=$2
    
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
}

# Function to check disk usage
check_disk_usage() {
    echo "=== Disk Usage ==="
    df -h | while read line; do
        echo "$line"
        usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
        if [ ! -z "$usage" ] && [ "$usage" -gt "$CRITICAL_THRESHOLD" ]; then
            echo "CRITICAL: Disk usage is ${usage}%"
            send_alert "Critical Disk Usage" "Disk usage has reached ${usage}% on one or more filesystems. Immediate action required."
        elif [ ! -z "$usage" ] && [ "$usage" -gt "$WARNING_THRESHOLD" ]; then
            echo "WARNING: Disk usage is ${usage}%"
        fi
    done
}

# Function to check memory usage
check_memory_usage() {
    echo "=== Memory Usage ==="
    free -h
    memory_usage=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
    memory_usage_int=${memory_usage%.*}
    
    echo "Memory usage: ${memory_usage}%"
    
    if [ "$memory_usage_int" -gt "$CRITICAL_THRESHOLD" ]; then
        echo "CRITICAL: Memory usage is ${memory_usage}%"
        send_alert "Critical Memory Usage" "Memory usage has reached ${memory_usage}%. Immediate action required."
    elif [ "$memory_usage_int" -gt "$WARNING_THRESHOLD" ]; then
        echo "WARNING: Memory usage is ${memory_usage}%"
    fi
}

# Function to check CPU usage
check_cpu_usage() {
    echo "=== CPU Usage ==="
    top -bn1 | head -20
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    cpu_usage_int=${cpu_usage%.*}
    
    echo "CPU usage: ${cpu_usage}%"
    
    if [ "$cpu_usage_int" -gt "$CRITICAL_THRESHOLD" ]; then
        echo "CRITICAL: CPU usage is ${cpu_usage}%"
        send_alert "Critical CPU Usage" "CPU usage has reached ${cpu_usage}%. Immediate action required."
    elif [ "$cpu_usage_int" -gt "$WARNING_THRESHOLD" ]; then
        echo "WARNING: CPU usage is ${cpu_usage}%"
    fi
}

# Function to check database size growth
check_database_growth() {
    echo "=== Database Growth ==="
    
    # This would typically connect to the database and check size trends
    # Example implementation:
    # PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    # SELECT 
    #     pg_database.datname,
    #     pg_size_pretty(pg_database_size(pg_database.datname)) AS size,
    #     pg_database_size(pg_database.datname) AS size_bytes
    # FROM pg_database
    # WHERE pg_database.datname = '$DB_NAME';
    # "
    
    echo "Database growth monitoring requires database connection"
}

# Function to check application metrics
check_application_metrics() {
    echo "=== Application Metrics ==="
    
    # This would typically call the application's performance endpoints
    # Example implementation:
    # curl -s http://localhost:5000/api/v1/performance/metrics
    
    echo "Application metrics monitoring requires API access"
}

# Function to generate capacity report
generate_report() {
    echo "=== Capacity Planning Report ==="
    echo "Generated at: $(date)"
    echo ""
    echo "Recommendations:"
    echo "1. Monitor disk usage trends and plan for storage expansion"
    echo "2. Track memory usage patterns and identify memory leaks"
    echo "3. Analyze CPU usage during peak hours"
    echo "4. Monitor database growth and plan for scaling"
    echo "5. Review application performance metrics regularly"
    echo ""
    echo "Alert thresholds:"
    echo "Warning: ${WARNING_THRESHOLD}%"
    echo "Critical: ${CRITICAL_THRESHOLD}%"
}

# Run all checks
check_disk_usage
check_memory_usage
check_cpu_usage
check_database_growth
check_application_metrics
generate_report

echo "Capacity planning analysis completed at $(date)"