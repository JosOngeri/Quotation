-- Workflow definition table
CREATE TABLE IF NOT EXISTS workflow_definition (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger JSONB NOT NULL,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  workspace_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow execution table
CREATE TABLE IF NOT EXISTS workflow_execution (
  id VARCHAR(255) PRIMARY KEY,
  workflow_id VARCHAR(255) NOT NULL REFERENCES workflow_definition(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  triggered_by VARCHAR(255) NOT NULL,
  trigger_data JSONB,
  result JSONB,
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better query performance
CREATE INDEX idx_workflow_definition_workspace ON workflow_definition(workspace_id);
CREATE INDEX idx_workflow_definition_created_by ON workflow_definition(created_by);
CREATE INDEX idx_workflow_definition_enabled ON workflow_definition(enabled) WHERE enabled = true;
CREATE INDEX idx_workflow_definition_created_at ON workflow_definition(created_at DESC);

CREATE INDEX idx_workflow_execution_workflow_id ON workflow_execution(workflow_id);
CREATE INDEX idx_workflow_execution_status ON workflow_execution(status);
CREATE INDEX idx_workflow_execution_started_at ON workflow_execution(started_at DESC);

-- Add comments
COMMENT ON TABLE workflow_definition IS 'Workflow definitions for automation';
COMMENT ON COLUMN workflow_definition.trigger IS 'Workflow trigger configuration (time, event, manual)';
COMMENT ON COLUMN workflow_definition.conditions IS 'Workflow conditions for execution';
COMMENT ON COLUMN workflow_definition.actions IS 'Workflow actions to execute';
COMMENT ON COLUMN workflow_definition.enabled IS 'Whether the workflow is enabled';

COMMENT ON TABLE workflow_execution IS 'Workflow execution history';
COMMENT ON COLUMN workflow_execution.status IS 'Execution status (pending, running, completed, failed)';
COMMENT ON COLUMN workflow_execution.trigger_data IS 'Data that triggered the workflow';
COMMENT ON COLUMN workflow_execution.result IS 'Execution result data';
COMMENT ON COLUMN workflow_execution.error IS 'Error message if execution failed';