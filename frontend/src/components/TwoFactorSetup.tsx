import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface TwoFactorSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

const TwoFactorSetup: React.FC = () => {
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/v1/two-factor/setup');
      setSetupData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/v1/two-factor/verify', { token });
      
      if (response.data.data.verified) {
        setSuccess(true);
      } else {
        setError('Invalid token. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to verify 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    if (setupData?.backupCodes) {
      const codes = setupData.backupCodes.join('\n');
      navigator.clipboard.writeText(codes);
      alert('Backup codes copied to clipboard');
    }
  };

  return (
    <div className="two-factor-setup">
      <h2>Two-Factor Authentication Setup</h2>
      
      {!setupData && (
        <div className="setup-intro">
          <p>Enable two-factor authentication to add an extra layer of security to your account.</p>
          <button
            onClick={handleSetup}
            disabled={loading}
            className="setup-btn"
          >
            {loading ? 'Setting up...' : 'Setup 2FA'}
          </button>
        </div>
      )}

      {setupData && !success && (
        <div className="setup-process">
          <div className="qr-section">
            <h3>Step 1: Scan QR Code</h3>
            <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
            <img src={setupData.qrCode} alt="QR Code" className="qr-code" />
            <p className="manual-entry">
              Or enter this code manually: <code>{setupData.secret}</code>
            </p>
          </div>

          <div className="verify-section">
            <h3>Step 2: Verify Setup</h3>
            <p>Enter the 6-digit code from your authenticator app to verify the setup</p>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="token-input"
            />
            <button
              onClick={handleVerify}
              disabled={loading || token.length !== 6}
              className="verify-btn"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          <div className="backup-codes-section">
            <h3>Step 3: Save Backup Codes</h3>
            <p>Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.</p>
            <button
              onClick={() => setShowBackupCodes(!showBackupCodes)}
              className="toggle-codes-btn"
            >
              {showBackupCodes ? 'Hide' : 'Show'} Backup Codes
            </button>
            
            {showBackupCodes && (
              <div className="backup-codes">
                <ul>
                  {setupData.backupCodes.map((code, index) => (
                    <li key={index}>{code}</li>
                  ))}
                </ul>
                <button
                  onClick={handleCopyBackupCodes}
                  className="copy-codes-btn"
                >
                  Copy All Codes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="success-message">
          <h3>Two-Factor Authentication Enabled!</h3>
          <p>Your account is now protected with 2FA. You'll need to enter a code from your authenticator app when logging in.</p>
          <button
            onClick={() => window.location.reload()}
            className="continue-btn"
          >
            Continue
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;