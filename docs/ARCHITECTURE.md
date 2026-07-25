# QMS Architecture Documentation

## System Architecture

### High-Level Architecture
- **Multi-tenant SaaS application** with workspace-based isolation
- **Frontend**: React with Vite, TypeScript, Tailwind CSS
- **Backend**: Node.js/Express with TypeScript, PostgreSQL
- **Authentication**: JWT with role-based access control
- **Database**: PostgreSQL with UUID primary keys

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                       │
│  React + TypeScript + Tailwind CSS + Vite                   │
│  - SPA with React Router                                   │
│  - State management via Context API                        │
│  - Axios for API communication                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Backend Layer                           │
│  Node.js + Express + TypeScript                            │
│  - RESTful API with JSON responses                         │
│  - JWT-based authentication                                 │
│  - Role-based access control middleware                    │
│  - Input validation with Zod                               │
│  - Rate limiting with express-rate-limit                   │
│  - Security headers with Helmet                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ PostgreSQL
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                           │
│  PostgreSQL 14+                                             │
│  - UUID primary keys                                       │
│  - Multi-tenant isolation using workspace_id               │
│  - Hierarchical structure for quotes and projects           │
│  - Foreign key constraints                                 │
│  - Indexes for performance                                  │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

#### Platform Admin
- Single platform administrator who manages the entire system
- Has access to workspace management and system configuration

#### Workspace (Tenants)
- Multi-tenant isolation using workspace_id
- Each workspace has its own users, clients, suppliers, products, quotes, and projects
- Workspace slug used for URL routing

#### Users
- Tenant users belong to a specific workspace
- Role-based access control: tenant_admin, estimator, procurement, project_manager, staff_viewer
- Email uniqueness enforced per workspace

#### Clients
- Client information for quotations
- Contact details, address, tax ID
- Active/inactive status

#### Suppliers
- Supplier information for procurement
- Contact details, payment terms, lead time
- Performance tracking capabilities

#### Products
- Product catalog with SKU management
- Categories and specifications
- Supplier offers integration

#### Quotes
- Hierarchical structure with sections, subsections, and items
- Revision system for quote versioning
- Status tracking: draft, published, accepted, rejected, superseded
- Currency support for international quotes

#### Projects
- Projects created from quotes
- Cost tracking with actual vs quoted totals
- Status tracking: planning, active, on_hold, completed, cancelled
- Cost events for actual, substitution, and addition tracking

### Database Relationships
```
workspace (1) ----< (N) users
workspace (1) ----< (N) clients
workspace (1) ----< (N) suppliers
workspace (1) ----< (N) products
workspace (1) ----< (N) quotes
workspace (1) ----< (N) projects

client (1) ----< (N) quotes
client (1) ----< (N) projects
client (1) ----< (N) client_users

quote (1) ----< (N) quote_revisions
quote (1) ----< (N) projects

quote_revision (1) ----< (N) quote_nodes
quote_node (1) ----< (N) quote_items

project (1) ----< (N) cost_events
project (1) ----< (N) supplier_performance
```

## API Architecture

### Authentication Flow
1. User authenticates via `/api/v1/auth/platform-login`, `/api/v1/auth/login`, or `/api/v1/auth/client-login`
2. Server validates credentials and issues JWT token
3. Client includes JWT token in Authorization header: `Bearer <token>`
4. Middleware validates token and extracts user information
5. Role-based access control middleware checks permissions

### API Response Format
All API responses follow a consistent format:

**Success Response:**
```json
{
  "data": {
    // Response data
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional details
  }
}
```

### Error Codes
- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error
- `DUPLICATE_ENTRY`: Duplicate data (e.g., email already exists)
- `ACCOUNT_LOCKED`: Account temporarily locked due to failed attempts
- `TOKEN_REVOKED`: JWT token has been revoked

### Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- Password reset: 3 requests per hour
- General API: 100 requests per minute
- Write operations: 30 requests per minute

## Security Architecture

### Authentication
- JWT tokens with configurable expiration
- Token revocation support
- Account lockout after 5 failed login attempts (30-minute lock)
- Password strength validation

### Authorization
- Role-based access control (RBAC)
- Platform admin, tenant admin, estimator, procurement, project manager, staff_viewer roles
- Middleware-based permission checking

### Data Security
- Input validation with Zod schemas
- SQL injection prevention via parameterized queries
- XSS prevention via proper escaping
- CSRF protection (middleware available)
- Security headers via Helmet

### Network Security
- CORS configuration with origin whitelisting
- Rate limiting to prevent abuse
- Trusted IP bypass for rate limiting
- Security headers (HSTS, X-Frame-Options, etc.)

## Frontend Architecture

### Component Structure
```
src/
├── components/        # Reusable UI components
├── contexts/          # React Context for state management
├── lib/              # Utility functions and helpers
├── pages/            # Page components
├── App.tsx           # Main application component
└── main.tsx          # Application entry point
```

### State Management
- React Context API for authentication state
- Local component state for UI interactions
- API calls handled via Axios

### Routing
- React Router for client-side routing
- Protected routes with authentication checks
- Role-based route access control

### Styling
- Tailwind CSS for utility-first styling
- Responsive design principles
- Consistent design system

## Deployment Architecture

### Development Environment
- Frontend: Vite dev server on port 5173
- Backend: Express server on port 5000
- Database: PostgreSQL on port 5432
- Hot module replacement for frontend
- TypeScript compilation for backend

### Production Environment
- Frontend: Static files served via Nginx
- Backend: Node.js process with PM2 or similar
- Database: PostgreSQL with connection pooling
- SSL/TLS for HTTPS
- Reverse proxy for API routing
- Logging and monitoring

### Scalability Considerations
- Horizontal scaling of backend instances
- Database read replicas for query performance
- Redis for session management (optional)
- CDN for static asset delivery
- Load balancing for high availability

## Monitoring and Logging

### Backend Logging
- Pino logger for structured logging
- Log levels: info, warn, error
- Request/response logging
- Error tracking and alerting

### Frontend Logging
- Error boundary for React errors
- Console logging for development
- Error reporting to backend API

### Health Checks
- `/api/health` endpoint for service health
- Database connection checks
- Dependency service checks

## Development Workflow

### Code Organization
- TypeScript for type safety
- Modular architecture with clear separation of concerns
- Consistent naming conventions
- Code comments for complex logic

### Testing Strategy
- Unit tests for utilities and business logic
- Integration tests for API endpoints
- Frontend component tests
- End-to-end tests for critical user flows

### Version Control
- Git for version control
- Feature branches for new development
- Pull request process for code review
- Semantic versioning for releases

## Performance Optimization

### Backend Performance
- Database query optimization with indexes
- Connection pooling for database
- Caching strategies for frequently accessed data
- Async/await for non-blocking operations

### Frontend Performance
- Code splitting with React.lazy()
- Lazy loading of components
- Image optimization
- Bundle size optimization
- Service worker for offline support (future)

## Security Best Practices

### Backend Security
- Never log sensitive information (passwords, tokens)
- Validate all input data
- Use parameterized queries
- Implement proper error handling
- Keep dependencies updated

### Frontend Security
- Validate user input on client side
- Sanitize user-generated content
- Use HTTPS in production
- Implement proper session management
- Secure local storage usage

## Maintenance and Operations

### Database Maintenance
- Regular backups
- Index maintenance
- Query performance monitoring
- Data archiving for old records

### Application Maintenance
- Regular dependency updates
- Security patching
- Performance monitoring
- Log rotation and management

### Disaster Recovery
- Database backup strategy
- Application backup strategy
- Recovery procedures
- Business continuity planning