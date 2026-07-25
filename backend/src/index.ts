import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import passport from 'passport';
import logger from './config/logging';
import { securityHeaders } from './config/security';
import { corsOptions } from './config/cors';
import { apiLimiter, writeLimiter } from './config/rate-limit';
import { env } from './config/env-validation';
import { specs, swaggerUiExpress } from './swagger';
import { AuditLogger } from './middleware/audit-logging';
import { WebSocketService } from './services/websocket';
import cacheService from './services/cache';
import { performanceMiddleware, performanceMonitor } from './services/performance-monitor';
import { OAuthService } from './services/oauth';
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspace';
import userRoutes from './routes/users';
import quoteRoutes from './routes/quotes';
import clientRoutes from './routes/clients';
import supplierRoutes from './routes/suppliers';
import productRoutes from './routes/products';
import projectRoutes from './routes/projects';
import fileRoutes from './routes/files';
import auditRoutes from './routes/audit';
import performanceRoutes from './routes/performance';
import healthRoutes from './routes/health';
import twoFactorRoutes from './routes/two-factor';
import oauthRoutes from './routes/oauth';
import analyticsRoutes from './routes/analytics';
import aiRoutes from './routes/ai';
import rateLimitDashboardRoutes from './routes/rate-limit-dashboard';
import reportBuilderRoutes from './routes/report-builder';
import workflowRoutes from './routes/workflow';
import errorRoutes from './routes/errors';

dotenv.config();

const app = express();
const PORT = env.PORT;

// Create HTTP server for WebSocket
const server = http.createServer(app);

// Initialize audit logger
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: env.DATABASE_URL
});

const auditLogger = new AuditLogger(pool);

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Initialize cache service
cacheService.connect().catch(err => {
  logger.warn({ error: err }, 'Failed to connect to Redis, caching will be disabled');
});

// Initialize OAuth service
const oauthService = new OAuthService(pool);

// Initialize Passport
app.use(passport.initialize());

// Export WebSocket service for use in other modules
export const getWebSocketService = (): WebSocketService => {
  return webSocketService;
};

// Middleware
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(express.json());

// Apply rate limiting to all API routes
app.use('/api/v1', apiLimiter);

// Apply stricter limits to write operations
app.use('/api/v1', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip }, 'Incoming request');
  next();
});

// Performance monitoring middleware
app.use(performanceMiddleware);

// API Documentation
app.use('/api-docs', swaggerUiExpress.serve, swaggerUiExpress.setup(specs));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', oauthRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/quotes', quoteRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/performance', performanceRoutes);
app.use('/api/v1/two-factor', twoFactorRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/rate-limit', rateLimitDashboardRoutes);
app.use('/api/v1/reports', reportBuilderRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/health', healthRoutes);
app.use('/api/v1/errors', errorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  logger.info('Health check requested');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err.message, stack: err.stack, url: req.url }, 'Unhandled error');
  res.status(500).json({ 
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } 
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn({ url: req.url }, 'Route not found');
  res.status(404).json({ 
    error: { code: 'NOT_FOUND', message: 'Route not found' } 
  });
});

// Start server
server.listen(PORT, () => {
  logger.info({ port: PORT, environment: process.env.NODE_ENV || 'development' }, 'Server started with WebSocket support');
});
