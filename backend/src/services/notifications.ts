import { Pool } from 'pg';
import { env } from '../config/env-validation';
import { EmailService } from './email-service';

const pool = new Pool({
  connectionString: env.DATABASE_URL
});

export const notifyQuotePublished = async (quoteId: string, workspaceId: string): Promise<boolean> => {
  try {
    const quoteResult = await pool.query(
      `SELECT q.title, q.workspace_id, c.name as client_name, c.email as client_email, c.contact_name
       FROM quote q
       JOIN client c ON q.client_id = c.id
       WHERE q.id = $1 AND q.workspace_id = $2`,
      [quoteId, workspaceId]
    );

    if (quoteResult.rows.length === 0) {
      return false;
    }

    const { title, client_name, client_email, contact_name } = quoteResult.rows[0];

    if (!client_email || !env.SMTP_HOST) {
      return false;
    }

    const emailService = new EmailService(
      {
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: env.SMTP_USER || '',
          pass: env.SMTP_PASS || ''
        }
      },
      pool
    );

    const sent = await emailService.sendQuoteNotificationEmail(
      client_email,
      contact_name || client_name,
      title,
      client_name,
      quoteId
    );

    await emailService.logEmail(
      { to: client_email, subject: `New Quote Created: ${title}`, html: '', text: '' },
      sent
    );

    return sent;
  } catch (error) {
    console.error('notifyQuotePublished error:', error);
    return false;
  }
};
