-- Analytics tables for advanced reporting and analysis

-- Quote analytics table
CREATE TABLE IF NOT EXISTS quote_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quote(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,
  total_amount_minor BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  converted_to_project BOOLEAN DEFAULT false,
  conversion_days INTEGER,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  quarter VARCHAR(7) NOT NULL, -- Format: YYYY-Q1
  year INTEGER NOT NULL
);

-- Project analytics table
CREATE TABLE IF NOT EXISTS project_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,
  estimated_cost_minor BIGINT NOT NULL,
  actual_cost_minor BIGINT,
  cost_variance_minor BIGINT,
  cost_variance_percentage DECIMAL(5,2),
  estimated_duration_days INTEGER NOT NULL,
  actual_duration_days INTEGER,
  duration_variance_days INTEGER,
  duration_variance_percentage DECIMAL(5,2),
  status VARCHAR(50) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  month VARCHAR(7) NOT NULL,
  quarter VARCHAR(7) NOT NULL,
  year INTEGER NOT NULL
);

-- Client analytics table
CREATE TABLE IF NOT EXISTS client_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  total_quotes INTEGER DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  total_revenue_minor BIGINT DEFAULT 0,
  average_quote_value_minor BIGINT DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  total_cost_minor BIGINT DEFAULT 0,
  profit_margin DECIMAL(5,2) DEFAULT 0,
  retention_rate DECIMAL(5,2) DEFAULT 0,
  last_activity_date TIMESTAMP WITH TIME ZONE,
  month VARCHAR(7) NOT NULL,
  quarter VARCHAR(7) NOT NULL,
  year INTEGER NOT NULL
);

-- Analytics summary table for quick dashboard data
CREATE TABLE IF NOT EXISTS analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  month VARCHAR(7) NOT NULL,
  quarter VARCHAR(7) NOT NULL,
  year INTEGER NOT NULL,
  total_quotes INTEGER DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  total_revenue_minor BIGINT DEFAULT 0,
  average_quote_value_minor BIGINT DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  active_clients INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, month)
);

-- Indexes for better query performance
CREATE INDEX idx_quote_analytics_workspace ON quote_analytics(workspace_id);
CREATE INDEX idx_quote_analytics_client ON quote_analytics(client_id);
CREATE INDEX idx_quote_analytics_status ON quote_analytics(status);
CREATE INDEX idx_quote_analytics_month ON quote_analytics(month);
CREATE INDEX idx_quote_analytics_quarter ON quote_analytics(quarter);
CREATE INDEX idx_quote_analytics_year ON quote_analytics(year);

CREATE INDEX idx_project_analytics_workspace ON project_analytics(workspace_id);
CREATE INDEX idx_project_analytics_client ON project_analytics(client_id);
CREATE INDEX idx_project_analytics_status ON project_analytics(status);
CREATE INDEX idx_project_analytics_month ON project_analytics(month);
CREATE INDEX idx_project_analytics_quarter ON project_analytics(quarter);
CREATE INDEX idx_project_analytics_year ON project_analytics(year);

CREATE INDEX idx_client_analytics_workspace ON client_analytics(workspace_id);
CREATE INDEX idx_client_analytics_client ON client_analytics(client_id);
CREATE INDEX idx_client_analytics_month ON client_analytics(month);
CREATE INDEX idx_client_analytics_quarter ON client_analytics(quarter);
CREATE INDEX idx_client_analytics_year ON client_analytics(year);

CREATE INDEX idx_analytics_summary_workspace ON analytics_summary(workspace_id);
CREATE INDEX idx_analytics_summary_month ON analytics_summary(month);
CREATE INDEX idx_analytics_summary_quarter ON analytics_summary(quarter);
CREATE INDEX idx_analytics_summary_year ON analytics_summary(year);

-- Add comments
COMMENT ON TABLE quote_analytics IS 'Analytics data for quotes including conversion metrics';
COMMENT ON TABLE project_analytics IS 'Analytics data for projects including cost and timeline performance';
COMMENT ON TABLE client_analytics IS 'Analytics data for clients including profitability and retention metrics';
COMMENT ON TABLE analytics_summary IS 'Summary analytics data for quick dashboard queries';

COMMENT ON COLUMN quote_analytics.conversion_days IS 'Days between quote creation and project conversion';
COMMENT ON COLUMN project_analytics.cost_variance_minor IS 'Difference between estimated and actual cost in minor units';
COMMENT ON COLUMN project_analytics.cost_variance_percentage IS 'Percentage difference between estimated and actual cost';
COMMENT ON COLUMN client_analytics.profit_margin IS 'Profit margin as percentage';
COMMENT ON COLUMN client_analytics.retention_rate IS 'Client retention rate as percentage';