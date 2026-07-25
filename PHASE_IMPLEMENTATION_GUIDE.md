# Phase Implementation Guide for QMS Development

This guide provides detailed instructions for agents to implement tasks in each phase of the Quotation Management System development roadmap.

---

## General Guidelines for All Phases

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ running
- Git access to repository
- Appropriate IDE/Text editor
- Terminal/Command line access

### Before Starting Each Phase
1. Review the TODO_LIST.md for the specific phase
2. Check current codebase state
3. Ensure previous phases are completed
4. Create a feature branch if needed
5. Update this guide with any deviations

### Code Standards
- Follow existing code style in the project
- Use TypeScript for all new code
- Add comments for complex logic
- Write tests for all new functions
- Update relevant documentation

### Testing Requirements
- Write unit tests for all new functions
- Test manually in development environment
- Run existing test suite to ensure no regressions
- Document any breaking changes

### Completion Criteria
- All tasks in phase marked as complete
- Code committed to repository
- Tests passing
- Documentation updated
- No critical bugs or issues

---

## PHASE 1: CRITICAL SECURITY & STABILITY (Weeks 1-4)

### Phase Overview
**Goal**: Implement critical security measures and stability improvements to make the application production-ready.
**Duration**: 4 weeks
**Dependencies**: None (can start immediately)

### 1.1 Security - Input Validation

#### Context
The application currently has Zod installed but not used. All API endpoints lack proper input validation, making them vulnerable to injection attacks and invalid data.

#### Implementation Steps

1. **Install and Configure Zod**
```bash
cd backend
npm install zod
```

2. **Create Validation Schemas Directory**
```bash
mkdir -p src/validations
```

3. **Create Base Validation Schema**
```typescript
// src/validations/base.ts
import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const dateSchema = z.string().or(z.date());
export const booleanSchema = z.boolean();
export const numberSchema = z.number();
```

4. **Create Authentication Validation Schemas**
```typescript
// src/validations/auth.ts
import { z } from 'zod';
import { emailSchema, passwordSchema } from './base';

export const platformLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const tenantLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  workspaceSlug: z.string().min(1, 'Workspace slug is required')
});

export const clientLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const passwordResetSchema = z.object({
  email: emailSchema,
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema
});
```

5. **Create Workspace Validation Schemas**
```typescript
// src/validations/workspace.ts
import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(255, 'Name too long'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  reportingCurrency: z.string().length(3).default('KES'),
  defaultLocale: z.string().default('en-KE')
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  reportingCurrency: z.string().length(3).optional(),
  defaultLocale: z.string().optional()
});
```

6. **Create Validation Middleware**
```typescript
// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors
          }
        });
      }
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Validation failed' }
      });
    }
  };
};
```

7. **Apply Validation to Auth Routes**
```typescript
// src/routes/auth.ts
import { validateRequest } from '../middleware/validation';
import { platformLoginSchema, tenantLoginSchema, clientLoginSchema } from '../validations/auth';

router.post('/platform-login', validateRequest(platformLoginSchema), async (req, res) => {
  // existing implementation
});

router.post('/login', validateRequest(tenantLoginSchema), async (req, res) => {
  // existing implementation
});

router.post('/client-login', validateRequest(clientLoginSchema), async (req, res) => {
  // existing implementation
});
```

8. **Add Client-Side Validation**
```typescript
// frontend/src/lib/validation.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const platformLoginSchema = loginSchema;
export const tenantLoginSchema = loginSchema.extend({
  workspaceSlug: z.string().min(1, 'Workspace slug is required')
});
```

9. **Test Validation**
```bash
# Test invalid email
curl -X POST http://localhost:5000/api/v1/auth/platform-login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"test"}'

# Test missing required fields
curl -X POST http://localhost:5000/api/v1/auth/platform-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

#### Files to Modify
- `backend/src/validations/base.ts` (create)
- `backend/src/validations/auth.ts` (create)
- `backend/src/validations/workspace.ts` (create)
- `backend/src/validations/users.ts` (create)
- `backend/src/validations/quotes.ts` (create)
- `backend/src/validations/clients.ts` (create)
- `backend/src/validations/suppliers.ts` (create)
- `backend/src/validations/products.ts` (create)
- `backend/src/validations/projects.ts` (create)
- `backend/src/middleware/validation.ts` (create)
- `backend/src/routes/auth.ts` (modify)
- `backend/src/routes/workspace.ts` (modify)
- `backend/src/routes/users.ts` (modify)
- `backend/src/routes/quotes.ts` (modify)
- `backend/src/routes/clients.ts` (modify)
- `backend/src/routes/suppliers.ts` (modify)
- `backend/src/routes/products.ts` (modify)
- `backend/src/routes/projects.ts` (modify)
- `frontend/src/lib/validation.ts` (create)
- `frontend/src/pages/Login.tsx` (modify)

#### Verification Steps
- [ ] Run existing tests to ensure no regressions
- [ ] Test each endpoint with invalid data
- [ ] Verify proper error messages returned
- [ ] Check client-side validation matches backend
- [ ] Test with valid data to ensure no false positives

---

### 1.2 Security - Rate Limiting

#### Context
API endpoints have no rate limiting, making them vulnerable to abuse and DDoS attacks.

#### Implementation Steps

1. **Install Rate Limiting Package**
```bash
cd backend
npm install express-rate-limit
```

2. **Create Rate Limiting Configuration**
```typescript
// src/config/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 write operations per minute
  message: 'Too many write operations, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});
```

3. **Apply Rate Limiting to Routes**
```typescript
// src/routes/auth.ts
import { authLimiter, passwordResetLimiter } from '../config/rate-limit';

router.post('/platform-login', authLimiter, async (req, res) => {
  // existing implementation
});

router.post('/login', authLimiter, async (req, res) => {
  // existing implementation
});

router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  // existing implementation
});
```

4. **Apply to Main App**
```typescript
// src/index.ts
import { apiLimiter, writeLimiter } from './config/rate-limit';

// Apply to all API routes
app.use('/api/v1', apiLimiter);

// Apply stricter limits to write operations
app.use('/api/v1', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});
```

5. **Add Trusted IP Bypass**
```typescript
// src/config/rate-limit.ts
const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];

export const createLimiter = (options: any) => {
  return rateLimit({
    ...options,
    skip: (req) => {
      const clientIP = req.ip;
      return trustedIPs.includes(clientIP);
    }
  });
};
```

#### Files to Modify
- `backend/src/config/rate-limit.ts` (create)
- `backend/src/routes/auth.ts` (modify)
- `backend/src/index.ts` (modify)
- `backend/.env` (add TRUSTED_IPS)

#### Verification Steps
- [ ] Test rate limiting with rapid requests
- [ ] Verify rate limit headers in responses
- [ ] Test trusted IP bypass functionality
- [ ] Monitor rate limit effectiveness
- [ ] Update API documentation with rate limits

---

### 1.3 Security - Headers & CORS

#### Context
Security headers and CORS configuration are basic and need enhancement for production security.

#### Implementation Steps

1. **Install Helmet.js**
```bash
cd backend
npm install helmet
```

2. **Configure Security Headers**
```typescript
// src/config/security.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: { nosniff: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: ['geolocation', 'notifications']
  }
});
```

3. **Configure CORS Properly**
```typescript
// src/config/cors.ts
import cors from 'cors';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000'
];

export const corsOptions = {
  origin: (origin: string, callback: any) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
```

4. **Add CSRF Protection**
```bash
npm install csurf cookie-parser
```

```typescript
// src/middleware/csrf.ts
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

export const cookieParserMiddleware = cookieParser();
```

5. **Apply to Main App**
```typescript
// src/index.ts
import { securityHeaders } from './config/security';
import { corsOptions } from './config/cors';
import { csrfProtection, cookieParserMiddleware } from './middleware/csrf';

app.use(cookieParserMiddleware);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use('/api/v1', csrfProtection);
```

#### Files to Modify
- `backend/src/config/security.ts` (create)
- `backend/src/config/cors.ts` (create)
- `backend/src/middleware/csrf.ts` (create)
- `backend/src/index.ts` (modify)
- `backend/.env` (add ALLOWED_ORIGINS)

#### Verification Steps
- [ ] Test security headers with security scanner
- [ ] Verify CORS allows only whitelisted origins
- [ ] Test CSRF protection on state-changing operations
- [ ] Check headers with curl or browser dev tools
- [ ] Test with production environment settings

---

### 1.4 Security - Password & Authentication

#### Context
Password requirements are weak, no account lockout, and JWT tokens have no revocation mechanism.

#### Implementation Steps

1. **Implement Password Complexity Requirements**
```typescript
// src/utils/password.ts
import bcrypt from 'bcryptjs';

export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letters');
  if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letters');
  if (!/[0-9]/.test(password)) errors.push('Password must contain numbers');
  if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain special characters');
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12); // cost factor 12
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

2. **Add Password Strength Meter to Frontend**
```typescript
// frontend/src/components/PasswordStrength.tsx
import { useState } from 'react';
import { validatePasswordStrength } from '../utils/password';

export default function PasswordStrength({ password }: { password: string }) {
  const { valid, errors } = validatePassword(password);
  const strength = errors.length === 0 ? 'strong' : errors.length < 3 ? 'medium' : 'weak';
  
  return (
    <div className="password-strength">
      <div className={`strength-meter strength-${strength}`} />
      {errors.length > 0 && (
        <ul className="error-list">
          {errors.map((error, i) => (
            <li key={i} className="error">{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

3. **Implement Account Lockout**
```typescript
// src/middleware/account-lockout.ts
import { Request, Response, NextFunction } from 'express';

const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

export const accountLockout = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  const now = Date.now();
  
  if (loginAttempts.has(email)) {
    const { count, lockUntil } = loginAttempts.get(email)!;
    
    if (now < lockUntil) {
      const remainingTime = Math.ceil((lockUntil - now) / 1000 / 60);
      return res.status(429).json({
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account locked. Try again in ${remainingTime} minutes`
        }
      });
    }
  }
  
  next();
};

export const recordFailedLogin = (email: string) => {
  const now = Date.now();
  const existing = loginAttempts.get(email) || { count: 0, lockUntil: 0 };
  
  existing.count++;
  
  if (existing.count >= 5) {
    existing.lockUntil = now + 30 * 60 * 1000; // 30 minutes
  }
  
  loginAttempts.set(email, existing);
};

export const recordSuccessfulLogin = (email: string) => {
  loginAttempts.delete(email);
};
```

4. **Implement JWT Token Revocation**
```typescript
// src/middleware/token-revocation.ts
import { Request, Response, NextFunction } from 'express';

const tokenBlacklist = new Set<string>();

export const revokeToken = (token: string) => {
  tokenBlacklist.add(token);
};

export const checkTokenRevocation = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token && tokenBlacklist.has(token)) {
    return res.status(401).json({
      error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' }
    });
  }
  
  next();
};
```

5. **Add Password Reset Functionality**
```typescript
// src/routes/auth.ts
import crypto from 'crypto';
import { hashPassword } from '../utils/password';

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const result = await pool.query(
      'SELECT * FROM platform_admin WHERE email = $1 UNION SELECT * FROM users WHERE email = $2 UNION SELECT * FROM client_user WHERE email = $3',
      [email, email, email]
    );
    
    if (result.rows.length === 0) {
      // Don't reveal if user exists
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
    
    // Store reset token (you'll need to add a password_reset_tokens table)
    await pool.query(
      `INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)`,
      [email, resetToken, new Date(resetTokenExpiry)]
    );
    
    // Send email (implement email service)
    // await sendPasswordResetEmail(email, resetToken);
    
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } 
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Validate token
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }
    
    const { email } = result.rows[0];
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password based on user type
    // (you'll need to determine user type and update appropriate table)
    
    // Delete used token
    await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } 
    });
  }
});
```

#### Files to Modify
- `backend/src/utils/password.ts` (create)
- `backend/src/middleware/account-lockout.ts` (create)
- `backend/src/middleware/token-revocation.ts` (create)
- `backend/src/database/schema.sql` (add password_reset_tokens table)
- `backend/src/routes/auth.ts` (modify)
- `frontend/src/components/PasswordStrength.tsx` (create)
- `frontend/src/pages/Login.tsx` (modify)

#### Verification Steps
- [ ] Test password strength validation
- [ ] Test account lockout with failed attempts
- [ ] Test password reset flow end-to-end
- [ ] Test token revocation mechanism
- [ ] Verify session timeout works correctly

---

### 1.5 Frontend - Error Handling

#### Context
React application lacks error boundaries, which means component failures can crash the entire application.

#### Implementation Steps

1. **Create Error Boundary Component**
```typescript
// frontend/src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log error to backend
    this.logErrorToBackend(error, errorInfo);
  }

  logErrorToBackend = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await fetch('/api/v1/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    } catch (loggingError) {
      console.error('Failed to log error to backend:', loggingError);
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
          <button onClick={this.handleReset}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

2. **Create Error Pages**
```typescript
// frontend/src/pages/NotFound.tsx
export default function NotFound() {
  return (
    <div className="error-page">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/dashboard">Return to Dashboard</a>
    </div>
  );
}

// frontend/src/pages/ServerError.tsx
export default function ServerError() {
  return (
    <div className="error-page">
      <h1>500 - Server Error</h1>
      <p>Something went wrong on our end. Please try again later.</p>
      <a href="/dashboard">Return to Dashboard</a>
    </div>
  );
}
```

3. **Add Error Boundary to App**
```typescript
// frontend/src/App.tsx
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import ServerError from './pages/ServerError';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <Routes>
            {/* existing routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

4. **Add Error Logging Endpoint**
```typescript
// backend/src/routes/errors.ts
import { Router } from 'express';
import logger from '../config/logging';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { error, stack, componentStack, url, userAgent } = req.body;
    
    logger.error({
      error,
      stack,
      componentStack,
      url,
      userAgent
    }, 'Frontend error reported');
    
    res.status(200).json({ message: 'Error logged successfully' });
  } catch (error) {
    logger.error('Failed to log error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to log error' } 
    });
  }
});

export default router;
```

#### Files to Modify
- `frontend/src/components/ErrorBoundary.tsx` (create)
- `frontend/src/pages/NotFound.tsx` (create)
- `frontend/src/pages/ServerError.tsx` (create)
- `frontend/src/App.tsx` (modify)
- `backend/src/routes/errors.ts` (create)
- `backend/src/index.ts` (add error route)

#### Verification Steps
- [ ] Test error boundary with intentional errors
- [ ] Verify error logging to backend works
- [ ] Test error pages display correctly
- [ ] Ensure app recovers from errors gracefully
- [ ] Test error boundary with async components

---

### 1.6 Configuration - Environment Validation

#### Context
Application doesn't validate required environment variables at startup, which can lead to runtime errors.

#### Implementation Steps

1. **Create Environment Validation Schema**
```typescript
// backend/src/config/env-validation.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.number().int().positive().default(5000),
  DATABASE_URL: z.string().url('Invalid DATABASE_URL format'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ALLOWED_ORIGINS: z.string().optional(),
  TRUSTED_IPS: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional()
});

export const validateEnv = () => {
  try {
    const validatedEnv = envSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = validateEnv();
```

2. **Update Environment Variables Usage**
```typescript
// backend/src/index.ts
import { env } from './config/env-validation';

const PORT = env.PORT;
const DATABASE_URL = env.DATABASE_URL;
const JWT_SECRET = env.JWT_SECRET;
```

3. **Add .env.example**
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/qms
JWT_SECRET=your-super-secret-jwt-key-change-in-production-at-least-32-chars
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
TRUSTED_IPS=127.0.0.1
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
REDIS_URL=redis://localhost:6379
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
```

#### Files to Modify
- `backend/src/config/env-validation.ts` (create)
- `backend/src/index.ts` (modify)
- `backend/.env.example` (update)
- `backend/.env` (update)

#### Verification Steps
- [ ] Test with missing required variables
- [ ] Test with invalid formats
- [ ] Test with weak JWT_SECRET
- [ ] Verify application fails fast on invalid config
- [ ] Test with valid configuration

---

## PHASE 2: TESTING & QUALITY ASSURANCE (Weeks 5-8)

### Phase Overview
**Goal**: Establish comprehensive testing infrastructure and quality assurance processes.
**Duration**: 4 weeks
**Dependencies**: Phase 1 must be completed

### 2.1 Testing - Unit Tests

#### Context
No unit tests exist in the codebase, making it impossible to verify individual function correctness.

#### Implementation Steps

1. **Set Up Jest for Backend**
```bash
cd backend
npm install --save-dev jest @types/jest ts-jest @types/node ts-node
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

2. **Configure Jest**
```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov']
};
```

3. **Create Test Database Configuration**
```typescript
// backend/src/config/test-db.ts
import { Pool } from 'pg';

export const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/qms_test'
});
```

4. **Write Authentication Unit Tests**
```typescript
// backend/src/__tests__/auth.test.ts
import { hashPassword, comparePassword } from '../utils/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });
    
    it('should compare passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const match = await comparePassword(password, hash);
      expect(match).toBe(true);
      
      const wrongPassword = 'WrongPassword123!';
      const noMatch = await comparePassword(wrongPassword, hash);
      expect(noMatch).toBe(false);
    });
  });
});
```

5. **Write Database Query Tests**
```typescript
// backend/src/__tests__/database.test.ts
import { testPool } from '../config/test-db';

describe('Database Queries', () => {
  beforeAll(async () => {
    // Setup test database
    await testPool.query('CREATE TABLE IF NOT EXISTS test_users (id UUID PRIMARY KEY, name TEXT)');
  });
  
  afterAll(async () => {
    await testPool.query('DROP TABLE IF EXISTS test_users');
    await testPool.end();
  });
  
  describe('User CRUD', () => {
    it('should insert and retrieve a user', async () => {
      const userId = 'test-user-1';
      const name = 'Test User';
      
      await testPool.query(
        'INSERT INTO test_users (id, name) VALUES ($1, $2)',
        [userId, name]
      );
      
      const result = await testPool.query(
        'SELECT * FROM test_users WHERE id = $1',
        [userId]
      );
      
      expect(result.rows[0].name).toBe(name);
    });
  });
});
```

6. **Set Up React Testing Library**
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

7. **Configure Jest for Frontend**
```javascript
// frontend/jest.config.js
const { defaults } = require('jest-config');
const { pathsToModuleNameMapper } = require('ts-jest');

module.exports = {
  ...defaults,
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions),
  setupFiles: ['<rootDir>/src/setupTests.ts'],
  testMatch: ['**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

8. **Write Component Tests**
```typescript
// frontend/src/components/__tests__/Login.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../Login';

describe('Login Component', () => {
  it('renders login form', () => {
    render(<Login />);
    expect(screen.getByText('QMS')).toBeInTheDocument();
    expect(screen.getByText('Quotation Management System')).toBeInTheDocument();
  });
  
  it('allows switching between login types', () => {
    render(<Login />);
    
    const platformAdminTab = screen.getByText('Platform Admin');
    fireEvent.click(platformAdminTab);
    
    expect(screen.getByPlaceholder('your@email.com')).toBeInTheDocument();
  });
  
  it('shows demo credentials based on selected login type', () => {
    render(<Login />);
    
    expect(screen.getByText('admin@qms.platform / Admin@123')).toBeInTheDocument();
  });
});
```

#### Files to Create
- `backend/jest.config.js` (create)
- `backend/src/config/test-db.ts` (create)
- `backend/src/__tests__/auth.test.ts` (create)
- `backend/src/__tests__/database.test.ts` (create)
- `frontend/jest.config.js` (create)
- `frontend/src/setupTests.ts` (create)
- `frontend/src/components/__tests__/Login.test.tsx` (create)
- `frontend/src/pages/__tests__/Dashboard.test.tsx` (create)

#### Verification Steps
- [ ] Run tests with `npm test`
- [ ] Verify coverage thresholds are met
- [ ] Ensure all tests pass in CI environment
- [ ] Review coverage reports

---

### 2.2 Testing - Integration Tests

#### Context
No integration tests exist to verify API endpoints work correctly end-to-end.

#### Implementation Steps

1. **Install Supertest**
```bash
cd backend
npm install --save-dev supertest @types/supertest
```

2. **Create Integration Test Configuration**
```typescript
// backend/src/config/test-setup.ts
import { testPool } from './test-db';
import { app } from '../index';

beforeAll(async () => {
  // Setup test database
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS platform_admin (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL
    )
  `);
  
  // Insert test data
  const testAdmin = {
    id: 'test-admin-1',
    email: 'test-admin@example.com',
    password_hash: await bcrypt.hash('Test@123'),
    name: 'Test Admin'
  };
  
  await testPool.query(
    'INSERT INTO platform_admin (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
    [testAdmin.id, testAdmin.email, testAdmin.password_hash, testAdmin.name]
  );
});

afterAll(async () => {
  // Cleanup test database
  await testPool.query('DROP TABLE IF EXISTS platform_admin');
  await testPool.end();
});
```

3. **Write Authentication Integration Tests**
```typescript
// backend/src/__tests__/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../index';
import { testPool } from '../../config/test-setup';

describe('Authentication Integration', () => {
  it('should successfully login platform admin', async () => {
    const response = await request(app)
      .post('/api/v1/auth/platform-login')
      .send({
        email: 'test-admin@example.com',
        password: 'Test@123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data.user).toHaveProperty('email', 'test-admin@example.com');
  });
  
  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/platform-login')
      .send({
        email: 'test-admin@example.com',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
```

#### Files to Create
- `backend/src/config/test-setup.ts` (create)
- `backend/src/__tests__/integration/auth.test.ts` (create)
- `backend/src/__tests__/integration/workspace.test.ts` (create)
- `backend/src/__tests__/integration/quotes.test.ts` (create)

#### Verification Steps
- [ ] Run integration tests with `npm run test:integration`
- [ ] Test with invalid data to ensure proper error handling
- [ ] Verify database cleanup between tests
- [ ] Test with different user roles and permissions

---

### 2.3 Testing - Frontend Testing

#### Context
No frontend component tests exist to verify UI functionality.

#### Implementation Steps

1. **Write Component Tests for Login**
```typescript
// frontend/src/components/__tests__/Login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../Login';

describe('Login Component', () => {
  it('renders all login type tabs', () => {
    render(<Login />);
    
    expect(screen.getByText('Tenant')).toBeInTheDocument();
    expect(screen.getByText('Platform Admin')).toBeInTheDocument();
    expect(screen.getByText('Client Portal')).toBeInTheDocument();
  });
  
  it('switches to platform admin tab and shows correct credentials', async () => {
    render(<Login />);
    
    const platformAdminTab = screen.getByText('Platform Admin');
    await userEvent.click(platformAdminTab);
    
    expect(screen.getByText('admin@qms.platform / Admin@123')).toBeInTheDocument();
  });
  
  it('shows validation error for empty fields', async () => {
    render(<Login />);
    
    const submitButton = screen.getByText('Sign In');
    await userEvent.click(submitButton);
    
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });
});
```

2. **Write Component Tests for Dashboard**
```typescript
// frontend/src/pages/__tests__/Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';
import { AuthProvider } from '../../contexts/AuthContext';

const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  name: 'Test User',
  roles: ['tenant_admin'],
  userType: 'tenant_user'
};

describe('Dashboard Component', () => {
  it('renders dashboard with user name', () => {
    render(
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    );
    
    expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
  });
  
  it('displays stats cards', () => {
    render(
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    );
    
    expect(screen.getByText(/Active Quotes/)).toBeInTheDocument();
    expect(screen.getByText(/Active Projects/)).toBeInTheDocument();
  });
});
```

#### Files to Create
- `frontend/src/components/__tests__/Login.test.tsx` (create)
- `frontend/src/components/__tests__/ProtectedRoute.test.tsx` (create)
- `frontend/src/pages/__tests__/Dashboard.test.tsx` (create)
- `frontend/src/pages/__tests__/Quotes.test.tsx` (create)

#### Verification Steps
- [ ] Run frontend tests with `npm test`
- [ ] Test with different user roles
- [ ] Verify component behavior with edge cases
- [ ] Check coverage for critical components

---

### 2.4 Quality Assurance - Code Quality

#### Context
No automated code quality tools are configured, leading to inconsistent code style and potential bugs.

#### Implementation Steps

1. **Configure ESLint**
```bash
cd frontend
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks eslint-plugin-react-refresh
```

2. **Create ESLint Configuration**
```javascript
// frontend/.eslintrc.json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react-refresh/recommended"
  ],
  "plugins": ["react-refresh"],
  "rules": {
    "react-refresh/only-export-components": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/rules-of-hooks": "error"
  }
}
```

3. **Configure Prettier**
```bash
npm install --save-dev prettier eslint-config-prettier
```

4. **Create Prettier Configuration**
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

5. **Set Up Husky and lint-staged**
```bash
npm install --save-dev husky lint-staged
npx husky install
```

6. **Configure lint-staged**
```json
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```

7. **Add Pre-commit Hook**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run test"
    }
  }
}
```

#### Files to Create
- `frontend/.eslintrc.json` (create)
- `frontend/.prettierrc` (create)
- `frontend/.lintstagedrc.json` (create)
- `frontend/package.json` (modify)

#### Verification Steps
- [ ] Run `npm run lint` to check for linting issues
- [ ] Run `npm run format` to format code
- [ ] Test pre-commit hook by committing code
- [ ] Verify code style consistency

---

## PHASE 3: DOCUMENTATION & CONFIGURATION (Weeks 9-10)

### Phase Overview
**Goal**: Create comprehensive documentation and improve configuration management.
**Duration**: 2 weeks
**Dependencies**: Phases 1-2 must be completed

### 3.1 Documentation - API Documentation

#### Context
No API documentation exists, making it difficult for developers to understand and use the API.

#### Implementation Steps

1. **Install Swagger/OpenAPI Tools**
```bash
cd backend
npm install swagger-jsdoc swagger-ui-express
```

2. **Create OpenAPI Specification**
```typescript
// backend/src/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUiExpress from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Quotation Management System API',
      version: '1.0.0',
      description: 'API documentation for QMS',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.qms.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: './src/routes/*.ts',
  security: ['bearerAuth']
};

const specs = swaggerJsdoc(options);

export default specs;
```

3. **Add API Documentation Comments**
```typescript
/**
 * @swagger
 * /api/v1/auth/platform-login:
 *   post:
 *     summary: Platform admin login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@qms.platform
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 */
router.post('/platform-login', async (req, res) => {
  // implementation
});
```

4. **Set Up Swagger UI**
```typescript
// backend/src/index.ts
import specs from './swagger';
import swaggerUiExpress from 'swagger-ui-express';

app.use('/api-docs', swaggerUiExpress.serve, swaggerUiExpress.setup(specs));
```

#### Files to Create
- `backend/src/swagger.ts` (create)
- `backend/src/index.ts` (modify)

#### Verification Steps
 [ ] Access Swagger UI at http://localhost:5000/api-docs
 [ ] Verify all endpoints are documented
 [ ] Test API directly from Swagger UI
 [ ] Update documentation as APIs change

---

### 3.2 Documentation - Technical Documentation

#### Context
No technical documentation exists, making it difficult for new developers to understand the system architecture.

#### Implementation Steps

1. **Create Architecture Documentation**
```markdown
# QMS Architecture Documentation

## System Architecture

### High-Level Architecture
- Multi-tenant SaaS application
- Frontend: React with Vite, TypeScript, Tailwind CSS
- Backend: Node.js/Express with TypeScript, PostgreSQL
- Authentication: JWT with role-based access control

### Database Schema
- PostgreSQL with UUID primary keys
- Multi-tenant isolation using workspace_id
- Hierarchical structure for quotes and projects

### API Architecture
- RESTful API with JSON responses
- JWT-based authentication
- Role-based access control middleware
```

2. **Create Deployment Guide**
```markdown
# Deployment Guide

## Development Setup
1. Clone repository
2. Install dependencies (npm install)
3. Set up PostgreSQL
4. Configure environment variables
5. Run migrations
6. Seed database
7. Start development servers

## Production Deployment
1. Build frontend and backend
2. Set up production database
3. Configure environment variables
4. Deploy to hosting platform
5. Configure SSL certificates
6. Set up monitoring
```

#### Files to Create
- `docs/ARCHITECTURE.md` (create)
- `docs/DEPLOYMENT.md` (create)
- `docs/TROUBLESHOOTING.md` (create)
- `docs/CONTRIBUTING.md` (create)

#### Verification Steps
- [ ] Review documentation for accuracy
- [ ] Follow deployment guide in test environment
- [ ] Get peer review from team members
- [ ] Update based on feedback

---

## PHASE 4: DEVOPS & INFRASTRUCTURE (Weeks 11-14)

### Phase Overview
**Goal**: Set up production-ready infrastructure and deployment automation.
**Duration**: 4 weeks
**Dependencies**: Phases 1-3 must be completed

### 4.1 DevOps - Docker Configuration

#### Context
No Docker configuration exists, making deployment difficult and inconsistent across environments.

#### Implementation Steps

1. **Create Backend Dockerfile**
```dockerfile
# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').request('http://localhost:5000/api/health').statusCode === 200" || exit 1"

CMD ["node", "dist/index.js"]
```

2. **Create Frontend Dockerfile**
```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --timeout=3 http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

3. **Create Nginx Configuration**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

4. **Create docker-compose.yml**
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
    networks:
      - qms-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - qms-network

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: qms
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      -  qms-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - qms-network

volumes:
  postgres_data:

networks:
  qms-network:
    driver: bridge
```

5. **Create .dockerignore Files**
```
# Backend .dockerignore
node_modules
npm-debug.log
.env
.env.local
.env.*.local
coverage
dist
.git
Dockerfile
docker-compose.yml
.dockerignore
```

#### Files to Create
- `backend/Dockerfile` (create)
- `frontend/Dockerfile` (create)
- `frontend/nginx.conf` (create)
- `docker-compose.yml` (create)
- `backend/.dockerignore` (create)
- `frontend/.dockerignore` (create)

#### Verification Steps
- [ ] Build Docker images locally
- [ ] Test docker-compose up/down
- [ ] Verify all services start correctly
- [ ] Test health checks
- [ ] Test application through Docker

---

### 4.2 DevOps - CI/CD Pipeline

#### Context
No automated CI/CD pipeline exists, making deployment manual and error-prone.

#### Implementation Steps

1. **Create GitHub Actions Workflow**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies (backend)
      run: |
        cd backend
        npm ci
    
    - name: Run backend tests
      run: |
        cd backend
        npm test
    
    - name: Install dependencies (frontend)
      run: |
        cd frontend
        npm ci
    
    - name: Run frontend tests
      run: |
        cd frontend
        npm test
    
    - name: Run linting
      run: |
        cd backend && npm run lint
        cd frontend && npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18.x
        cache: 'npm'
    
    - name: Build backend
      run: |
        cd backend
        npm run build
    
    - name: Build frontend
      run: |
        cd frontend
        npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-artifacts
        path: |
          backend/dist
          frontend/dist
```

2. **Create Staging Deployment Workflow**
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to staging
      run: |
        # Add your deployment logic here
        echo "Deploying to staging environment"
```

3. **Create Production Deployment Workflow**
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-limited
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: |
        # Add your production deployment logic here
        echo "Deploying to production environment"
```

#### Files to Create
- `.github/workflows/ci.yml` (create)
- `.github/workflows/deploy-staging.yml` (create)
- `.github/workflows/deploy-production.yml` (create)

#### Verification Steps
- [ ] Test CI workflow on pull request
- [ ] Verify tests run correctly
- [ ] Test deployment workflows
- [ ] Verify rollback mechanisms work
- [ ] Add deployment notifications

---

## COMPLETION CHECKLIST FOR EACH PHASE

### Phase 1 Completion Checklist
- [ ] All validation schemas created and applied
- [ ] Rate limiting implemented on all endpoints
- [ ] Security headers configured
- [ ] Password requirements enforced
- [ ] Error boundaries implemented
- [ ] Environment validation added
- [ ] All tests passing
- [ ] Documentation updated

### Phase 2 Completion Checklist
- [ ] Unit tests written for critical functions
- [ ] Integration tests for all API endpoints
- [ ] Frontend component tests created
- [ ] Code quality tools configured
- [ ] Pre-commit hooks working
- [ ] Coverage thresholds met
- [ ] CI/CD pipeline configured

### Phase 3 Completion Checklist
- [ ] API documentation complete
- [ ] Swagger UI accessible
- [ ] Technical documentation created
- [ ] Deployment guide written
- [ ] Troubleshooting guide created
- [ ] User documentation complete
- [ ] All documentation reviewed

### Phase 4 Completion Checklist
- [ ] Docker images built successfully
- [ ] docker-compose.yml working
- [ ] CI/CD pipeline configured
- [ ] Database backups automated
- [ ] Monitoring set up
- [ ] Infrastructure documented
- [ ] Deployment tested

---

## TROUBLESHOOTING COMMON ISSUES

### Database Connection Issues
- **Problem**: "Connection refused" errors
- **Solution**: Check PostgreSQL is running, verify DATABASE_URL format, check firewall settings

### Docker Build Failures
- **Problem**: Docker build fails with "context not found"
- **Solution**: Check .dockerignore file, verify Dockerfile context, check build context

### Test Failures
- **Problem**: Tests fail with "Cannot find module"
- **Solution**: Run `npm install` to ensure dependencies are installed, check test configuration

### CI/CD Failures
- **Problem**: Pipeline fails with "permission denied"
- **Solution**: Check repository permissions, verify secrets are configured, check runner permissions

---

## NOTES FOR AGENTS

### Before Starting Any Phase
1. Read the TODO_LIST.md for the specific phase
2. Review this implementation guide for the phase
3. Check current codebase state
4. Ensure dependencies from previous phases are met
5. Create a feature branch if needed

### During Implementation
1. Follow the step-by-step instructions exactly
2. Test each change incrementally
3. Commit frequently with descriptive messages
4. Update this guide if you find better approaches
5. Document any deviations from the guide

### After Completing Each Phase
1. Update TODO_LIST.md with completed tasks
2. Mark tasks as done in project management
3. Create summary of changes made
4. Update GAP_ANALYSIS.md if gaps are addressed
5. Move to next phase only after current phase is complete

### Error Handling
- If you encounter errors, check the troubleshooting section
- Document any errors you encounter and their solutions
- Update this guide with new troubleshooting steps
- If stuck, escalate to team lead with specific error details

### Code Review
- All code should be reviewed before merging
- Follow existing code style and patterns
- Ensure all tests pass
- Update documentation with any changes
- Consider security implications of changes

### Testing Requirements
- Write tests for all new code
- Run tests before committing
- Ensure no regressions in existing tests
- Update tests as functionality changes
- Aim for 80% code coverage

### Documentation Requirements
- Update relevant documentation with changes
- Add comments for complex logic
- Update API documentation for new endpoints
- Keep architecture diagrams current
- Update deployment guides as needed