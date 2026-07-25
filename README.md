# Quotation Management System (QMS)

A multi-tenant quotation management system for signage and fabrication businesses.

## Architecture

- **Backend**: Node.js/Express with TypeScript, PostgreSQL
- **Frontend**: React with Vite, TypeScript, Tailwind CSS
- **Authentication**: JWT with role-based access control
- **Multi-tenancy**: Platform admin manages workspaces, tenant admins manage their workspace

## Features

- Platform admin creates and manages workspaces (tenants)
- Tenant admins manage users, clients, suppliers, products
- Estimators create and manage quotes with hierarchical structure
- Project managers track costs and project progress
- Client portal for quote approval and project tracking
- Role-based access control (platform_admin, tenant_admin, estimator, procurement, project_manager, staff_viewer, client)

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Edit `.env` with your database credentials:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/qms
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
```

5. Create PostgreSQL database:
```bash
createdb qms
```

6. Run migrations:
```bash
npm run db:migrate
```

7. Seed database with initial data:
```bash
npm run db:seed
```

8. Start backend server:
```bash
npm run dev
```

Backend will run on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start frontend dev server:
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Seed Data

The seed script creates the following users:

### Platform Admin
- **Email**: admin@qms.platform
- **Password**: Admin@123
- **Role**: Platform Administrator (manages all workspaces)

### Tenant Admin (Joscards Workspace)
- **Email**: admin@joscards.example
- **Password**: Tenant@123
- **Role**: Tenant Administrator (manages joscards workspace)
- **Workspace Slug**: joscards

### Estimator
- **Email**: jane@joscards.example
- **Password**: Estimator@123
- **Role**: Estimator (creates and edits quotes)

### Procurement / Project Manager
- **Email**: john@joscards.example
- **Password**: Estimator@123
- **Role**: Procurement, Project Manager

### Client Portal User
- **Email**: sarah@acme.example
- **Password**: Client@123
- **Role**: Client (accesses client portal)

## Login Instructions

### Platform Admin Login
1. Go to http://localhost:5173/login
2. Select "Platform Admin" tab
3. Email: admin@qms.platform
4. Password: Admin@123
5. You'll be redirected to the platform admin dashboard

### Tenant Login
1. Go to http://localhost:5173/login
2. Select "Tenant" tab
3. Workspace Slug: joscards
4. Email: admin@joscards.example
5. Password: Tenant@123
6. You'll be redirected to the tenant dashboard

### Client Portal Login
1. Go to http://localhost:5173/login
2. Select "Client Portal" tab
3. Email: sarah@acme.example
4. Password: Client@123
5. You'll be redirected to the client portal

## Database Schema

Key tables:
- `platform_admin` - Platform administrators
- `workspace` - Tenant workspaces
- `users` - Tenant users with roles
- `client` - Client organizations
- `client_user` - Client portal users
- `supplier` - Supplier information
- `product` - Product catalog
- `supplier_offer` - Supplier pricing
- `quote` - Quotations
- `quote_revision` - Quote versions
- `quote_node` - Hierarchical quote structure
- `quote_item` - Quote line items
- `project` - Projects
- `cost_event` - Actual costs, substitutions, additions
- `template` - Form and output templates
- `audit_event` - Audit trail

## API Endpoints

### Authentication
- `POST /api/v1/auth/platform-login` - Platform admin login
- `POST /api/v1/auth/login` - Tenant login
- `POST /api/v1/auth/client-login` - Client portal login

### Workspaces
- `GET /api/v1/workspaces` - List workspaces (platform admin)
- `POST /api/v1/workspaces` - Create workspace (platform admin)
- `GET /api/v1/workspaces/current` - Get current workspace (tenant)
- `PUT /api/v1/workspaces/current` - Update workspace (tenant admin)

### Users
- `GET /api/v1/users` - List users (tenant)
- `POST /api/v1/users` - Invite user (tenant admin)
- `PUT /api/v1/users/:id` - Update user (tenant admin)
- `POST /api/v1/users/:id/reset-password` - Reset password (tenant admin)

### Quotes
- `GET /api/v1/quotes` - List quotes (tenant)
- `POST /api/v1/quotes` - Create quote (estimator, tenant admin)
- `GET /api/v1/quotes/:id` - Get quote (tenant)
- `PUT /api/v1/quotes/:id` - Update quote (estimator, tenant admin)
- `DELETE /api/v1/quotes/:id` - Delete quote (tenant admin)

## Development

### Backend
```bash
cd backend
npm run dev          # Start dev server with hot reload
npm run build        # Build TypeScript
npm start            # Start production server
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
```

### Frontend
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Security Notes

- Change all default passwords in production
- Use strong JWT secrets in production
- Enable HTTPS in production
- Implement rate limiting
- Add input validation and sanitization
- Enable PostgreSQL SSL connections
- Regular security audits

## Next Steps

- Implement hierarchical quote editor with drag-and-drop
- Add supplier offer comparison with best value algorithm
- Build project cost tracking with variance analysis
- Create client portal with quote approval workflow
- Add PDF generation for quotes
- Implement SMS notifications
- Add template builder for forms and outputs
- Build reports dashboard with charts
- Add audit log viewer
- Implement data import/export
