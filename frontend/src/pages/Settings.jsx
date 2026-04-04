import { useState, useEffect } from 'react'
import { FiUser, FiLock, FiShield, FiSmartphone, FiBell, FiEye, FiEyeOff, FiCheck, FiX, FiRefreshCw, FiMail, FiKey, FiDownload } from 'react-icons/fi'
import axios from 'axios'
import config from '../config'
import './Settings.css'

function Settings() {
  const [user, setUser] = useState(null)
  const [twoFactorStatus, setTwoFactorStatus] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    // Get user info from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    // Check 2FA status
    check2FAStatus()
  }, [])

  const check2FAStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/2fa/status', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setTwoFactorStatus(response.data.twoFactorEnabled)
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error)
    }
  }

  const setup2FA = async () => {
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/2fa/setup', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setQrCode(response.data.qrCode)
        setSecret(response.data.secret)
        setShowSetup(true)
      } else {
        setError(response.data.error || 'Failed to setup 2FA')
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to setup 2FA')
    } finally {
      setLoading(false)
    }
  }

  const verify2FA = async () => {
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/2fa/verify-setup', {
        token: verificationCode
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setBackupCodes(response.data.backupCodes)
        setTwoFactorStatus(true)
        setShowSetup(false)
        setSuccess('2FA enabled successfully! Please save your backup codes.')
      } else {
        setError(response.data.error || 'Invalid verification code')
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to verify 2FA')
    } finally {
      setLoading(false)
    }
  }

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const password = prompt('Please enter your password to disable 2FA:')
      if (!password) return

      const token = localStorage.getItem('token')
      const response = await axios.post('/api/2fa/disable', {
        password: password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setTwoFactorStatus(false)
        setBackupCodes([])
        setSuccess('2FA disabled successfully')
      } else {
        setError(response.data.error || 'Failed to disable 2FA')
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    const blob = new Blob([codesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'voice-ai-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!user) {
    return <div className="settings-loading">Loading...</div>
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your account security and preferences</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Account Information */}
      <div className="settings-section">
        <h2><FiUser /> Account Information</h2>
        <div className="account-info">
          <div className="info-item">
            <label>Full Name</label>
            <span>{user.fullName}</span>
          </div>
          <div className="info-item">
            <label>Email</label>
            <span>{user.email}</span>
          </div>
          <div className="info-item">
            <label>Account Type</label>
            <span>{user.googleId ? 'Google Account' : 'Email Account'}</span>
          </div>
          <div className="info-item">
            <label>Role</label>
            <span>{user.role}</span>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="settings-section">
        <h2><FiShield /> Two-Factor Authentication</h2>
        <div className="twofa-section">
          <div className="twofa-status">
            <span className={`status-badge ${twoFactorStatus ? 'enabled' : 'disabled'}`}>
              {twoFactorStatus ? 'Enabled' : 'Disabled'}
            </span>
            <p>
              {twoFactorStatus 
                ? 'Your account is protected with 2FA' 
                : 'Add an extra layer of security to your account'
              }
            </p>
          </div>

          {!twoFactorStatus && !showSetup && (
            <button 
              className="btn btn-primary"
              onClick={setup2FA}
              disabled={loading}
            >
              <FiShield /> Enable 2FA
            </button>
          )}

          {twoFactorStatus && (
            <button 
              className="btn btn-danger"
              onClick={disable2FA}
              disabled={loading}
            >
              Disable 2FA
            </button>
          )}

          {showSetup && (
            <div className="twofa-setup">
              <h3>Setup Two-Factor Authentication</h3>
              
              <div className="setup-steps">
                <div className="step">
                  <h4>Step 1: Scan QR Code</h4>
                  <p>Use an authenticator app like Google Authenticator, Authy, or 1Password to scan this QR code:</p>
                  {qrCode && (
                    <div className="qr-code">
                      <img src={qrCode} alt="2FA QR Code" />
                    </div>
                  )}
                  
                  <div className="manual-entry">
                    <p>Or enter this code manually:</p>
                    <code>{secret}</code>
                  </div>
                </div>

                <div className="step">
                  <h4>Step 2: Enter Verification Code</h4>
                  <p>Enter the 6-digit code from your authenticator app:</p>
                  <div className="verification-input">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={verify2FA}
                      disabled={loading || verificationCode.length !== 6}
                    >
                      Verify & Enable
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {backupCodes.length > 0 && (
            <div className="backup-codes">
              <h3>Backup Codes</h3>
              <p>Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.</p>
              
              <div className="codes-list">
                {backupCodes.map((code, index) => (
                  <code key={index}>{code}</code>
                ))}
              </div>
              
              <button 
                className="btn btn-secondary"
                onClick={downloadBackupCodes}
              >
                <FiDownload /> Download Backup Codes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings