# 25. Database Schema

This appendix defines the canonical SQL DDL for the Quotation Management System. The baseline targets SQLite (`better-sqlite3`) for local or single-instance deployments and is kept compatible with managed PostgreSQL for production scaling.

## Conventions

- Primary keys use `TEXT` UUIDs (v7 or random UUID) to avoid sequence contention during migration.
- Monetary amounts are stored as `INTEGER` minor units (e.g. `12500` for KES 125.00). Quantities and percentages use `INTEGER` scaled values or `REAL` only where user-facing precision is acceptable.
- All business tables carry `workspace_id` and are scoped by it.
- `created_at` / `updated_at` are `TEXT` ISO-8601 in SQLite and `TIMESTAMPTZ` in Postgres.
- Soft deletion is preferred to hard deletion where audit/compliance matters.

## Core tables

```sql
CREATE TABLE workspace (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  reporting_currency TEXT NOT NULL DEFAULT 'KES',
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, email)
);

CREATE TABLE role_membership (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','estimator','procurement','project_manager','staff_viewer','support')),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, workspace_id, role)
);

CREATE TABLE client (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE client_user (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (client_id, email)
);
```

## Quotation hierarchy

```sql
CREATE TABLE quote (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES client(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','accepted','rejected','superseded')),
  current_revision_id TEXT,
  template_version_id TEXT,
  created_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE quote_revision (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quote(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','superseded')),
  client_total_minor INTEGER NOT NULL DEFAULT 0,
  client_tax_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  valid_until TEXT,
  published_at TEXT,
  published_by TEXT REFERENCES "user"(id),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (quote_id, version)
);

CREATE TABLE quote_node (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES quote_revision(id) ON DELETE CASCADE,
  parent_node_id TEXT REFERENCES quote_node(id),
  node_type TEXT NOT NULL CHECK (node_type IN ('section','subsection','item')),
  title TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE quote_item (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL UNIQUE REFERENCES quote_node(id) ON DELETE CASCADE,
  revision_id TEXT NOT NULL REFERENCES quote_revision(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  selected_offer_id TEXT,
  cost_snapshot_minor INTEGER,
  markup_rule TEXT CHECK (markup_rule IN ('percentage','fixed','margin_target','tier')),
  markup_value_minor INTEGER,
  sell_price_minor INTEGER NOT NULL DEFAULT 0,
  tax_rate_minor INTEGER NOT NULL DEFAULT 0,
  tax_amount_minor INTEGER NOT NULL DEFAULT 0,
  line_total_minor INTEGER NOT NULL DEFAULT 0,
  override_reason TEXT,
  override_by TEXT REFERENCES "user"(id),
  price_status TEXT NOT NULL DEFAULT 'ok' CHECK (price_status IN ('ok','missing','review','overridden')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Suppliers, products, and offers

```sql
CREATE TABLE supplier (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE product (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  category TEXT,
  specification TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, sku)
);

CREATE TABLE supplier_offer (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  unit_amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  unit TEXT,
  min_quantity REAL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  source TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE supplier_performance (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
  project_id TEXT,
  quote_item_id TEXT,
  on_time INTEGER,
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  notes TEXT,
  recorded_by TEXT NOT NULL REFERENCES "user"(id),
  recorded_at TEXT NOT NULL
);
```

## Projects and cost tracking

```sql
CREATE TABLE project (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES client(id),
  accepted_revision_id TEXT NOT NULL REFERENCES quote_revision(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  start_date TEXT,
  target_end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE cost_event (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  quote_item_id TEXT REFERENCES quote_item(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('actual','substitution','addition')),
  supplier_id TEXT REFERENCES supplier(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_amount_minor INTEGER NOT NULL,
  total_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  invoice_ref TEXT,
  document_id TEXT,
  reason TEXT,
  approved_by TEXT REFERENCES "user"(id),
  approved_at TEXT,
  recorded_by TEXT NOT NULL REFERENCES "user"(id),
  recorded_at TEXT NOT NULL
);
```

## Customization templates

```sql
CREATE TABLE form_template (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('quote','project','client','supplier')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE form_template_version (
  id TEXT PRIMARY KEY,
  form_template_id TEXT NOT NULL REFERENCES form_template(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  schema_json TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TEXT NOT NULL,
  UNIQUE (form_template_id, version)
);

CREATE TABLE output_template (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf','html','csv','json')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE output_template_version (
  id TEXT PRIMARY KEY,
  output_template_id TEXT NOT NULL REFERENCES output_template(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  config_json TEXT NOT NULL,
  body TEXT,
  checksum TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  created_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TEXT NOT NULL,
  UNIQUE (output_template_id, version, locale)
);

CREATE TABLE custom_value (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('quote','project','client','supplier')),
  target_id TEXT NOT NULL,
  template_version_id TEXT NOT NULL REFERENCES form_template_version(id),
  field_key TEXT NOT NULL,
  value_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Documents, messages, notifications, and audit

```sql
CREATE TABLE document (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES quote_revision(id) ON DELETE CASCADE,
  output_template_version_id TEXT NOT NULL REFERENCES output_template_version(id),
  object_key TEXT NOT NULL,
  checksum TEXT NOT NULL,
  file_size INTEGER,
  renderer_version TEXT,
  access_policy TEXT NOT NULL DEFAULT 'authorized',
  created_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TEXT NOT NULL
);

CREATE TABLE message (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  quote_id TEXT REFERENCES quote(id),
  project_id TEXT REFERENCES project(id),
  client_user_id TEXT REFERENCES client_user(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','portal')),
  subject TEXT,
  body TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','bounced')),
  sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE notification (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user','client_user')),
  recipient_id TEXT NOT NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','portal')),
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TEXT,
  sent_at TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE portal_token (
  id TEXT PRIMARY KEY,
  client_user_id TEXT NOT NULL REFERENCES client_user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('activation','reset','magic_link')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE audit_event (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user','client_user','system')),
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL
);
```

## Indexes

```sql
CREATE INDEX idx_user_workspace ON "user"(workspace_id);
CREATE INDEX idx_role_membership_user ON role_membership(user_id);
CREATE INDEX idx_client_workspace ON client(workspace_id);
CREATE INDEX idx_client_user_client ON client_user(client_id);
CREATE INDEX idx_quote_workspace_client ON quote(workspace_id, client_id, status);
CREATE INDEX idx_quote_revision_quote ON quote_revision(quote_id, version);
CREATE INDEX idx_quote_node_revision_parent ON quote_node(revision_id, parent_node_id);
CREATE INDEX idx_quote_item_revision ON quote_item(revision_id);
CREATE INDEX idx_product_workspace ON product(workspace_id);
CREATE INDEX idx_supplier_offer_product ON supplier_offer(product_id, effective_from, effective_to);
CREATE INDEX idx_supplier_offer_supplier ON supplier_offer(supplier_id);
CREATE INDEX idx_cost_event_project ON cost_event(project_id, event_type);
CREATE INDEX idx_custom_value_target ON custom_value(workspace_id, target_type, target_id);
CREATE INDEX idx_document_revision ON document(revision_id);
CREATE INDEX idx_message_quote ON message(quote_id, created_at);
CREATE INDEX idx_audit_workspace_time ON audit_event(workspace_id, created_at);
```

## Multi-tenancy and isolation

- Every query from the application layer includes `workspace_id` predicates derived from the session.
- Client users are restricted to resources owned by their `client_id`.
- Foreign keys and `UNIQUE` constraints that include `workspace_id` prevent cross-tenant collisions.
- For Postgres, replace `TEXT` timestamps with `TIMESTAMPTZ`, `INTEGER` booleans with `BOOLEAN`, and use `UUID` primary keys if preferred. The migration from SQLite to Postgres preserves the same logical schema and requires row-count, checksum, and money-total reconciliation.

## Notes

- `quote.current_revision_id` is nullable because a draft revision exists before publish; update it only after publish succeeds.
- `quote_item.selected_offer_id` references `supplier_offer.id` but is not enforced by a foreign key if historical offers may be soft-retired; the application snapshots `cost_snapshot_minor` to preserve published economics.
- `cost_event.quote_item_id` is nullable only for type `addition`, and additions require `approved_by` and `approved_at`.
