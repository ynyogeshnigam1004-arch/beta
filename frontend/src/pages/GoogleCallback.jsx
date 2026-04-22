import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import config from '../config'

function GoogleCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const handleGoogleCallback = async () => {
      // Check if we have token and user in URL (from backend redirect)
      const token = searchParams.get('token')
      const userParam = searchParams.get('user')
      const error = searchParams.get('error')

      if (error) {
        console.error('Google OAuth error:', error)
        navigate('/login?error=oauth_failed')
        return
      }

      if (token && userParam) {
        try {
          // Backend already processed OAuth, just save token and redirect
          const user = JSON.parse(decodeURIComponent(userParam))
          localStorage.setItem('token', token)
          localStorage.setItem('user', JSON.stringify(user))
          
          // Trigger login callback if available
          if (window.onLogin) {
            window.onLogin(token)
          }
          
          // Redirect to dashboard
          navigate('/dashboard')
        } catch (error) {
          console.error('Error parsing OAuth response:', error)
          navigate('/login?error=oauth_failed')
        }
      } else {
        // No token in URL, something went wrong
        navigate('/login?error=no_token')
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