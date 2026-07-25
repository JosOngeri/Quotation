-- Report definition table for custom report builder
CREATE TABLE IF NOT EXISTS report_definition (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  data_source JSONB NOT NULL,
  fields JSONB NOT NULL,
  filters JSONB DEFAULT '[]'::jsonb,
  grouping JSONB DEFAULT '[]'::jsonb,
  visualization JSONB NOT NULL,
  created_by UUID NOT NULL,
  workspace_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_report_definition_workspace ON report_definition(workspace_id);
CREATE INDEX idx_report_definition_created_by ON report_definition(created_by);
CREATE INDEX idx_report_definition_created_at ON report_definition(created_at DESC);

-- Add comments
COMMENT ON TABLE report_definition IS 'Custom report definitions for the report builder';
COMMENT ON COLUMN report_definition.data_source IS 'Data source configuration (table, query, API)';
COMMENT ON COLUMN report_definition.fields IS 'Report field definitions with types and aggregations';
COMMENT ON COLUMN report_definition.filters IS 'Report filter conditions';
COMMENT ON COLUMN report_definition.grouping IS 'Report grouping and sorting configuration';
COMMENT ON COLUMN report_definition.visualization IS 'Report visualization settings';