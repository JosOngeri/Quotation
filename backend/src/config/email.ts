import { EmailService } from '../services/email-service';
import { Pool } from 'pg';

let emailService: EmailService | null = null;

export const initializeEmailService = (pool: Pool): EmailService => {
  if (!emailService) {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    emailService = new EmailService(emailConfig, pool);
  }

  return emailService;
};

export const getEmailService = (): EmailService | null => {
  return emailService;
};