import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiArrowLeft } from 'react-icons/fi'
import { FaGoogle } from 'react-icons/fa'
import axios from 'axios'
import config from '../config'
import './Auth.css'

function Signup({ onLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('signup') // 'signup' or 'verify'
  const [userId, setUserId] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/api/auth/signup', {
        fullName: name,
        email,
        password
      })

      if (response.data.success) {
        if (response.data.requiresVerification) {
          setStep('verify')
          setUserId(response.data.userId)
        } else {
          const { token, user } = response.data
          localStorage.setItem('token', token)
          localStorage.setItem('user', JSON.stringify(user))
          onLogin(token)
          navigate('/dashboard')
        }
      } else {
        setError(response.data.error || 'Signup failed')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerification = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/verify-email', {
        email,
        code: verificationCode
      })

      if (response.data.success) {
        const { token, user } = response.data
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        onLogin(token)
        navigate('/dashboard')
      } else {
        setError(response.data.error || 'Verification failed')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/resend-verification', {
        email
      })

      if (response.data.success) {
        alert('Verification code sent to your email!')
      } else {
        setError(response.data.error || 'Failed to resend code')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/auth/google')
      
      if (response.data.success) {
        // Open Google OAuth in popup
        const popup = window.open(
          response.data.authUrl,
          'google-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )

        // Listen for popup messages
        const handleMessage = async (event) => {
          if (event.origin !== window.location.origin) return

          if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
            popup.close()
            
            try {
              const callbackResponse = await axios.post('/api/auth/google/callback', {
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

  if (step === 'verify') {
    return (
      <div className="auth-container">
        <Link to="/" className="back-to-home">
          <FiArrowLeft /> Back to Home
        </Link>
        
        <div className="auth-box">
          <div className="auth-header">
            <h1 className="auth-title">Verify Your Email</h1>
            <p className="auth-subtitle">We sent a 6-digit code to {email}</p>
          </div>

          <form onSubmit={handleVerification} className="auth-form">
            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="verificationCode" className="form-label">
                Verification Code
              </label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                required
                maxLength={6}
                className="verification-input"
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Didn't receive the code?{' '}
              <button 
                type="button" 
                className="auth-link-button"
                onClick={handleResendCode}
                disabled={loading}
              >
                Resend Code
              </button>
            </p>
            <p>
              <button 
                type="button" 
                className="auth-link-button"
                onClick={() => setStep('signup')}
              >
                Back to Signup
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <Link to="/" className="back-to-home">
        <FiArrowLeft /> Back to Home
      </Link>
      
      <div className="auth-box">
        <div className="auth-header">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Start building voice AI agents today</p>
        </div>

        {/* Google OAuth Button */}
        <button 
          type="button" 
          className="google-auth-button"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <FaGoogle className="google-icon" />
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name" className="form-label">
              <FiUser /> Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              autoComplete="name"
            />
          </div>

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
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              <FiLock /> Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup


