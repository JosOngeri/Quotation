import React, { useState, useEffect } from 'react';
import api from '../lib/axios';

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
  const [status, setStatus] = useState<{ enabled: boolean } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/two-factor/status');
      setStatus(response.data.data);
    } catch (err) {
      // ignore
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/two-factor/setup');
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
      const response = await api.post('/two-factor/verify', { token });
      
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

  const handleDisable = async () => {
    if (!window.confirm('Disable two-factor authentication?')) return;
    setLoading(true);
    try {
      await api.post('/two-factor/disable');
      setStatus(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to disable 2FA');
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
      {status?.enabled && (
        <div className="mb-4 p-4 bg-green-50 text-green-800 rounded">
          Two-factor authentication is enabled.
          <button onClick={handleDisable} className="ml-4 text-red-600 underline" type="button">
            Disable
          </button>
        </div>
      )}

      <h2 className="font-semibold mb-4">Two-Factor Authentication Setup</h2>
      
      {!setupData && (
        <div className="setup-intro space-y-4">
          <p>Enable two-factor authentication to add an extra layer of security to your account.</p>
          <button
            onClick={handleSetup}
            disabled={loading}
            className="setup-btn btn btn-primary"
            aria-busy={loading}
          >
            {loading ? 'Setting up...' : 'Setup 2FA'}
          </button>
        </div>
      )}

      {setupData && !success && (
        <div className="setup-process space-y-6">
          <div className="qr-section">
            <h3 className="font-medium mb-2">Step 1: Scan QR Code</h3>
            <p className="text-sm text-gray-600">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
            <img src={setupData.qrCode} alt="QR Code for authenticator" className="qr-code my-2" />
            <p className="manual-entry text-sm">
              Or enter this code manually: <code className="bg-gray-100 px-2 py-1 rounded">{setupData.secret}</code>
            </p>
          </div>

          <div className="verify-section space-y-2">
            <h3 className="font-medium mb-2">Step 2: Verify Setup</h3>
            <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app to verify the setup</p>
            <label htmlFor="two-factor-token" className="sr-only">6-digit token</label>
            <input
              id="two-factor-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="token-input input"
              aria-label="6-digit token"
            />
            <button
              onClick={handleVerify}
              disabled={loading || token.length !== 6}
              className="verify-btn btn btn-primary"
              aria-busy={loading}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          <div className="backup-codes-section space-y-2">
            <h3 className="font-medium mb-2">Step 3: Save Backup Codes</h3>
            <p className="text-sm text-gray-600">Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.</p>
            <button
              onClick={() => setShowBackupCodes(!showBackupCodes)}
              className="toggle-codes-btn btn btn-secondary text-sm"
              type="button"
            >
              {showBackupCodes ? 'Hide' : 'Show'} Backup Codes
            </button>
            
            {showBackupCodes && (
              <div className="backup-codes">
                <ul className="bg-gray-100 p-3 rounded my-2">
                  {setupData.backupCodes.map((code, index) => (
                    <li key={index} className="font-mono text-sm">{code}</li>
                  ))}
                </ul>
                <button
                  onClick={handleCopyBackupCodes}
                  className="copy-codes-btn btn btn-secondary text-sm"
                  type="button"
                >
                  Copy All Codes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="success-message p-4 bg-green-50 text-green-800 rounded" role="status">
          <h3 className="font-semibold mb-2">Two-Factor Authentication Enabled!</h3>
          <p>Your account is now protected with 2FA. You&apos;ll need to enter a code from your authenticator app when logging in.</p>
          <button
            onClick={() => window.location.reload()}
            className="continue-btn btn btn-primary mt-2"
            type="button"
          >
            Continue
          </button>
        </div>
      )}

      {error && (
        <div className="error-message p-4 bg-red-50 text-red-800 rounded my-4" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;
