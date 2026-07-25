-- 001_initial_schema.sql
-- Initial database schema for QMS

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('platform_admin', 'tenant_admin', 'estimator', 'procurement', 'project_manager', 'staff_viewer', 'client');
CREATE TYPE quote_status AS ENUM ('draft', 'published', 'accepted', 'rejected', 'superseded');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE cost_event_type AS ENUM ('actual', 'substitution', 'addition');
CREATE TYPE template_status AS ENUM ('draft', 'published', 'retired');

-- Tables

-- Platform Admin (main admin who runs the site)
CREATE TABLE platform_admin (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspaces (tenants)
CREATE TABLE workspace (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  reporting_currency VARCHAR(3) DEFAULT 'KES',
  default_locale VARCHAR(10) DEFAULT 'en-KE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (tenant users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  roles user_role[] NOT NULL DEFAULT ARRAY['staff_viewer']::user_role[],
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, email)
);

-- Clients
CREATE TABLE client (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Users (portal users)
CREATE TABLE client_user (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, email)
);

-- Suppliers
CREATE TABLE supplier (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER DEFAULT 7,
  tax_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE product (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  specification TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, sku)
);

-- Supplier Offers
CREATE TABLE supplier_offer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  unit_amount_minor INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  unit VARCHAR(50) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  minimum_quantity INTEGER DEFAULT 1,
  confidence_score DECIMAL(3,2) DEFAULT 0.50,
  source VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotes
CREATE TABLE quote (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  valid_until DATE,
  status quote_status DEFAULT 'draft',
  current_revision_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote Revisions
CREATE TABLE quote_revision (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quote(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  total_amount_minor INTEGER NOT NULL,
  tax_amount_minor INTEGER NOT NULL,
  subtotal_amount_minor INTEGER NOT NULL,
  published_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quote_id, version)
);

-- Quote Nodes (hierarchical structure)
CREATE TABLE quote_node (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revision_id UUID NOT NULL REFERENCES quote_revision(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES quote_node(id) ON DELETE CASCADE,
  node_type VARCHAR(20) NOT NULL CHECK (node_type IN ('section', 'subsection', 'item')),
  title VARCHAR(255),
  description TEXT,
  ordinal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote Items
CREATE TABLE quote_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL REFERENCES quote_node(id) ON DELETE CASCADE,
  product_id UUID REFERENCES product(id) ON DELETE SET NULL,
  supplier_offer_id UUID REFERENCES supplier_offer(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit VARCHAR(50) NOT NULL,
  unit_cost_minor INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  pricing_rule VARCHAR(50),
  markup_value_minor INTEGER,
  sell_price_minor INTEGER NOT NULL,
  tax_rate DECIMAL(5,4) DEFAULT 0.16,
  tax_amount_minor INTEGER NOT NULL,
  line_total_minor INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects
CREATE TABLE project (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quote(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  status project_status DEFAULT 'planning',
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  quoted_total_minor INTEGER NOT NULL,
  actual_total_minor INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost Events
CREATE TABLE cost_event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  quote_item_id UUID REFERENCES quote_item(id) ON DELETE SET NULL,
  event_type cost_event_type NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit VARCHAR(50) NOT NULL,
  unit_cost_minor INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  total_cost_minor INTEGER NOT NULL,
  supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL,
  invoice_reference VARCHAR(255),
  document_url TEXT,
  reason TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplier Performance
CREATE TABLE supplier_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
  project_id UUID REFERENCES project(id) ON DELETE SET NULL,
  quote_item_id UUID REFERENCES quote_item(id) ON DELETE SET NULL,
  on_time BOOLEAN NOT NULL,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_users_workspace ON users(workspace_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_client_workspace ON client(workspace_id);
CREATE INDEX idx_supplier_workspace ON supplier(workspace_id);
CREATE INDEX idx_product_workspace ON product(workspace_id);
CREATE INDEX idx_quote_workspace ON quote(workspace_id);
CREATE INDEX idx_quote_client ON quote(client_id);
CREATE INDEX idx_project_workspace ON project(workspace_id);
CREATE INDEX idx_project_client ON project(client_id);
CREATE INDEX idx_cost_event_project ON cost_event(project_id);
CREATE INDEX idx_supplier_offer_product ON supplier_offer(product_id);
CREATE INDEX idx_supplier_offer_supplier ON supplier_offer(supplier_id);