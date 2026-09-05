-- 012_add_quote_extras.sql
-- Quote templates (reusable node trees), portal comments, and approvals.

CREATE TABLE IF NOT EXISTS quote_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  structure JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quote_comment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quote(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_user_id UUID REFERENCES client_user(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quote_approval (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quote(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID REFERENCES users(id),
  decided_by UUID REFERENCES users(id),
  note TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quote_template_workspace ON quote_template(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quote_comment_quote ON quote_comment(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_approval_quote ON quote_approval(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_approval_status ON quote_approval(status);
