# QMS Troubleshooting Guide

## Common Issues and Solutions

### Authentication Issues

#### Login Fails with "Invalid Credentials"
**Problem**: User cannot login despite correct credentials.

**Solutions**:
1. Check database connection
2. Verify user exists in database
3. Check if user is active (`is_active = true`)
4. Verify password hash matches
5. Check JWT_SECRET configuration
6. Review authentication logs

**Debug Steps**:
```bash
# Check database
psql -U postgres -d qms -c "SELECT * FROM users WHERE email = 'user@example.com';"

# Check logs
pm2 logs qms-backend --lines 50
```

#### Token Expired Errors
**Problem**: API calls return 401 Unauthorized with token errors.

**Solutions**:
1. Check JWT_EXPIRES_IN configuration
2. Verify system time is correct
3. Check token generation logic
4. Review token validation middleware

**Debug Steps**:
```bash
# Decode JWT token (use jwt.io or similar)
# Check expiration time
# Verify JWT_SECRET matches between generation and validation
```

#### Account Locked Out
**Problem**: User sees "Account locked" message.

**Solutions**:
1. Wait for lockout period (30 minutes)
2. Reset account lockout in database
3. Check for brute force attacks
4. Review failed login attempts

**Debug Steps**:
```bash
# Check login attempts (if stored in database)
# Review rate limiting logs
# Check for suspicious activity
```

### Database Issues

#### Connection Refused
**Problem**: Application cannot connect to PostgreSQL.

**Solutions**:
1. Verify PostgreSQL is running
2. Check connection string
3. Verify database exists
4. Check network connectivity
5. Verify firewall rules

**Debug Steps**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U postgres -d qms -c "SELECT 1;"

# Check connection string
echo $DATABASE_URL
```

#### Migration Fails
**Problem**: Database migration throws errors.

**Solutions**:
1. Check migration file syntax
2. Verify database permissions
3. Check for existing tables
4. Review migration logs
5. Manually apply migration SQL

**Debug Steps**:
```bash
# Check migration status
npm run db:migrate

# Apply migration manually
psql -U postgres -d qms -f src/database/migrations/001_initial_schema.sql
```

#### Slow Queries
**Problem**: Database queries are slow.

**Solutions**:
1. Check for missing indexes
2. Optimize query structure
3. Analyze query execution plan
4. Consider connection pooling
5. Review database size

**Debug Steps**:
```bash
# Analyze slow queries
psql -U postgres -d qms -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check indexes
psql -U postgres -d qms -c "\d+ table_name"
```

### API Issues

#### 404 Not Found
**Problem**: API endpoints return 404 errors.

**Solutions**:
1. Verify route registration
2. Check URL path matching
3. Review route ordering
4. Check HTTP method
5. Verify middleware configuration

**Debug Steps**:
```bash
# Check registered routes
curl -X GET http://localhost:5000/api/health

# Review route definitions
# Check middleware chain
```

#### 500 Internal Server Error
**Problem**: API returns 500 errors.

**Solutions**:
1. Check application logs
2. Review error stack traces
3. Check database connectivity
4. Verify environment variables
5. Test in development environment

**Debug Steps**:
```bash
# Check logs
pm2 logs qms-backend --lines 100

# Check environment variables
pm2 env qms-backend

# Test locally
npm run dev
```

#### Rate Limiting Errors
**Problem**: API returns 429 Too Many Requests.

**Solutions**:
1. Check rate limit configuration
2. Verify trusted IP settings
3. Review request patterns
4. Adjust rate limits if needed
5. Check for abuse/attacks

**Debug Steps**:
```bash
# Check rate limit configuration
# Review logs for rate limit triggers
# Monitor request patterns
```

### Frontend Issues

#### Blank Page
**Problem**: Frontend shows blank page.

**Solutions**:
1. Check browser console for errors
2. Verify build completed successfully
3. Check API connectivity
4. Review routing configuration
5. Check for JavaScript errors

**Debug Steps**:
```bash
# Check build output
npm run build

# Check browser console
# Open developer tools (F12)
# Check Console tab for errors
```

#### API Calls Failing
**Problem**: Frontend cannot communicate with backend.

**Solutions**:
1. Check API base URL configuration
2. Verify CORS configuration
3. Check network connectivity
4. Review authentication headers
5. Test API directly

**Debug Steps**:
```bash
# Test API directly
curl http://localhost:5000/api/health

# Check CORS configuration
# Review browser network tab
# Check authentication headers
```

#### State Not Updating
**Problem**: React state not updating after API calls.

**Solutions**:
1. Check state management logic
2. Verify component re-renders
3. Check for stale closures
4. Review useEffect dependencies
5. Check for race conditions

**Debug Steps**:
```bash
# Add console.log statements
# Use React DevTools
# Check component lifecycle
# Review state updates
```

### Performance Issues

#### Slow Page Load
**Problem**: Frontend takes long to load.

**Solutions**:
1. Check bundle size
2. Enable code splitting
3. Optimize images
4. Enable caching
5. Review network requests

**Debug Steps**:
```bash
# Analyze bundle size
npm run build -- --report

# Check network tab in browser
# Review bundle size
# Check for large dependencies
```

#### High Memory Usage
**Problem**: Application uses excessive memory.

**Solutions**:
1. Check for memory leaks
2. Review connection pooling
3. Optimize database queries
4. Check for large result sets
5. Monitor garbage collection

**Debug Steps**:
```bash
# Check memory usage
pm2 monit

# Check for memory leaks
# Review heap snapshots
# Monitor over time
```

### Security Issues

#### CORS Errors
**Problem**: Browser shows CORS errors.

**Solutions**:
1. Check CORS configuration
2. Verify allowed origins
3. Check credentials setting
4. Review preflight requests
5. Check for mixed content

**Debug Steps**:
```bash
# Check CORS configuration
# Review browser console
# Test with curl
curl -H "Origin: http://localhost:5173" http://localhost:5000/api/health
```

#### CSRF Issues
**Problem**: CSRF protection blocking requests.

**Solutions**:
1. Check CSRF token generation
2. Verify token validation
3. Check token expiration
4. Review middleware configuration
5. Test with disabled CSRF

**Debug Steps**:
```bash
# Check CSRF token in headers
# Review token generation logic
# Test with CSRF disabled
```

### Development Issues

#### Hot Module Replacement Not Working
**Problem**: Changes not reflecting in development.

**Solutions**:
1. Restart dev server
2. Check file watchers
3. Verify Vite configuration
4. Check for file system issues
5. Review browser cache

**Debug Steps**:
```bash
# Restart dev server
npm run dev

# Clear browser cache
# Check Vite configuration
```

#### TypeScript Compilation Errors
**Problem**: TypeScript compilation fails.

**Solutions**:
1. Check TypeScript version
2. Review tsconfig.json
3. Check for type errors
4. Verify dependencies
5. Clean build artifacts

**Debug Steps**:
```bash
# Check TypeScript version
npm list typescript

# Clean build
rm -rf dist node_modules/.cache
npm run build
```

### Deployment Issues

#### Build Fails
**Problem**: Production build fails.

**Solutions**:
1. Check build configuration
2. Verify environment variables
3. Review build logs
4. Check for missing dependencies
5. Test in staging first

**Debug Steps**:
```bash
# Check build logs
npm run build

# Check environment variables
# Review build configuration
# Test locally
```

#### Service Won't Start
**Problem**: Service fails to start in production.

**Solutions**:
1. Check process manager logs
2. Verify environment variables
3. Check port availability
4. Review startup scripts
5. Check dependencies

**Debug Steps**:
```bash
# Check PM2 logs
pm2 logs qms-backend

# Check environment
pm2 env qms-backend

# Test manually
node dist/index.js
```

## Diagnostic Tools

### Backend Diagnostics
```bash
# Check service status
pm2 status

# View logs
pm2 logs qms-backend

# Monitor resources
pm2 monit

# Check environment
pm2 env qms-backend

# Restart service
pm2 restart qms-backend
```

### Database Diagnostics
```bash
# Check database size
psql -U postgres -d qms -c "SELECT pg_size_pretty(pg_database_size('qms'));"

# Check table sizes
psql -U postgres -d qms -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Check active connections
psql -U postgres -d qms -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql -U postgres -d qms -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

### Frontend Diagnostics
```bash
# Check build size
npm run build -- --report

# Analyze bundle
npx vite-bundle-visualizer

# Check dependencies
npm list

# Check for vulnerabilities
npm audit
```

## Getting Help

### Logs and Debugging
1. Enable debug logging in development
2. Check browser console for frontend errors
3. Review server logs for backend errors
4. Use network tab for API debugging
5. Check database logs for query issues

### Support Channels
- Review documentation
- Check GitHub issues
- Contact development team
- Review community forums
- Check Stack Overflow

### Reporting Issues
When reporting issues, include:
1. Error messages and stack traces
2. Steps to reproduce
3. Environment details (OS, Node version, etc.)
4. Configuration files (redacted)
5. Logs and screenshots
6. Expected vs actual behavior

## Prevention

### Regular Maintenance
- Keep dependencies updated
- Monitor system resources
- Review logs regularly
- Test backups
- Update documentation

### Monitoring
- Set up health checks
- Monitor error rates
- Track performance metrics
- Review security logs
- Monitor database performance

### Testing
- Run tests before deployment
- Test in staging environment
- Perform load testing
- Test backup and recovery
- Verify monitoring setup