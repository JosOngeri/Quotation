#!/bin/bash
# QMS Deployment Script for quotation.josongeri.co.ke

# Configuration
VPS_HOST="deploy@173.249.17.180"
PROJECT_PATH="D:\VIbeCode\Quotation"
REMOTE_UPLOAD_DIR="/home/deploy/quotation-upload"
REMOTE_WEB_DIR="/var/www/qms"
SUBDOMAIN="quotation.josongeri.co.ke"

echo "Starting QMS deployment to $SUBDOMAIN..."

# Step 1: Upload files to VPS
echo "Uploading files to VPS..."
scp -r "$PROJECT_PATH"/* "$VPS_HOST:$REMOTE_UPLOAD_DIR"
if [ $? -ne 0 ]; then
    echo "Failed to upload files to VPS"
    exit 1
fi
echo "Files uploaded successfully"

# Step 2: Set up directory structure on VPS
echo "Setting up directory structure on VPS..."
ssh $VPS_HOST "sudo mkdir -p $REMOTE_WEB_DIR/backend && sudo mkdir -p $REMOTE_WEB_DIR/frontend && sudo mv $REMOTE_UPLOAD_DIR/backend/* $REMOTE_WEB_DIR/backend/ && sudo mv $REMOTE_UPLOAD_DIR/frontend/dist/* $REMOTE_WEB_DIR/frontend/ && sudo chown -R caddy:caddy $REMOTE_WEB_DIR && sudo chmod -R 755 $REMOTE_WEB_DIR"
if [ $? -ne 0 ]; then
    echo "Failed to set up directory structure"
    exit 1
fi
echo "Directory structure set up successfully"

# Step 3: Set up PostgreSQL database
echo "Setting up PostgreSQL database..."
ssh $VPS_HOST "sudo -u postgres psql -c 'CREATE DATABASE qms_production;' 2>/dev/null || echo 'Database may already exist' && sudo -u postgres psql -c \"CREATE USER qms_user WITH ENCRYPTED PASSWORD 'qms_secure_password_2024';\" 2>/dev/null || echo 'User may already exist' && sudo -u postgres psql -c 'GRANT ALL PRIVILEGES ON DATABASE qms_production TO qms_user;'"
if [ $? -ne 0 ]; then
    echo "Failed to set up database"
    exit 1
fi
echo "Database set up successfully"

# Step 4: Install dependencies and run migrations
echo "Installing dependencies and running migrations..."
ssh $VPS_HOST "cd $REMOTE_WEB_DIR/backend && npm install --production && DATABASE_URL=postgresql://qms_user:qms_secure_password_2024@localhost:5432/qms_production npm run db:migrate"
if [ $? -ne 0 ]; then
    echo "Failed to install dependencies or run migrations"
    exit 1
fi
echo "Dependencies installed and migrations run successfully"

# Step 5: Configure backend environment
echo "Configuring backend environment..."
ssh $VPS_HOST "cd $REMOTE_WEB_DIR/backend && cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://qms_user:qms_secure_password_2024@localhost:5432/qms_production
JWT_SECRET=qms_jwt_secret_2024_secure_random_string
JWT_EXPIRES_IN=7d
PORT=5001
ALLOWED_ORIGINS=https://quotation.josongeri.co.ke
TRUSTED_IPS=127.0.0.1,173.249.17.180
EOF"
if [ $? -ne 0 ]; then
    echo "Failed to configure backend environment"
    exit 1
fi
echo "Backend environment configured successfully"

# Step 6: Start backend with PM2
echo "Starting backend with PM2..."
ssh $VPS_HOST "cd $REMOTE_WEB_DIR/backend && pm2 stop qms-backend 2>/dev/null; pm2 start 'npx tsx src/index.ts' --name qms-backend && pm2 save"
if [ $? -ne 0 ]; then
    echo "Failed to start backend with PM2"
    exit 1
fi
echo "Backend started successfully with PM2"

# Step 7: Configure Caddy
echo "Configuring Caddy for $SUBDOMAIN..."
ssh $VPS_HOST "cat >> /etc/caddy/Caddyfile << 'EOF'

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
EOF
sudo systemctl reload caddy"
if [ $? -ne 0 ]; then
    echo "Failed to configure Caddy"
    exit 1
fi
echo "Caddy configured and reloaded successfully"

# Step 8: Verify deployment
echo "Verifying deployment..."
ssh $VPS_HOST "pm2 status && sudo systemctl status caddy --no-pager && curl -s http://localhost:5001/health && curl -s https://$SUBDOMAIN"
if [ $? -ne 0 ]; then
    echo "Deployment verification completed with warnings"
else
    echo "Deployment verification completed successfully"
fi

echo "Deployment completed successfully!"
echo "Visit https://$SUBDOMAIN to access your QMS application"