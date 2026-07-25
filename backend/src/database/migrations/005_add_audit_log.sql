-- Audit log table for tracking all system events
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  workspace_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_workspace_id ON audit_log(workspace_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_status ON audit_log(status);

-- Add comments
COMMENT ON TABLE audit_log IS 'Comprehensive audit log for tracking all system events';
COMMENT ON COLUMN audit_log.action IS 'Type of action performed (login, create, update, delete, etc.)';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity affected (user, quote, client, etc.)';
COMMENT ON COLUMN audit_log.entity_id IS 'ID of the entity affected';
COMMENT ON COLUMN audit_log.changes IS 'JSON object containing the changes made';
COMMENT ON COLUMN audit_log.status IS 'Status of the action (success, failure)';
COMMENT ON COLUMN audit_log.error_message IS 'Error message if the action failed';

-- Create audit log retention function
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically clean up old logs (optional, can be scheduled via cron instead)
-- CREATE TRIGGER audit_log_cleanup_trigger
-- AFTER INSERT ON audit_log
-- EXECUTE FUNCTION cleanup_old_audit_logs();