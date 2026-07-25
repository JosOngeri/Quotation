# Simple QMS Deployment Script for quotation.josongeri.co.ke
# This script automates the deployment process to the VPS

# Configuration
$VPS_HOST = "deploy@173.249.17.180"
$PROJECT_PATH = "D:\VIbeCode\Quotation"
$REMOTE_UPLOAD_DIR = "/home/deploy/quotation-upload"
$REMOTE_WEB_DIR = "/var/www/qms"
$SUBDOMAIN = "quotation.josongeri.co.ke"

Write-Host "Starting QMS deployment to $SUBDOMAIN..." -ForegroundColor Green

# Step 1: Upload files to VPS
Write-Host "Uploading files to VPS..." -ForegroundColor Yellow
scp -r "$PROJECT_PATH\*" "$VPS_HOST`:$REMOTE_UPLOAD_DIR"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload files to VPS" -ForegroundColor Red
    exit 1
}
Write-Host "Files uploaded successfully" -ForegroundColor Green

# Step 2: Set up directory structure on VPS
Write-Host "Setting up directory structure on VPS..." -ForegroundColor Yellow
ssh $VPS_HOST "sudo mkdir -p $REMOTE_WEB_DIR/backend"
ssh $VPS_HOST "sudo mkdir -p $REMOTE_WEB_DIR/frontend"
ssh $VPS_HOST "sudo mv $REMOTE_UPLOAD_DIR/backend/* $REMOTE_WEB_DIR/backend/"
ssh $VPS_HOST "sudo mv $REMOTE_UPLOAD_DIR/frontend/dist/* $REMOTE_WEB_DIR/frontend/"
ssh $VPS_HOST "sudo chown -R caddy:caddy $REMOTE_WEB_DIR"
ssh $VPS_HOST "sudo chmod -R 755 $REMOTE_WEB_DIR"
Write-Host "Directory structure set up successfully" -ForegroundColor Green

# Step 3: Set up PostgreSQL database
Write-Host "Setting up PostgreSQL database..." -ForegroundColor Yellow
ssh $VPS_HOST "sudo -u postgres psql -c 'CREATE DATABASE qms_production;'"
ssh $VPS_HOST "sudo -u postgres psql -c \"CREATE USER qms_user WITH ENCRYPTED PASSWORD 'qms_secure_password_2024';\""
ssh $VPS_HOST "sudo -u postgres psql -c 'GRANT ALL PRIVILEGES ON DATABASE qms_production TO qms_user;'"
Write-Host "Database set up successfully" -ForegroundColor Green

# Step 4: Install dependencies and run migrations
Write-Host "Installing dependencies and running migrations..." -ForegroundColor Yellow
ssh $VPS_HOST "cd $REMOTE_WEB_DIR/backend; npm install --production"
ssh $VPS_HOST "cd $REMOTE_WEB_DIR/backend; DATABASE_URL=postgresql://qms_user:qms_secure_password_2024@localhost:5432/qms_production npm run db:migrate"
Write-Host "Dependencies installed and migrations run successfully" -ForegroundColor Green

# Step 5: Configure backend environment
Write-Host "Configuring backend environment..." -ForegroundColor Yellow
$envContent = @"
NODE_ENV=production
DATABASE_URL=postgresql://qms_user:qms_secure_password_2024@localhost:5432/qms_production
JWT_SECRET=qms_jwt_secret_2024_secure_random_string
JWT_EXPIRES_IN=7d
PORT=5001
ALLOWED_ORIGINS=https://quotation.josongeri.co.ke
TRUSTED_IPS=127.0.0.1,173.249.17.180
"@
$envContent | ssh $VPS_HOST "cat > $REMOTE_WEB_DIR/backend/.env"
Write-Host "Backend environment configured successfully" -ForegroundColor Green

# Step 6: Start backend with PM2
Write-Host "Starting backend with PM2..." -ForegroundColor Yellow
ssh $VPS_HOST "cd $REMOTE_WEB_DIR/backend; pm2 stop qms-backend"
ssh $VPS_HOST "cd $REMOTE_WEB_DIR/backend; pm2 start 'npx tsx src/index.ts' --name qms-backend"
ssh $VPS_HOST "pm2 save"
Write-Host "Backend started successfully with PM2" -ForegroundColor Green

# Step 7: Configure Caddy
Write-Host "Configuring Caddy for $SUBDOMAIN..." -ForegroundColor Yellow
$caddyConfig = @"

quotation.josongeri.co.ke {
    root * /var/www/qms/frontend
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
    
    header X-Content-Type-Options "nosniff"
    header X-Frame-Options "DENY"
    header X-XSS-Protection "1; mode=block"
    header Referrer-Policy "strict-origin-when-cross-origin"
    
    encode gzip
}
"@
$caddyConfig | ssh $VPS_HOST "cat >> /etc/caddy/Caddyfile"
ssh $VPS_HOST "sudo systemctl reload caddy"
Write-Host "Caddy configured and reloaded successfully" -ForegroundColor Green

# Step 8: Verify deployment
Write-Host "Verifying deployment..." -ForegroundColor Yellow
ssh $VPS_HOST "pm2 status"
ssh $VPS_HOST "sudo systemctl status caddy --no-pager"
ssh $VPS_HOST "curl -s http://localhost:5001/health"
ssh $VPS_HOST "curl -s https://$SUBDOMAIN"
Write-Host "Deployment verification completed" -ForegroundColor Green

Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Visit https://$SUBDOMAIN to access your QMS application" -ForegroundColor Cyan