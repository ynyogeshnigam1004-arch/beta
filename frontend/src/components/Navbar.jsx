import { Link, useNavigate } from 'react-router-dom'
import { FiMenu, FiLogOut, FiUser, FiCreditCard } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import config from '../config'
import './Navbar.css'

function Navbar({ isAuthenticated, onLogout, onToggleSidebar }) {
  const [userEmail, setUserEmail] = useState('')
  const [credits, setCredits] = useState(0)
  const [currency, setCurrency] = useState('INR')
  const [isAdmin, setIsAdmin] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      // Get user info from localStorage
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          setUserEmail(user.email || '')
        } catch (error) {
          console.error('Error parsing user data:', error)
        }
      }
      
      // Fetch credits
      fetchCredits()
    }
  }, [isAuthenticated])

  const fetchCredits = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(config.getApiUrl('/api/credits/balance'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setCredits(data.credits)
        setCurrency(data.currency)
        setIsAdmin(data.isAdmin)
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    }
  }

  const formatCredits = () => {
    if (isAdmin) return '∞'
    if (currency === 'USD') return `$${credits}`
    return `₹${credits}`
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {isAuthenticated && (
          <button className="menu-btn" onClick={onToggleSidebar}>
            <FiMenu />
          </button>
        )}
        <Link to="/" className="navbar-brand">
          Voice AI Platform
        </Link>
      </div>
      
      <div className="navbar-right">
        {isAuthenticated ? (
          <>
            <button 
              className="credits-btn" 
              onClick={() => navigate('/billing')}
              title="View billing"
            >
              <FiCreditCard />
              <span className="credits-amount">{formatCredits()}</span>
            </button>
            <div className="user-info">
              <FiUser className="user-icon" />
              <span className="user-email">{userEmail}</span>
            </div>
            <button onClick={onLogout} className="btn-outline">
              <FiLogOut /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-outline">Login</Link>
            <Link to="/signup" className="btn-primary">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar

