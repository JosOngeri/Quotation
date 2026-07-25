# QMS Deployment Guide

## Prerequisites

### System Requirements
- Node.js 18+ LTS
- PostgreSQL 14+
- Git
- Nginx (for production)
- PM2 or similar process manager (for production)
- SSL certificate (for production)

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `JWT_EXPIRES_IN`: JWT token expiration time
- `PORT`: Backend server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `ALLOWED_ORIGINS`: CORS allowed origins
- `TRUSTED_IPS`: IPs to bypass rate limiting

## Development Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd Quotation
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Set Up PostgreSQL
```bash
# Create database
createdb qms

# Or use psql
psql -U postgres
CREATE DATABASE qms;
\q
```

### 4. Configure Environment Variables
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your configuration
```

### 5. Run Database Migrations
```bash
cd backend
npm run db:migrate
```

### 6. Seed Database
```bash
npm run db:seed
```

### 7. Start Development Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 8. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

## Production Deployment

### 1. Build Applications
```bash
# Build Backend
cd backend
npm run build

# Build Frontend
cd ../frontend
npm run build
```

### 2. Set Up Production Database
```bash
# Create production database
createdb qms_production

# Run migrations
cd backend
DATABASE_URL=postgresql://user:password@host:5432/qms_production npm run db:migrate

# Seed database (optional)
DATABASE_URL=postgresql://user:password@host:5432/qms_production npm run db:seed
```

### 3. Configure Production Environment
```bash
# Backend .env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/qms_production
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
PORT=5000
ALLOWED_ORIGINS=https://yourdomain.com
TRUSTED_IPS=127.0.0.1,<your-server-ip>
```

### 4. Deploy Backend
```bash
# Using PM2
cd backend
pm2 start dist/index.js --name qms-backend
pm2 save
pm2 startup
```

### 5. Configure Nginx for Frontend
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/qms/frontend/dist;
    index index.html;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }

    # API documentation
    location /api-docs {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6. Deploy Frontend
```bash
# Copy built files to web server
cp -r frontend/dist/* /var/www/qms/frontend/

# Set proper permissions
chown -R www-data:www-data /var/www/qms/frontend
chmod -R 755 /var/www/qms/frontend
```

### 7. Configure SSL Certificate
```bash
# Using Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

### 8. Set Up Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 9. Configure Firewall
```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

## Docker Deployment

### 1. Build Docker Images
```bash
# Build backend
docker build -t qms-backend ./backend

# Build frontend
docker build -t qms-frontend ./frontend
```

### 2. Run with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Docker Compose Configuration
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: qms
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

## CI/CD Pipeline

### GitHub Actions Configuration
```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../frontend && npm install
      - name: Run tests
        run: |
          cd backend && npm test
          cd ../frontend && npm test
      - name: Run lint
        run: |
          cd backend && npm run lint
          cd ../frontend && npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Build applications
        run: |
          cd backend && npm run build
          cd ../frontend && npm run build
      - name: Upload artifacts
        uses: actions/upload-artifact@v2
        with:
          name: build-artifacts
          path: |
            backend/dist
            frontend/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          # Add your deployment script here
          # Example: SSH to server and deploy
```

## Maintenance

### Database Backups
```bash
# Backup
pg_dump -U postgres qms > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres qms < backup_20240101.sql
```

### Log Management
```bash
# View PM2 logs
pm2 logs qms-backend

# Clear logs
pm2 flush

# Log rotation is handled by pm2-logrotate
```

### Updates
```bash
# Pull latest code
git pull origin main

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Run migrations
cd backend && npm run db:migrate

# Rebuild
npm run build
cd ../frontend && npm run build

# Restart services
pm2 restart qms-backend
```

## Troubleshooting

### Common Issues

#### Backend won't start
- Check database connection
- Verify environment variables
- Check port availability
- Review logs: `pm2 logs qms-backend`

#### Frontend shows blank page
- Check build output
- Verify Nginx configuration
- Check browser console for errors
- Verify API connectivity

#### Database connection errors
- Verify PostgreSQL is running
- Check connection string
- Verify database exists
- Check network connectivity

#### Rate limiting issues
- Check trusted IPs configuration
- Verify rate limit settings
- Check for abuse/attacks
- Review logs for patterns

### Performance Issues

#### Slow API responses
- Check database query performance
- Review database indexes
- Check for N+1 queries
- Monitor server resources

#### High memory usage
- Check for memory leaks
- Review connection pooling
- Monitor PM2 memory usage
- Check for large result sets

## Security Checklist

- [ ] Change default passwords
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Regular dependency updates
- [ ] Monitor for security vulnerabilities
- [ ] Implement proper logging
- [ ] Set up intrusion detection
- [ ] Regular security audits
- [ ] Backup and recovery testing

## Monitoring

### Health Checks
```bash
# Backend health
curl https://yourdomain.com/health

# Expected response
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### Metrics to Monitor
- Response times
- Error rates
- Database query performance
- Server resource usage
- User activity
- API usage patterns

### Alerting
- Set up alerts for:
  - High error rates
  - Slow response times
  - Database connection issues
  - High resource usage
  - Security events

## Scaling

### Horizontal Scaling
- Deploy multiple backend instances
- Use load balancer
- Configure session management
- Use database read replicas

### Vertical Scaling
- Increase server resources
- Optimize database configuration
- Tune connection pooling
- Optimize application code

## Backup Strategy

### Database Backups
- Daily automated backups
- Weekly full backups
- Incremental backups
- Off-site backup storage
- Regular restore testing

### Application Backups
- Code repository (Git)
- Configuration files
- Static assets
- Environment variables (secure storage)

## Disaster Recovery

### Recovery Procedures
1. Restore database from backup
2. Deploy application from Git
3. Configure environment variables
4. Start services
5. Verify functionality
6. Monitor for issues

### Business Continuity
- Document recovery procedures
- Test recovery regularly
- Have backup hosting provider
- Communication plan for outages
- Data integrity verification