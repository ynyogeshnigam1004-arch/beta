import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiArrowLeft, FiShield } from 'react-icons/fi'
import { FaGoogle } from 'react-icons/fa'
import axios from 'axios'
import config from '../config'
import './Auth.css'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [requiresVerification, setRequiresVerification] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const requestData = { email, password }
      if (requires2FA) {
        requestData.twoFactorCode = twoFactorCode
      }

      const response = await axios.post(config.getApiUrl('/api/auth/login'), requestData)

      if (response.data.success) {
        const { token, user } = response.data
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        onLogin(token)
        navigate('/dashboard')
      } else if (response.data.requires2FA) {
        setRequires2FA(true)
        setError('')
      } else if (response.data.requiresVerification) {
        setRequiresVerification(true)
        setError('Please verify your email before logging in')
      } else {
        setError(response.data.error || 'Login failed')
      }
    } catch (err) {
      if (err.response?.status === 423) {
        setError('Account temporarily locked due to too many failed attempts')
      } else if (err.response?.status === 403) {
        setRequiresVerification(true)
        setError('Please verify your email before logging in')
      } else {
        setError(err.response?.data?.error || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      const response = await axios.get(config.getApiUrl('/api/auth/google'))
      
      if (response.data.success) {
        // Direct redirect instead of popup (avoids CORS issues)
        window.location.href = response.data.authUrl
      } else {
        setError('Failed to initiate Google authentication')
        setLoading(false)
      }
    } catch (err) {
      setError('Failed to initiate Google authentication')
      setLoading(false)
    }
  }
            try {
              const callbackResponse = await axios.post(config.getApiUrl('/api/auth/google/callback'), {
                code: event.data.code,
                state: event.data.state
              })

              if (callbackResponse.data.success) {
                const { token, user } = callbackResponse.data
                localStorage.setItem('token', token)
                localStorage.setItem('user', JSON.stringify(user))
                onLogin(token)
                navigate('/dashboard')
              } else {
                setError(callbackResponse.data.error || 'Google authentication failed')
              }
            } catch (err) {
              setError('Google authentication failed')
            }
          } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
            popup.close()
            setError('Google authentication failed')
          }

          window.removeEventListener('message', handleMessage)
          setLoading(false)
        }

        window.addEventListener('message', handleMessage)

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
            setLoading(false)
          }
        }, 1000)
      }
    } catch (err) {
      setError('Failed to initiate Google authentication')
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <Link to="/" className="back-to-home">
        <FiArrowLeft /> Back to Home
      </Link>
      
      <div className="auth-box">
        <div className="auth-header">
          <h1 className="auth-title">
            {requires2FA ? 'Two-Factor Authentication' : 'Welcome Back'}
          </h1>
          <p className="auth-subtitle">
            {requires2FA 
              ? 'Enter your 2FA code to complete login'
              : 'Sign in to your Voice AI account'
            }
          </p>
        </div>

        {!requires2FA && (
          <>
            {/* Google OAuth Button */}
            <button 
              type="button" 
              className="google-auth-button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <FaGoogle className="google-icon" />
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              {error}
              {requiresVerification && (
                <div className="verification-link">
                  <Link to="/signup" className="auth-link">
                    Go to email verification
                  </Link>
                </div>
              )}
            </div>
          )}

          {!requires2FA ? (
            <>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <FiMail /> Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  <FiLock /> Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label htmlFor="twoFactorCode" className="form-label">
                <FiShield /> 2FA Code
              </label>
              <input
                type="text"
                id="twoFactorCode"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="123456"
                required
                maxLength={6}
                className="verification-input"
                autoComplete="one-time-code"
              />
              <p className="help-text">
                Enter the 6-digit code from your authenticator app or use a backup code
              </p>
            </div>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading 
              ? (requires2FA ? 'Verifying...' : 'Signing in...') 
              : (requires2FA ? 'Verify & Sign In' : 'Sign In')
            }
          </button>
        </form>

        {requires2FA && (
          <div className="auth-footer">
            <p>
              <button 
                type="button" 
                className="auth-link-button"
                onClick={() => {
                  setRequires2FA(false)
                  setTwoFactorCode('')
                  setError('')
                }}
              >
                Back to Login
              </button>
            </p>
          </div>
        )}

        {!requires2FA && (
          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/signup" className="auth-link">
                Sign up
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login




