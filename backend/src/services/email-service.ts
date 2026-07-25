import nodemailer from 'nodemailer';
import { Pool } from 'pg';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private pool: Pool;
  private fromEmail: string;
  private fromName: string;

  constructor(config: EmailConfig, pool: Pool) {
    this.pool = pool;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@qms.example.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'QMS System';

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      tls: {
        rejectUnauthorized: false // For development, set to true in production
      }
    });
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string, workspaceName: string): Promise<boolean> {
    const template = this.getWelcomeTemplate(userName, workspaceName);
    return this.sendEmail({
      to: userEmail,
      ...template
    });
  }

  async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const template = this.getPasswordResetTemplate(userName, resetUrl);
    return this.sendEmail({
      to: userEmail,
      ...template
    });
  }

  async sendEmailVerificationEmail(userEmail: string, userName: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const template = this.getEmailVerificationTemplate(userName, verificationUrl);
    return this.sendEmail({
      to: userEmail,
      ...template
    });
  }

  async sendQuoteNotificationEmail(
    userEmail: string,
    userName: string,
    quoteTitle: string,
    clientName: string,
    quoteId: string
  ): Promise<boolean> {
    const quoteUrl = `${process.env.FRONTEND_URL}/quotes/${quoteId}`;
    const template = this.getQuoteNotificationTemplate(userName, quoteTitle, clientName, quoteUrl);
    return this.sendEmail({
      to: userEmail,
      ...template
    });
  }

  async sendProjectUpdateEmail(
    userEmail: string,
    userName: string,
    projectTitle: string,
    updateType: string,
    projectId: string
  ): Promise<boolean> {
    const projectUrl = `${process.env.FRONTEND_URL}/projects/${projectId}`;
    const template = this.getProjectUpdateTemplate(userName, projectTitle, updateType, projectUrl);
    return this.sendEmail({
      to: userEmail,
      ...template
    });
  }

  private getWelcomeTemplate(userName: string, workspaceName: string): EmailTemplate {
    return {
      subject: `Welcome to ${workspaceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to QMS</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Welcome to QMS</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Dear ${userName},</p>
              <p>Welcome to <strong>${workspaceName}</strong>! Your account has been successfully created.</p>
              <p>You can now access the Quotation Management System and start creating quotes, managing projects, and collaborating with your team.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Access Your Account</a>
              </p>
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              <p>Best regards,<br>The QMS Team</p>
            </div>
            <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>&copy; ${new Date().getFullYear()} ${workspaceName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to ${workspaceName}! Your account has been successfully created. You can now access the Quotation Management System at ${process.env.FRONTEND_URL}`
    };
  }

  private getPasswordResetTemplate(userName: string, resetUrl: string): EmailTemplate {
    return {
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Password Reset</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Dear ${userName},</p>
              <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
              <p>To reset your password, click the button below:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
              </p>
              <p>This link will expire in 1 hour for security reasons.</p>
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br>The QMS Team</p>
            </div>
            <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>&copy; ${new Date().getFullYear()} QMS. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${userName}, We received a request to reset your password. To reset your password, visit: ${resetUrl}. This link will expire in 1 hour.`
    };
  }

  private getEmailVerificationTemplate(userName: string, verificationUrl: string): EmailTemplate {
    return {
      subject: 'Email Verification Required',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Email Verification</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Dear ${userName},</p>
              <p>Please verify your email address to complete your account setup.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
              </p>
              <p>This link will expire in 24 hours.</p>
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br>The QMS Team</p>
            </div>
            <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>&copy; ${new Date().getFullYear()} QMS. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${userName}, Please verify your email address by visiting: ${verificationUrl}. This link will expire in 24 hours.`
    };
  }

  private getQuoteNotificationTemplate(
    userName: string,
    quoteTitle: string,
    clientName: string,
    quoteUrl: string
  ): EmailTemplate {
    return {
      subject: `New Quote Created: ${quoteTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Quote Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">New Quote Created</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Dear ${userName},</p>
              <p>A new quote has been created:</p>
              <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p><strong>Quote Title:</strong> ${quoteTitle}</p>
                <p><strong>Client:</strong> ${clientName}</p>
              </div>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${quoteUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Quote</a>
              </p>
              <p>If you have any questions, please contact your support team.</p>
              <p>Best regards,<br>The QMS Team</p>
            </div>
            <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>&copy; ${new Date().getFullYear()} QMS. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${userName}, A new quote has been created: ${quoteTitle} for ${clientName}. View it at: ${quoteUrl}`
    };
  }

  private getProjectUpdateTemplate(
    userName: string,
    projectTitle: string,
    updateType: string,
    projectUrl: string
  ): EmailTemplate {
    return {
      subject: `Project Update: ${projectTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #ffc107; color: #333; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Project Update</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Dear ${userName},</p>
              <p>There has been an update to your project:</p>
              <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p><strong>Project:</strong> ${projectTitle}</p>
                <p><strong>Update Type:</strong> ${updateType}</p>
              </div>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${projectUrl}" style="background-color: #ffc107; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Project</a>
              </p>
              <p>If you have any questions, please contact your support team.</p>
              <p>Best regards,<br>The QMS Team</p>
            </div>
            <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>&copy; ${new Date().getFullYear()} QMS. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${userName}, There has been an update to your project: ${projectTitle}. Update type: ${updateType}. View it at: ${projectUrl}`
    };
  }

  async logEmail(emailData: EmailData, sent: boolean, error?: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO email_logs (to_email, subject, sent, error_message, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [emailData.to, emailData.subject, sent, error || null]
      );
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }
}