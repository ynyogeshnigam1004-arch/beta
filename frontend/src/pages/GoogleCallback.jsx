import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import config from '../config'

function GoogleCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const handleGoogleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error) {
        console.error('Google OAuth error:', error)
        // Send error to parent window if in popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_OAUTH_ERROR',
            error: error
          }, window.location.origin)
          window.close()
        } else {
          navigate('/login?error=oauth_failed')
        }
        return
      }

      if (code) {
        try {
          // Send success to parent window if in popup
          if (window.opener) {
            window.opener.postMessage({
              type: 'GOOGLE_OAUTH_SUCCESS',
              code: code,
              state: state
            }, window.location.origin)
            window.close()
          } else {
            // Handle direct navigation (not popup)
            const response = await fetch('/api/auth/google/callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code, state }),
            })

            const data = await response.json()

            if (data.success) {
              localStorage.setItem('token', data.token)
              localStorage.setItem('user', JSON.stringify(data.user))
              navigate('/dashboard')
            } else {
              navigate('/login?error=oauth_failed')
            }
          }
        } catch (error) {
          console.error('Error processing Google OAuth:', error)
          if (window.opener) {
            window.opener.postMessage({
              type: 'GOOGLE_OAUTH_ERROR',
              error: 'processing_failed'
            }, window.location.origin)
            window.close()
          } else {
            navigate('/login?error=oauth_failed')
          }
        }
      } else {
        navigate('/login?error=no_code')
      }
    }

    handleGoogleCallback()
  }, [searchParams, navigate])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255,255,255,0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <h2>Processing Google Authentication...</h2>
        <p>Please wait while we complete your login.</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default GoogleCallback