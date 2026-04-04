import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiSearch, FiSettings } from 'react-icons/fi'
import config from '../config'
import './Tools.css'

function Tools() {
  const navigate = useNavigate()
  const [tools, setTools] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTools()
  }, [])

  const fetchTools = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tools', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setTools(data.tools)
      }
    } catch (error) {
      console.error('❌ Error fetching tools:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTools = tools.filter(tool =>
    tool.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="tools-page">
      {/* Header */}
      <div className="tools-header">
        <div className="header-left">
          <h1>Tools</h1>
          <p className="subtitle">Configure tools and functions to extend your assistant's capabilities.</p>
        </div>
        <button className="btn-create" onClick={() => navigate('/tools/new')}>
          <FiPlus /> Create Tool
        </button>
      </div>

      {/* Search */}
      <div className="tools-search">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tools Grid */}
      <div className="tools-grid">
        {isLoading ? (
          <div className="loading-state">Loading tools...</div>
        ) : filteredTools.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔧</div>
            <h3>No tools yet</h3>
            <p>Create your first tool to extend your assistant's capabilities</p>
            <button className="btn-create" onClick={() => navigate('/tools/new')}>
              <FiPlus /> Create Tool
            </button>
          </div>
        ) : (
          filteredTools.map(tool => (
            <div 
              key={tool.id} 
              className="tool-card"
              onClick={() => navigate(`/tools/${tool.id}`)}
            >
              <div className="tool-icon">
                <FiSettings />
              </div>
              <div className="tool-info">
                <h3>{tool.name || 'Untitled Tool'}</h3>
                <p className="tool-description">
                  {tool.description || 'No description'}
                </p>
                <div className="tool-meta">
                  <span className="tool-type">Function</span>
                  {tool.async && <span className="tool-badge">Async</span>}
                  {tool.strict && <span className="tool-badge">Strict</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Tools
