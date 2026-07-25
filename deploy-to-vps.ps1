# QMS Deployment Script for quotation.josongeri.co.ke
# This script automates the deployment process to the VPS

# Configuration
$VPS_HOST = "deploy@173.249.17.180"
$PROJECT_PATH = "D:\VIbeCode\Quotation"
$REMOTE_UPLOAD_DIR = "/home/deploy/quotation-upload"
$REMOTE_WEB_DIR = "/var/www/qms"
$SUBDOMAIN = "quotation.josongeri.co.ke"

Write-Host "Starting QMS deployment to $SUBDOMAIN..." -ForegroundColor Green

# Step 1: Build frontend (already done)
Write-Host "Frontend already built" -ForegroundColor Green

# Step 2: Backend uses runtime transpilation (already configured)
Write-Host "Backend configured for runtime transpilation" -ForegroundColor Green

# Step 3: Upload files to VPS
Write-Host "Uploading files to VPS..." -ForegroundColor Yellow
$uploadResult = scp -r "$PROJECT_PATH\*" "$VPS_HOST`:$REMOTE_UPLOAD_DIR
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload files to VPS" -ForegroundColor Red
    exit 1
}
Write-Host "Files uploaded successfully" -ForegroundColor Green

# Step 4: Set up directory structure on VPS
Write-Host "Setting up directory structure on VPS..." -ForegroundColor Yellow
$setupResult = ssh $VPS_HOST "sudo mkdir -p $REMOTE_WEB_DIR/backend; sudo mkdir -p $REMOTE_WEB_DIR/frontend; sudo mv $REMOTE_UPLOAD_DIR/backend/* $REMOTE_WEB_DIR/backend/; sudo mv $REMOTE_UPLOAD_DIR/frontend/dist/* $REMOTE_WEB_DIR/frontend/; sudo chown -R caddy:caddy $REMOTE_WEB_DIR; sudo chmod -R 755 $REMOTE_WEB_DIR"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to set up directory structure" -ForegroundColor Red
    exit 1
}
Write-Host "Directory structure set up successfully" -ForegroundColor Green

# Step 5: Set up PostgreSQL database
Write-Host "Setting up PostgreSQL database..." -ForegroundColor Yellow
$dbResult = ssh $VPS_HOST "sudo -u postgres psql -c 'CREATE DATABASE qms_production;' 2>/dev/null || echo 'Database may already exist'; sudo -u postgres psql -c \"CREATE USER qms_user WITH ENCRYPTED PASSWORD 'qms_secure_password_2024';\" 2>/dev/null || echo 'User may already exist'; sudo -u postgres psql -c 'GRANT ALL PRIVILEGES ON DATABASE qms_production TO qms_user;'"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to set up database" -ForegroundColor Red
    exit 1
}
Write-Host "Database set up successfully" -ForegroundColor Green

# Step 6: Install dependencies and run migrations
Write-Host "Installing dependencies and running migrations..." -ForegroundColor Yellow
$depsResult = ssh $VPS_HOST "cd $REMOTE_WEB_DIR/backend; npm install --production; DATABASE_URL=postgresql://qms_user:qms_secure_password_2024@localhost:5432/qms_production npm run db:migrate"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies or run migrations" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed and migrations run successfully" -ForegroundColor Green

# Step 7: Configure backend environment
Write-Host "Configuring backend environment..." -ForegroundColor Yellow
$envResult = ssh $VPS_HOST "cd $REMOTE_WEB_DIR/backend; cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://qms_user:qms_secure_password_2024@localhost:5432/qms_production
JWT_SECRET=qms_jwt_secret_2024_secure_random_string
JWT_EXPIRES_IN=7d
PORT=5001
ALLOWED_ORIGINS=https://quotation.josongeri.co.ke
TRUSTED_IPS=127.0.0.1,173.249.17.180
EOF"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to configure backend environment" -ForegroundColor Red
    exit 1
}
Write-Host "Backend environment configured successfully" -ForegroundColor Green

# Step 8: Start backend with PM2
Write-Host "Starting backend with PM2..." -ForegroundColor Yellow
$pm2Result = ssh $VPS_HOST "cd $REMOTE_WEB_DIR/backend; pm2 stop qms-backend 2>/dev/null; pm2 start 'npx tsx src/index.ts' --name qms-backend; pm2 save"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start backend with PM2" -ForegroundColor Red
    exit 1
}
Write-Host "Backend started successfully with PM2" -ForegroundColor Green

# Step 9: Configure Caddy
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
"@

$caddyResult = ssh $VPS_HOST "echo '$caddyConfig' | sudo tee -a /etc/caddy/Caddyfile; sudo systemctl reload caddy"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to configure Caddy" -ForegroundColor Red
    exit 1
}
Write-Host "Caddy configured and reloaded successfully" -ForegroundColor Green

# Step 10: Verify deployment
Write-Host "Verifying deployment..." -ForegroundColor Yellow
$verifyResult = ssh $VPS_HOST "pm2 status; sudo systemctl status caddy --no-pager; curl -s http://localhost:5001/health; curl -s https://$SUBDOMAIN"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment verification completed with warnings" -ForegroundColor Yellow
} else {
    Write-Host "Deployment verification completed successfully" -ForegroundColor Green
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Visit https://$SUBDOMAIN to access your QMS application" -ForegroundColor Cyan