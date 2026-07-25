# QMS Security Guide

This guide provides comprehensive information about the security features of the Quotation Management System (QMS), including two-factor authentication (2FA) and OAuth integration.

## Table of Contents
1. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
2. [OAuth Integration](#oauth-integration)
3. [Security Best Practices](#security-best-practices)
4. [Troubleshooting](#troubleshooting)

## Two-Factor Authentication (2FA)

### Overview
QMS supports TOTP-based two-factor authentication using authenticator apps like Google Authenticator, Authy, or Microsoft Authenticator. This adds an extra layer of security to user accounts.

### Setup Process

#### Backend Setup
1. Install required dependencies:
```bash
npm install speakeasy qrcode
npm install --save-dev @types/speakeasy @types/qrcode
```

2. Run database migration:
```bash
npm run migration:run
```

3. Configure environment variables (if needed):
```env
# 2FA is enabled by default, no additional configuration required
```

#### User Setup
1. Navigate to user settings
2. Click "Setup 2FA"
3. Scan QR code with authenticator app
4. Enter verification code
5. Save backup codes securely

### API Endpoints

#### Setup 2FA
```http
POST /api/v1/two-factor/setup
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,...",
    "backupCodes": ["code1", "code2", ...]
  }
}
```

#### Verify 2FA Setup
```http
POST /api/v1/two-factor/verify
Authorization: Bearer {token}
Content-Type: application/json

{
  "token": "123456"
}
```

#### Authenticate with 2FA
```http
POST /api/v1/two-factor/authenticate
Content-Type: application/json

{
  "userId": "user-uuid",
  "token": "123456"
}
```

#### Disable 2FA
```http
POST /api/v1/two-factor/disable
Authorization: Bearer {token}
```

#### Get 2FA Status
```http
GET /api/v1/two-factor/status
Authorization: Bearer {token}
```

#### Regenerate Backup Codes
```http
POST /api/v1/two-factor/backup-codes
Authorization: Bearer {token}
```

### Login Flow with 2FA

1. User enters credentials
2. System validates credentials
3. If 2FA is enabled, system returns temporary token
4. User enters 2FA code from authenticator app
5. System validates 2FA code
6. System returns final authentication token

### Backup Codes
- 10 backup codes are generated during setup
- Each code can be used once
- Store backup codes securely (password manager, safe)
- Regenerate codes if compromised

### Security Considerations
- 2FA codes have a 2-minute window (±1 step)
- Backup codes are single-use
- Failed attempts are logged
- 2FA can be disabled by user or admin

## OAuth Integration

### Overview
QMS supports OAuth 2.0 authentication with Google, allowing users to sign in with their existing Google accounts.

### Supported Providers
- Google (Google OAuth 2.0)
- Microsoft Azure AD (planned)

### Configuration

#### Google OAuth Setup
1. Create Google Cloud project
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Configure redirect URI: `http://localhost:5000/api/v1/auth/google/callback`
5. Add credentials to environment variables:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
```

#### Microsoft Azure AD Setup (Planned)
1. Create Azure AD application
2. Configure redirect URI
3. Add credentials to environment variables

### API Endpoints

#### Initiate Google OAuth
```http
GET /api/v1/auth/google
```

#### Google OAuth Callback
```http
GET /api/v1/auth/google/callback
```

#### Link OAuth Account
```http
POST /api/v1/auth/oauth/link
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider": "google",
  "providerId": "google-user-id"
}
```

#### Unlink OAuth Account
```http
POST /api/v1/auth/oauth/unlink
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider": "google"
}
```

#### Get Linked OAuth Providers
```http
GET /api/v1/auth/oauth/providers
Authorization: Bearer {token}
```

### User Account Linking
Users can link OAuth accounts to existing QMS accounts:
1. Navigate to user settings
2. Click "Link Google Account"
3. Complete OAuth flow
4. Account is linked

### Security Considerations
- OAuth tokens are short-lived
- OAuth accounts can be unlinked
- OAuth IDs are unique per user
- OAuth login is logged in audit trail

## Security Best Practices

### For Administrators
1. **Enable 2FA Enforcement**: Require 2FA for admin accounts
2. **Regular Security Audits**: Review security logs regularly
3. **Monitor Failed Attempts**: Set up alerts for suspicious activity
4. **Keep Dependencies Updated**: Apply security patches promptly
5. **Use Strong Passwords**: Enforce password complexity requirements

### For Users
1. **Enable 2FA**: Protect your account with 2FA
2. **Use Authenticator Apps**: Prefer TOTP over SMS
3. **Secure Backup Codes**: Store backup codes safely
4. **Monitor Account Activity**: Review login history
5. **Report Suspicious Activity**: Report security incidents immediately

### For Developers
1. **Validate All Inputs**: Prevent injection attacks
2. **Use HTTPS**: Always use secure connections
3. **Implement Rate Limiting**: Prevent brute force attacks
4. **Log Security Events**: Maintain comprehensive audit logs
5. **Follow OWASP Guidelines**: Implement security best practices

## Troubleshooting

### 2FA Issues

#### Invalid Token Error
- **Cause**: Incorrect code or time synchronization issue
- **Solution**: 
  - Check authenticator app time sync
  - Use backup code if available
  - Regenerate backup codes if needed

#### Lost Authenticator Device
- **Solution**: 
  - Use backup code to log in
  - Disable 2FA and re-enable with new device
  - Contact administrator if no backup codes available

#### QR Code Not Scanning
- **Solution**: 
  - Try manual entry with provided secret
  - Check authenticator app permissions
  - Ensure QR code is clearly visible

### OAuth Issues

#### OAuth Redirect Error
- **Cause**: Incorrect callback URL configuration
- **Solution**: 
  - Verify Google Cloud Console settings
  - Check environment variables
  - Ensure callback URL matches exactly

#### Account Linking Failed
- **Cause**: OAuth account already linked to another user
- **Solution**: 
  - Unlink from existing account first
  - Contact administrator if needed

#### OAuth Login Not Working
- **Solution**: 
  - Verify OAuth credentials are correct
  - Check Google Cloud Console status
  - Review application logs for errors

### General Security Issues

#### Suspicious Account Activity
- **Solution**: 
  - Change password immediately
  - Review connected OAuth accounts
  - Enable 2FA if not already enabled
  - Contact administrator

#### Failed Login Attempts
- **Solution**: 
  - Check account lockout status
  - Verify correct credentials
  - Use password reset if needed
  - Contact administrator if locked out

## Security Monitoring

### Audit Logs
All security events are logged in the audit_log table:
- Login attempts (success/failure)
- 2FA setup/verification
- OAuth account linking/unlinking
- Password changes
- Permission changes

### Monitoring Dashboard
Access the performance dashboard to monitor:
- Failed login attempts
- 2FA usage statistics
- OAuth authentication rates
- Security alerts

### Alerts
Configure alerts for:
- High rate of failed login attempts
- Multiple 2FA failures
- OAuth authentication failures
- Suspicious account activity

## Compliance

### Data Protection
- User data is encrypted at rest
- OAuth tokens are never stored
- 2FA secrets are encrypted
- Audit logs are retained per policy

### Regulatory Compliance
- GDPR compliant data handling
- SOC 2 security controls
- HIPAA compliant (if applicable)
- Industry-standard security practices

## Support

For security-related issues:
- **Security Team**: security@qms.example.com
- **Documentation**: [Security Guide](SECURITY_GUIDE.md)
- **Emergency**: emergency@qms.example.com

## Additional Resources

- [OWASP Security Guidelines](https://owasp.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Google OAuth Documentation](https://developers.google.com/identity)
- [Authenticator App Recommendations](https://support.google.com/accounts/answer/185839)