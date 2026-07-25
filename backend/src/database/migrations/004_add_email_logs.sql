-- Email logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_sent ON email_logs(sent);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);

-- Add comments
COMMENT ON TABLE email_logs IS 'Logs of all emails sent through the system';
COMMENT ON COLUMN email_logs.sent IS 'Whether the email was sent successfully';
COMMENT ON COLUMN email_logs.error_message IS 'Error message if email failed to send';