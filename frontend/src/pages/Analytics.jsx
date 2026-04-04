import { useState, useEffect } from 'react'
import { 
  FiPhone, 
  FiUsers, 
  FiActivity, 
  FiTrendingUp, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle,
  FiBarChart,
  FiPieChart,
  FiRefreshCw
} from 'react-icons/fi'
import config from '../config'
import './Analytics.css'

function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7d')
  const [selectedAssistant, setSelectedAssistant] = useState('')
  const [assistants, setAssistants] = useState([])

  useEffect(() => {
    fetchAssistants()
    fetchAnalytics()
  }, [period, selectedAssistant])

  const fetchAssistants = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/assistants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setAssistants(data.assistants)
      }
    } catch (error) {
      console.error('Error fetching assistants:', error)
    }
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (selectedAssistant) {
        params.append('assistantId', selectedAssistant)
      }
      
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatLatency = (ms) => {
    return `${Math.round(ms)}ms`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'var(--accent-primary)'
      case 'failed': return '#ff4757'
      case 'active': return '#ffa502'
      default: return 'var(--text-secondary)'
    }
  }

  if (loading) {
    return (
      <div className="analytics">
        <div className="container">
          <div className="loading-state">
            <FiRefreshCw className="loading-spinner" />
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics">
      <div className="container">
        {/* Header */}
        <div className="analytics-header">
          <div className="header-content">
            <h1>Analytics Dashboard</h1>
            <p>Comprehensive insights into your voice AI performance</p>
          </div>
          
          <div className="header-controls">
            <select 
              value={selectedAssistant} 
              onChange={(e) => setSelectedAssistant(e.target.value)}
              className="filter-select"
            >
              <option value="">All Assistants</option>
              {assistants.map(assistant => (
                <option key={assistant._id} value={assistant._id}>
                  {assistant.name}
                </option>
              ))}
            </select>
            
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className="filter-select"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            
            <button onClick={fetchAnalytics} className="refresh-btn">
              <FiRefreshCw />
            </button>
          </div>
        </div>

        {analytics && (
          <>
            {/* Overview Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(84, 245, 196, 0.1)' }}>
                  <FiPhone color="var(--accent-primary)" />
                </div>
                <div className="stat-content">
                  <h3>{analytics.overview.totalCalls}</h3>
                  <p>Total Calls</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(84, 245, 196, 0.1)' }}>
                  <FiCheckCircle color="var(--accent-primary)" />
                </div>
                <div className="stat-content">
                  <h3>{analytics.overview.successRate.toFixed(1)}%</h3>
                  <p>Success Rate</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(84, 245, 196, 0.1)' }}>
                  <FiClock color="var(--accent-primary)" />
                </div>
                <div className="stat-content">
                  <h3>{formatDuration(analytics.overview.averageDuration)}</h3>
                  <p>Avg Duration</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(84, 245, 196, 0.1)' }}>
                  <FiActivity color="var(--accent-primary)" />
                </div>
                <div className="stat-content">
                  <h3>{formatLatency(analytics.performance.averageLatency)}</h3>
                  <p>Avg Latency</p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
              {/* Daily Calls Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3><FiBarChart /> Daily Call Volume</h3>
                </div>
                <div className="chart-content">
                  <div className="bar-chart">
                    {analytics.dailyStats.map((day, index) => (
                      <div key={day.date} className="bar-item">
                        <div 
                          className="bar" 
                          style={{ 
                            height: `${Math.max((day.calls / Math.max(...analytics.dailyStats.map(d => d.calls))) * 100, 5)}%` 
                          }}
                          title={`${day.calls} calls on ${day.date}`}
                        ></div>
                        <span className="bar-label">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Call Status Distribution */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3><FiPieChart /> Call Status Distribution</h3>
                </div>
                <div className="chart-content">
                  <div className="status-chart">
                    <div className="status-item">
                      <div className="status-indicator completed"></div>
                      <span>Completed ({analytics.overview.completedCalls})</span>
                    </div>
                    <div className="status-item">
                      <div className="status-indicator failed"></div>
                      <span>Failed ({analytics.overview.failedCalls})</span>
                    </div>
                    <div className="status-item">
                      <div className="status-indicator active"></div>
                      <span>Active ({analytics.overview.activeCalls})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="performance-section">
              <h3>Performance Metrics</h3>
              <div className="performance-grid">
                <div className="performance-card">
                  <h4>Speech-to-Text</h4>
                  <div className="metric-value">{formatLatency(analytics.performance.averageSttLatency)}</div>
                </div>
                <div className="performance-card">
                  <h4>LLM Processing</h4>
                  <div className="metric-value">{formatLatency(analytics.performance.averageLlmLatency)}</div>
                </div>
                <div className="performance-card">
                  <h4>Text-to-Speech</h4>
                  <div className="metric-value">{formatLatency(analytics.performance.averageTtsLatency)}</div>
                </div>
                <div className="performance-card">
                  <h4>Total Latency</h4>
                  <div className="metric-value">{formatLatency(analytics.performance.averageLatency)}</div>
                </div>
              </div>
            </div>

            {/* Assistant Performance */}
            {analytics.assistantStats.length > 0 && (
              <div className="assistant-section">
                <h3>Assistant Performance</h3>
                <div className="assistant-table">
                  <div className="table-header">
                    <span>Assistant</span>
                    <span>Calls</span>
                    <span>Success Rate</span>
                    <span>Total Duration</span>
                  </div>
                  {analytics.assistantStats.map((assistant) => {
                    const assistantData = assistants.find(a => a._id === assistant.assistantId)
                    const successRate = assistant.calls > 0 ? (assistant.completed / assistant.calls) * 100 : 0
                    
                    return (
                      <div key={assistant.assistantId} className="table-row">
                        <span className="assistant-name">
                          {assistantData?.name || 'Unknown Assistant'}
                        </span>
                        <span>{assistant.calls}</span>
                        <span className="success-rate">
                          {successRate.toFixed(1)}%
                        </span>
                        <span>{formatDuration(assistant.duration)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent Calls */}
            <div className="recent-calls-section">
              <h3>Recent Calls</h3>
              <div className="calls-table">
                <div className="table-header">
                  <span>Call ID</span>
                  <span>Assistant</span>
                  <span>Duration</span>
                  <span>Status</span>
                  <span>Started</span>
                </div>
                {analytics.recentCalls.map((call) => {
                  const assistantData = assistants.find(a => a._id === call.assistantId)
                  
                  return (
                    <div key={call.callId} className="table-row">
                      <span className="call-id">{call.callId}</span>
                      <span>{assistantData?.name || 'Unknown'}</span>
                      <span>{formatDuration(call.duration || 0)}</span>
                      <span 
                        className="status-badge"
                        style={{ color: getStatusColor(call.status) }}
                      >
                        {call.status}
                      </span>
                      <span>{new Date(call.startTime).toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Analytics