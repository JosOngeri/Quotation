# Quotation.josongeri.co.ke Deployment Plan

## Overview
This plan outlines the deployment of the Quotation Management System (QMS) to the subdomain `quotation.josongeri.co.ke` on the VPS at 173.249.17.180.

## Project Details
- **Subdomain**: quotation.josongeri.co.ke
- **Project Folder**: D:\VIbeCode\Quotation
- **Tech Stack**: Node.js (Backend), React (Frontend), PostgreSQL
- **VPS**: 173.249.17.180
- **Web Server**: Caddy
- **Process Manager**: PM2

## Prerequisites
- [ ] QMS is production-ready (mobile responsiveness implemented)
- [ ] PostgreSQL database configured on VPS
- [ ] Node.js 18+ installed on VPS
- [ ] PM2 installed on VPS
- [ ] Caddy web server configured
- [ ] Environment variables configured for production

## Deployment Steps

### Step 1: Prepare Project Locally
```bash
cd D:\VIbeCode\Quotation

# Build Frontend
cd frontend
npm run build

# Build Backend
cd ../backend
npm run build

# Test production build locally (optional)
npm run start
```

### Step 2: Create Production Environment File
```bash
# Backend .env
cd backend
cp .env.example .env.production
```

Edit `.env.production` with production values:
```env
NODE_ENV=production
DATABASE_URL=postgresql://qms_user:secure_password@localhost:5432/qms_production
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
PORT=5001
ALLOWED_ORIGINS=https://quotation.josongeri.co.ke
TRUSTED_IPS=127.0.0.1,173.249.17.180
```

### Step 3: Upload Files to VPS
```powershell
# Upload entire project to VPS
scp -r "D:\VIbeCode\Quotation" deploy@173.249.17.180:/home/deploy/quotation-upload
```

### Step 4: Set Up Directory Structure on VPS
```bash
# SSH into VPS
ssh deploy@173.249.17.180

# Create directory structure
sudo mkdir -p /var/www/subdomains/quotation
sudo mkdir -p /var/www/qums/backend
sudo mkdir -p /var/www/qms/frontend

# Move files
sudo mv /home/deploy/quotation-upload/backend/* /var/www/qms/backend/
sudo mv /home/deploy/quotation-upload/frontend/dist/* /var/www/qms/frontend/

# Set permissions
sudo chown -R caddy:caddy /var/www/qms
sudo chmod -R 755 /var/www/qms
```

### Step 5: Set Up PostgreSQL Database
```bash
# Create database and user
sudo -u postgres psql
```

```sql
CREATE DATABASE qms_production;
CREATE USER qms_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE qms_production TO qms_user;
\q
```

### Step 6: Run Database Migrations
```bash
cd /var/www/qms/backend

# Install dependencies
npm install --production

# Run migrations
DATABASE_URL=postgresql://qms_user:secure_password@localhost:5432/qms_production npm run db:migrate

# Seed database (optional)
DATABASE_URL=postgresql://qms_user:secure_password@localhost:5432/qms_production npm run db:seed
```

### Step 7: Configure Backend Environment
```bash
cd /var/www/qms/backend

# Create .env file
sudo nano .env
```

Add production environment variables:
```env
NODE_ENV=production
DATABASE_URL=postgresql://qms_user:secure_password@localhost:5432/qms_production
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
PORT=5001
ALLOWED_ORIGINS=https://quotation.josongeri.co.ke
TRUSTED_IPS=127.0.0.1,173.249.17.180
```

### Step 8: Start Backend with PM2
```bash
# Start backend application
cd /var/www/qms/backend
pm2 start dist/index.js --name qms-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 9: Configure Caddy for quotation.josongeri.co.ke
```bash
sudo nano /etc/caddy/Caddyfile
```

Add this configuration block:
```
quotation.josongeri.co.ke {
    # Frontend static files
    root * /var/www/qms/frontend
    file_server
    
    # SPA support - redirect all routes to index.html
    try_files {path} {path}/ /index.html
    
    # API proxy to backend
    handle /api/* {
        reverse_proxy localhost:5001
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # API documentation proxy
    handle /api-docs {
        reverse_proxy localhost:5001
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Health check endpoint
    handle /health {
        reverse_proxy localhost:5001/api/health
    }
    
    # Static file caching
    @static {
        path *.js *.css *.png *.jpg *.jpeg *.gif *.ico *.svg *.woff *.woff2 *.ttf *.eot
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
    
    # Security headers
    header X-Content-Type-Options "nosniff"
    header X-Frame-Options "DENY"
    header X-XSS-Protection "1; mode=block"
    header Referrer-Policy "strict-origin-when-cross-origin"
    
    # Enable automatic HTTPS
    encode gzip
}
```

### Step 10: Reload Caddy
```bash
sudo systemctl reload caddy
```

### Step 11: Verify Deployment
```bash
# Check Caddy status
sudo systemctl status caddy

# Check PM2 status
pm2 status
pm2 logs qms-backend

# Check backend is running
curl http://localhost:5001/health

# Test the subdomain
curl https://quotation.josongeri.co.ke
```

### Step 12: Browser Testing
1. Visit `https://quotation.josongeri.co.ke`
2. Verify SSL certificate is working (automatic with Caddy)
3. Test all functionality:
   - User registration/login
   - Quote creation
   - Mobile responsiveness
   - API endpoints
4. Check browser console for errors

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