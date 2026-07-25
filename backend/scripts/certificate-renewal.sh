#!/bin/bash

# Certificate Renewal Automation Script for QMS
# This script should be run via cron job for automated certificate renewal

# Configuration
DOMAIN="${DOMAIN:-qms.example.com}"
EMAIL="${EMAIL:-admin@qms.example.com}"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
BACKUP_DIR="/etc/letsencrypt/backup"
ALERT_EMAIL="${ALERT_EMAIL:-$EMAIL}"
DAYS_BEFORE_EXPIRY=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting certificate renewal check at $(date)"

# Function to send alert email
send_alert() {
    local subject=$1
    local message=$2
    
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
}

# Function to backup current certificate
backup_certificate() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/${DOMAIN}_${timestamp}"
    
    mkdir -p "$backup_path"
    cp -r "$CERT_DIR"/* "$backup_path/"
    
    echo "Certificate backed up to: $backup_path"
}

# Check if certificate exists
if [ ! -d "$CERT_DIR" ]; then
    echo "Certificate directory not found: $CERT_DIR"
    send_alert "Certificate Not Found" "Certificate directory for $DOMAIN does not exist. Please check the configuration."
    exit 1
fi

# Check certificate expiry
echo "Checking certificate expiry for $DOMAIN"
EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_DIR/cert.pem" | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

echo "Certificate expires on: $EXPIRY_DATE"
echo "Days until expiry: $DAYS_UNTIL_EXPIRY"

# Check if certificate needs renewal
if [ "$DAYS_UNTIL_EXPIRY" -lt "$DAYS_BEFORE_EXPIRY" ]; then
    echo "Certificate needs renewal (less than $DAYS_BEFORE_EXPIRY days until expiry)"
    
    # Backup current certificate
    backup_certificate
    
    # Attempt to renew certificate
    echo "Attempting to renew certificate..."
    if certbot renew --cert-name "$DOMAIN" --email "$EMAIL" --quiet; then
        echo "Certificate renewed successfully"
        
        # Reload web server to use new certificate
        systemctl reload nginx || systemctl reload apache2 || echo "Please reload your web server manually"
        
        send_alert "Certificate Renewed Successfully" "Certificate for $DOMAIN has been renewed successfully. New expiry: $(openssl x509 -enddate -noout -in "$CERT_DIR/cert.pem" | cut -d= -f2)"
    else
        echo "Certificate renewal failed"
        send_alert "Certificate Renewal Failed" "Failed to renew certificate for $DOMAIN. Please check the logs and renew manually."
        exit 1
    fi
else
    echo "Certificate does not need renewal yet"
fi

# Clean up old backups (keep last 30 days)
echo "Cleaning up old certificate backups"
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} \;

echo "Certificate renewal check completed at $(date)"