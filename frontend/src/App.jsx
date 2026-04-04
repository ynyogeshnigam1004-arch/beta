import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import GoogleCallback from './pages/GoogleCallback'
import Dashboard from './pages/Dashboard'
import Assistants from './pages/Assistants'
import AssistantConfig from './pages/AssistantConfig'
import Tools from './pages/Tools'
import ToolConfig from './pages/ToolConfig'
import Call from './pages/Call'
import Analytics from './pages/Analytics'
import Billing from './pages/Billing'
import PhoneNumbers from './pages/PhoneNumbers'

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  useEffect(() => {
    // Check if user is authenticated (check for token in localStorage)
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
  }, [])

  const handleLogin = (token) => {
    localStorage.setItem('token', token)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" />
  }

  // Public Route Component (redirect to dashboard if authenticated)
  const PublicRoute = ({ children }) => {
    return !isAuthenticated ? children : <Navigate to="/dashboard" />
  }

  // Check if current page is home page or auth pages
  const isHomePage = location.pathname === '/'
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/auth/google/callback'
  const showNavbar = !isHomePage && !isAuthPage

  return (
    <div className="app">
      {/* Only show Navbar if NOT on home page or auth pages */}
      {showNavbar && (
        <Navbar 
          isAuthenticated={isAuthenticated} 
          onLogout={handleLogout}
          onToggleSidebar={toggleSidebar}
        />
      )}
      
      <div style={{ display: 'flex' }}>
        {isAuthenticated && !isHomePage && !isAuthPage && (
          <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        )}
        
        <main style={{ 
          flex: 1, 
          marginLeft: isAuthenticated && sidebarOpen && !isHomePage && !isAuthPage ? '250px' : '0',
          transition: 'margin-left 0.3s ease',
          minHeight: isHomePage || isAuthPage ? '100vh' : 'calc(100vh - 70px)',
          marginTop: isHomePage || isAuthPage ? '0' : '70px'
        }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login onLogin={handleLogin} />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <Signup onLogin={handleLogin} />
                </PublicRoute>
              } 
            />
            
            {/* Google OAuth Callback Route */}
            <Route path="/auth/google/callback" element={<GoogleCallback />} />

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assistants" 
              element={
                <ProtectedRoute>
                  <Assistants />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assistants/:id/configure" 
              element={
                <ProtectedRoute>
                  <AssistantConfig />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tools" 
              element={
                <ProtectedRoute>
                  <Tools />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tools/:id" 
              element={
                <ProtectedRoute>
                  <ToolConfig />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/call/:id" 
              element={
                <ProtectedRoute>
                  <Call />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/billing" 
              element={
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/phone-numbers" 
              element={
                <ProtectedRoute>
                  <PhoneNumbers />
                </ProtectedRoute>
              } 
            />

            {/* 404 Route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
