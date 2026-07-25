-- Files table for storing uploaded file metadata
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  upload_type VARCHAR(50) NOT NULL DEFAULT 'general',
  entity_type VARCHAR(50),
  entity_id UUID,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_files_workspace_id ON files(workspace_id);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_upload_type ON files(upload_type);
CREATE INDEX idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX idx_files_created_at ON files(created_at DESC);

-- Add comments
COMMENT ON TABLE files IS 'Stores metadata for uploaded files';
COMMENT ON COLUMN files.upload_type IS 'Type of upload: quotes, projects, suppliers, general';
COMMENT ON COLUMN files.entity_type IS 'Type of entity the file is associated with';
COMMENT ON COLUMN files.entity_id IS 'ID of the entity the file is associated with';