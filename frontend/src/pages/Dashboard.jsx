import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiPhone, FiUsers, FiActivity, FiTrendingUp, FiRefreshCw } from 'react-icons/fi'
import config from '../config'
import './Dashboard.css'

function Dashboard() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    activeAssistants: 0,
    totalMinutes: 0,
    successRate: 0
  })

  const [recentCalls, setRecentCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [assistants, setAssistants] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.error('No authentication token found')
        setLoading(false)
        return
      }
      
      // Fetch analytics data for dashboard stats
      const analyticsResponse = await fetch('/api/analytics?period=30d', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      // Fetch assistants to get active count
      const assistantsResponse = await fetch(config.getApiUrl('/api/assistants'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const analyticsData = await analyticsResponse.json()
      const assistantsData = await assistantsResponse.json()
      
      if (analyticsData.success && assistantsData.success) {
        const analytics = analyticsData.analytics
        setAssistants(assistantsData.assistants || [])
        
        // Update stats with real data - handle null/undefined values
        setStats({
          totalCalls: analytics.overview?.totalCalls || 0,
          activeAssistants: assistantsData.assistants?.length || 0,
          totalMinutes: Math.round((analytics.overview?.totalDuration || 0) / 60),
          successRate: Math.round((analytics.overview?.successRate || 0) * 10) / 10
        })
        
        // Format recent calls data - handle empty arrays
        const recentCallsData = analytics.recentCalls || []
        const formattedCalls = recentCallsData.slice(0, 5).map((call, index) => ({
          id: call._id || `call-${index}`,
          assistant: getAssistantName(call.assistantId, assistantsData.assistants || []),
          duration: formatDuration(call.duration || 0),
          status: call.status || 'unknown',
          time: formatTimeAgo(call.startTime)
        }))
        
        setRecentCalls(formattedCalls)
      } else {
        console.error('API Error:', analyticsData.error || assistantsData.error)
        // Keep default values on API error
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // Keep default values on error
    } finally {
      setLoading(false)
    }
  }

  const getAssistantName = (assistantId, assistantsList) => {
    if (!assistantId || !assistantsList || !Array.isArray(assistantsList)) {
      return 'Unknown Assistant'
    }
    const assistant = assistantsList.find(a => a._id === assistantId)
    return assistant?.name || 'Unknown Assistant'
  }

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown'
    
    try {
      const now = new Date()
      const callTime = new Date(timestamp)
      
      if (isNaN(callTime.getTime())) return 'Unknown'
      
      const diffMs = now - callTime
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffMinutes < 1) {
        return 'Just now'
      } else if (diffHours < 1) {
        return `${diffMinutes} minutes ago`
      } else if (diffHours < 24) {
        return `${diffHours} hours ago`
      } else {
        return `${diffDays} days ago`
      }
    } catch (error) {
      console.error('Error formatting time:', error)
      return 'Unknown'
    }
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="header-actions">
            <button onClick={fetchDashboardData} className="refresh-btn" disabled={loading}>
              <FiRefreshCw className={loading ? 'loading-spinner' : ''} />
            </button>
            <Link to="/call/new" className="btn-primary">
              <FiPhone /> Make New Call
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <FiRefreshCw className="loading-spinner" />
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(84, 245, 196, 0.1)' }}>
                  <FiPhone color="var(--accent-primary)" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalCalls.toLocaleString()}</div>
                  <div className="stat-label">Total Calls</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                  <FiUsers color="#3b82f6" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.activeAssistants}</div>
                  <div className="stat-label">Active Assistants</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                  <FiActivity color="#f59e0b" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalMinutes.toLocaleString()}</div>
                  <div className="stat-label">Total Minutes</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                  <FiTrendingUp color="#10b981" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.successRate}%</div>
                  <div className="stat-label">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Recent Calls */}
            <div className="section">
              <div className="section-header-row">
                <h2>Recent Calls</h2>
                <Link to="/analytics" className="view-all-link">View All</Link>
              </div>

              {recentCalls.length > 0 ? (
                <div className="calls-table">
                  <div className="table-header">
                    <div>Assistant</div>
                    <div>Duration</div>
                    <div>Status</div>
                    <div>Time</div>
                  </div>
                  {recentCalls.map((call) => (
                    <div key={call.id} className="table-row">
                      <div className="call-assistant">{call.assistant}</div>
                      <div className="call-duration">{call.duration}</div>
                      <div>
                        <span className={`status-badge ${call.status}`}>
                          {call.status}
                        </span>
                      </div>
                      <div className="call-time">{call.time}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <FiPhone size={48} color="var(--text-secondary)" />
                  <h3>No calls yet</h3>
                  <p>Make your first call to see data here</p>
                  <Link to="/call/new" className="btn-primary">
                    <FiPhone /> Make New Call
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="section">
              <h2>Quick Actions</h2>
              <div className="quick-actions">
                <Link to="/assistants" className="action-card">
                  <FiUsers />
                  <h3>Manage Assistants</h3>
                  <p>Create and configure voice AI assistants</p>
                </Link>
                <Link to="/call/new" className="action-card">
                  <FiPhone />
                  <h3>Make a Call</h3>
                  <p>Start a new voice call with an assistant</p>
                </Link>
                <Link to="/analytics" className="action-card">
                  <FiTrendingUp />
                  <h3>View Analytics</h3>
                  <p>Track performance and usage metrics</p>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Dashboard
