# Quotation.josongeri.co.ke Deployment Plan

## Overview
This plan outlines the deployment of the Quotation Management System (QMS) to the subdomain `quotation.josongeri.co.ke` on the VPS at 173.249.17.180 using GitHub for deployment.

## Project Details
- **Subdomain**: quotation.josongeri.co.ke
- **GitHub Repository**: https://github.com/JosOngeri/Quotation.git
- **Tech Stack**: Node.js (Backend), React (Frontend), PostgreSQL
- **VPS**: 173.249.17.180
- **Web Server**: Caddy
- **Process Manager**: PM2

## Deployment Method
**GitHub-based deployment** - Clone/pull from GitHub on VPS instead of direct file transfer

## Deployment Steps

### Step 1: Local Preparation (Already Done ✅)
- [x] Build frontend locally
- [x] Configure backend for runtime transpilation
- [x] Create production environment files
- [x] Push changes to GitHub

### Step 2: VPS Deployment
Run the deployment script on your VPS:

```bash
# SSH into VPS
ssh deploy@173.249.17.180

# Create deployment script
nano deploy-qms.sh
```

Paste the following script content:

```bash
#!/bin/bash
# QMS Deployment Script for quotation.josongeri.co.ke

GITHUB_REPO="https://github.com/JosOngeri/Quotation.git"
PROJECT_DIR="/var/www/qms"
SUBDOMAIN="quotation.josongeri.co.ke"
BACKUP_DIR="/home/deploy/backups/qms"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting QMS deployment to $SUBDOMAIN..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup existing deployment if exists
if [ -d "$PROJECT_DIR" ]; then
    echo "Backing up existing deployment..."
    sudo cp -r $PROJECT_DIR $BACKUP_DIR/qms-$TIMESTAMP
fi

# Clone or update repository
if [ -d "$PROJECT_DIR" ]; then
    echo "Updating existing repository..."
    cd $PROJECT_DIR
    sudo git fetch origin main
    sudo git reset --hard origin/main
else
    echo "Cloning repository from GitHub..."
    sudo git clone $GITHUB_REPO $PROJECT_DIR
    cd $PROJECT_DIR
fi

# Set up directory structure
echo "Setting up directory structure..."
sudo mkdir -p $PROJECT_DIR/backend
sudo mkdir -p $PROJECT_DIR/frontend
sudo chown -R caddy:caddy $PROJECT_DIR
sudo chmod -R 755 $PROJECT_DIR

# Set up PostgreSQL database
echo "Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE DATABASE qms_production;" 2>/dev/null || echo "Database may already exist"
sudo -u postgres psql -c "CREATE USER qms_user WITH ENCRYPTED PASSWORD 'qms_secure_password_2024';" 2>/dev/null || echo "User may already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE qms_production TO qms_user;"

# Install backend dependencies and run migrations
echo "Installing backend dependencies and running migrations..."
cd $PROJECT_DIR/backend
sudo npm install --production
DATABASE_URL=postgresql://qms_user:qms_secure_password_2024@localhost:5432/qms_production sudo npm run db:migrate

# Configure backend environment
echo "Configuring backend environment..."
cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://qms_user:qms_secure_password_2024@localhost:5432/qms_production
JWT_SECRET=qms_jwt_secret_2024_secure_random_string
JWT_EXPIRES_IN=7d
PORT=5001
ALLOWED_ORIGINS=https://quotation.josongeri.co.ke
TRUSTED_IPS=127.0.0.1,173.249.17.180
EOF

# Build frontend
echo "Building frontend..."
cd $PROJECT_DIR/frontend
sudo npm install
sudo npm run build

# Start backend with PM2
echo "Starting backend with PM2..."
cd $PROJECT_DIR/backend
pm2 stop qms-backend 2>/dev/null || echo "No existing process"
pm2 start "npx tsx src/index.ts" --name qms-backend
pm2 save

# Configure Caddy
echo "Configuring Caddy for $SUBDOMAIN..."
sudo tee -a /etc/caddy/Caddyfile << 'EOF'

quotation.josongeri.co.ke {
    root * /var/www/qms/frontend/dist
    file_server
    try_files {path} {path}/ /index.html
    
    handle /api/* {
        reverse_proxy localhost:5001
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
    
    handle /api-docs {
        reverse_proxy localhost:5001
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
    
    handle /health {
        reverse_proxy localhost:5001/api/health
    }
    
    @static {
        path *.js *.css *.png *.jpg *.jpeg *.gif *.ico *.svg *.woff *.woff2 *.ttf *.eot
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
    
    header X-Content-Type-Options "nosniff"
    header X-Frame-Options "DENY"
    header X-XSS-Protection "1; mode=block"
    header Referrer-Policy "strict-origin-when-cross-origin"
    
    encode gzip
}
EOF

sudo systemctl reload caddy

# Verify deployment
echo "Verifying deployment..."
pm2 status
sudo systemctl status caddy --no-pager
curl -s http://localhost:5001/health
curl -s https://$SUBDOMAIN

echo "Deployment completed successfully!"
echo "Visit https://$SUBDOMAIN to access your QMS application"
```

```bash
# Make script executable
chmod +x deploy-qms.sh

# Run deployment
./deploy-qms.sh
```

### Step 3: Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check Caddy status
sudo systemctl status caddy

# Test the subdomain
curl https://quotation.josongeri.co.ke
```

## Future Updates

To update the application after making changes:

1. **Local changes**:
```bash
cd D:\VIbeCode\Quotation
# Make changes
git add .
git commit -m "Update description"
git push origin main
```

2. **VPS update**:
```bash
ssh deploy@173.249.17.180
cd /var/www/qms
git pull origin main
cd backend
npm install --production
pm2 restart qms-backend
cd ../frontend
npm install
npm run build
sudo systemctl reload caddy
```

## Troubleshooting

### Backend Not Starting
```bash
pm2 logs qms-backend
pm2 restart qms-backend
```

### Database Issues
```bash
sudo -u postgres psql -d qms_production
# Check database connectivity
```

### Caddy Issues
```bash
sudo journalctl -u caddy -f
sudo systemctl reload caddy
```

## Success Criteria

- [ ] Application loads at https://quotation.josongeri.co.ke
- [ ] SSL certificate is valid (automatic with Caddy)
- [ ] All API endpoints work correctly
- [ ] Mobile responsiveness works on mobile devices
- [ ] Database connections are stable
- [ ] No errors in Caddy or PM2 logs

## Monitoring and Maintenance

### Check Logs
```bash
# Caddy logs
sudo journalctl -u caddy -f

# PM2 logs
pm2 logs qms-backend

# Application logs
pm2 logs --lines 100
```

### Database Backups
```bash
# Create backup script
sudo nano /home/deploy/backup-qms.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U qms_user qms_production > $BACKUP_DIR/qms_db_$DATE.sql

# Keep last 7 days
find $BACKUP_DIR -name "qms_db_*.sql" -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /home/deploy/backup-qms.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /home/deploy/backup-qms.sh
```

### Update Deployment
```bash
# For future updates
cd /var/www/qms/backend
git pull origin main
npm install --production
npm run build
pm2 restart qms-backend

# Update frontend
cd /var/www/qms/frontend
# Copy new build files from local
sudo systemctl reload caddy
```

## Troubleshooting

### Backend Not Starting
```bash
# Check PM2 logs
pm2 logs qms-backend

# Check if port is in use
sudo netstat -tlnp | grep 5001

# Check database connection
psql -U qms_user -d qms_production -c "SELECT 1;"
```

### Frontend Not Loading
```bash
# Check Caddy configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Check file permissions
ls -la /var/www/qms/frontend

# Check Caddy logs
sudo journalctl -u caddy -n 50
```

### Database Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
psql -U postgres -l

# Check connection
psql -U qms_user -d qms_production
```

### SSL Certificate Issues
```bash
# Caddy handles SSL automatically, but check logs
sudo journalctl -u caddy -f | grep "tls"

# Force certificate renewal if needed
sudo systemctl reload caddy
```

## Security Considerations

1. **Firewall Configuration**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

2. **Environment Variables**
- Never commit `.env` files
- Use strong passwords and JWT secrets
- Rotate secrets regularly

3. **Database Security**
- Use strong database password
- Restrict database user permissions
- Regular backups

4. **Application Security**
- Keep dependencies updated
- Monitor for security vulnerabilities
- Use HTTPS only (enforced by Caddy)

## Performance Optimization

1. **Enable Caching**
- Static files cached for 1 year
- API responses cached where appropriate

2. **Database Optimization**
- Add indexes to frequently queried columns
- Optimize slow queries
- Use connection pooling

3. **Frontend Optimization**
- Code splitting already implemented
- Lazy loading for routes
- Image optimization

## Rollback Plan

If deployment fails:
```bash
# Stop current deployment
pm2 stop qms-backend

# Restore previous version
sudo cp -r /home/deploy/backups/qms-previous/* /var/www/qms/

# Restart services
pm2 restart qms-backend
sudo systemctl reload caddy
```

## Success Criteria

- [ ] Application loads at https://quotation.josongeri.co.ke
- [ ] SSL certificate is valid
- [ ] All API endpoints work correctly
- [ ] Mobile responsiveness works on mobile devices
- [ ] Database connections are stable
- [ ] No errors in Caddy or PM2 logs
- [ ] Performance is acceptable
- [ ] Security headers are properly configured

## Next Steps After Deployment

1. **Monitor for 24-48 hours** - Check logs and performance
2. **Set up uptime monitoring** - Use external monitoring service
3. **Configure email notifications** - For errors and alerts
4. **Document any issues** - For future reference
5. **Plan regular maintenance** - Updates, backups, security patches

## Contact Information

- **VPS**: 173.249.17.180
- **Deploy User**: deploy@173.249.17.180
- **Domain**: quotation.josongeri.co.ke
- **GitHub Repository**: https://github.com/JosOngeri/Quotation.git