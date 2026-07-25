# VPS Deployment Instructions for quotation.josongeri.co.ke

## Quick Deployment Steps

### 1. SSH into your VPS
```bash
ssh deploy@173.249.17.180
```

### 2. Run the deployment script
```bash
# Create deployment script
nano deploy-qms.sh
```

Paste this content:

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

### 3. Verify Deployment
After the script completes, visit: https://quotation.josongeri.co.ke

## Future Updates

To update the application after making changes:

1. **Push changes to GitHub** (from your local machine):
```bash
cd D:\VIbeCode\Quotation
git add .
git commit -m "Update description"
git push origin main
```

2. **Update on VPS**:
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

### Check PM2 status
```bash
pm2 status
pm2 logs qms-backend
```

### Check Caddy status
```bash
sudo systemctl status caddy
sudo journalctl -u caddy -f
```

### Check database
```bash
sudo -u postgres psql -d qms_production
```

### Restart services
```bash
pm2 restart qms-backend
sudo systemctl reload caddy
```

## Success Criteria

- [ ] Application loads at https://quotation.josongeri.co.ke
- [ ] SSL certificate is valid (automatic with Caddy)
- [ ] Mobile responsiveness works
- [ ] All API endpoints work correctly
- [ ] No errors in logs