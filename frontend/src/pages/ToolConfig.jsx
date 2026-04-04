import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiSave, FiX, FiPlus, FiTrash2, FiInfo, FiCode, FiArrowLeft } from 'react-icons/fi'
import config from '../config'
import './ToolConfig.css'

function ToolConfig() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'new'

  const [config, setConfig] = useState({
    name: '',
    description: '',
    async: false,
    strict: false,
    parameters: [],
    lockSchema: false,
    serverUrl: '',
    timeout: 20,
    credentials: '',
    httpHeaders: [],
    encryptedPaths: [],
    staticBodyFields: [],
    responseVariables: [],
    responseAliases: [],
    messages: {
      requesting: '',
      success: '',
      error: ''
    }
  })

  const [tools, setTools] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  const [expandedSections, setExpandedSections] = useState({
    toolSettings: true,
    parameters: true,
    serverSettings: true,
    authorization: false,
    encryption: false,
    staticBody: false,
    responseBody: false,
    messages: false
  })

  useEffect(() => {
    fetchTools()
    if (!isNew) {
      fetchTool()
    }
  }, [id])

  const fetchTools = async () => {
    try {
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
    }
  }

  const fetchTool = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tools/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.success && data.tool) {
        // Ensure all fields have default values to prevent controlled/uncontrolled errors
        setConfig({
          name: data.tool.name || '',
          description: data.tool.description || '',
          async: data.tool.async || false,
          strict: data.tool.strict || false,
          parameters: data.tool.parameters || [],
          lockSchema: data.tool.lockSchema || false,
          serverUrl: data.tool.url || data.tool.serverUrl || '',
          timeout: data.tool.timeout || 20,
          credentials: data.tool.credentials || '',
          httpHeaders: data.tool.httpHeaders || [],
          encryptedPaths: data.tool.encryptedPaths || [],
          staticBodyFields: data.tool.staticBodyFields || [],
          responseVariables: data.tool.responseVariables || [],
          responseAliases: data.tool.responseAliases || [],
          messages: data.tool.messages || {
            requesting: '',
            success: '',
            error: ''
          }
        })
      }
    } catch (error) {
      console.error('❌ Error fetching tool:', error)
    }
  }

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.error('❌ No auth token found')
        alert('Please login first')
        return
      }
      
      const url = isNew ? '/api/tools' : `/api/tools/${id}`
      const method = isNew ? 'POST' : 'PUT'

      // Transform frontend format to backend format
      const backendData = {
        name: config.name || 'Untitled Tool',
        description: config.description || '',
        url: config.serverUrl || '',
        method: 'GET', // Default method
        headers: {},
        parameters: config.parameters || []
      }

      console.log('💾 Saving tool to:', url)
      console.log('📦 Tool data:', JSON.stringify(backendData, null, 2))
      console.log('🔑 Token:', token ? 'Present' : 'Missing')

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(backendData)
      })

      console.log('📡 Response status:', response.status, response.statusText)
      
      const data = await response.json()
      
      console.log('📥 Save response:', JSON.stringify(data, null, 2))
      
      if (data.success) {
        console.log('✅ Tool saved successfully!')
        alert('Tool saved successfully!')
        // Refresh tools list
        await fetchTools()
        // If new tool, navigate to edit mode
        if (isNew && data.tool) {
          console.log('🔄 Navigating to:', `/tools/${data.tool.id}`)
          navigate(`/tools/${data.tool.id}`)
        }
      } else {
        console.error('❌ Save failed:', data.error)
        alert(`Failed to save: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error saving tool:', error)
      console.error('Stack:', error.stack)
      alert(`Error saving tool: ${error.message}`)
    }
  }

  const filteredTools = tools.filter(tool =>
    tool.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const addParameter = () => {
    setConfig(prev => ({
      ...prev,
      parameters: [...prev.parameters, {
        name: '',
        type: 'string',
        description: '',
        required: false
      }]
    }))
  }

  const updateParameter = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      parameters: prev.parameters.map((param, i) =>
        i === index ? { ...param, [field]: value } : param
      )
    }))
  }

  const removeParameter = (index) => {
    setConfig(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }))
  }

  const addHttpHeader = () => {
    setConfig(prev => ({
      ...prev,
      httpHeaders: [...prev.httpHeaders, { key: '', value: '' }]
    }))
  }

  const updateHttpHeader = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      httpHeaders: prev.httpHeaders.map((header, i) =>
        i === index ? { ...header, [field]: value } : header
      )
    }))
  }

  const removeHttpHeader = (index) => {
    setConfig(prev => ({
      ...prev,
      httpHeaders: prev.httpHeaders.filter((_, i) => i !== index)
    }))
  }

  const addStaticField = () => {
    setConfig(prev => ({
      ...prev,
      staticBodyFields: [...prev.staticBodyFields, { key: '', value: '' }]
    }))
  }

  const updateStaticField = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      staticBodyFields: prev.staticBodyFields.map((field, i) =>
        i === index ? { ...field, [field]: value } : field
      )
    }))
  }

  const removeStaticField = (index) => {
    setConfig(prev => ({
      ...prev,
      staticBodyFields: prev.staticBodyFields.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="tool-config-layout">
      {/* Left Sidebar - Tools List */}
      <div className="tools-sidebar">
        <div className="sidebar-header">
          <h2>Tools</h2>
          <button className="btn-create-sidebar" onClick={() => navigate('/tools/new')}>
            <FiPlus />
          </button>
        </div>

        <div className="sidebar-search">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search Tools"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="tools-list">
          {filteredTools.map(tool => (
            <div
              key={tool.id}
              className={`tool-list-item ${tool.id === id ? 'active' : ''}`}
              onClick={() => navigate(`/tools/${tool.id}`)}
            >
              <div className="tool-list-icon">
                <FiSettings />
              </div>
              <div className="tool-list-info">
                <div className="tool-list-name">{tool.name || 'Untitled'}</div>
                <div className="tool-list-id">{tool.id}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="tool-config">
      {/* Header */}
      <div className="config-header">
        <button className="back-btn" onClick={() => navigate('/tools')}>
          <FiArrowLeft /> Back
        </button>
        <h1>{isNew ? 'Create Tool' : config.name || 'Edit Tool'}</h1>
        <div className="header-actions">
          <button className="btn-secondary">Code</button>
          <button className="btn-secondary">Test</button>
          <button className="btn-save" onClick={handleSave}>
            <FiSave /> Save
          </button>
        </div>
      </div>

      {/* Tool Settings */}
      <div className="config-section">
        <div className="section-header" onClick={() => toggleSection('toolSettings')}>
          <h2>Tool Settings</h2>
          {expandedSections.toolSettings ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.toolSettings && (
          <div className="section-content">
            <p className="section-subtitle">Configure the basic settings for this tool.</p>
            
            <div className="form-group">
              <label>Tool Name</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="e.g., check_order_status"
              />
            </div>

            <div className="form-group">
              <label>Description <span className="char-count">0/1000</span></label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Describe the tool in a few sentences"
                rows={3}
              />
            </div>

            <div className="form-group">
              <h3>Options</h3>
              <div className="toggle-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={config.async}
                    onChange={(e) => setConfig({ ...config, async: e.target.checked })}
                  />
                  <span className="toggle-switch"></span>
                  <div className="toggle-info">
                    <span className="toggle-title">Async</span>
                    <span className="toggle-desc">Tool executes asynchronously</span>
                  </div>
                </label>

                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={config.strict}
                    onChange={(e) => setConfig({ ...config, strict: e.target.checked })}
                  />
                  <span className="toggle-switch"></span>
                  <div className="toggle-info">
                    <span className="toggle-title">Strict</span>
                    <span className="toggle-desc">Enforces strict parameter validation</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parameters */}
      <div className="config-section">
        <div className="section-header" onClick={() => toggleSection('parameters')}>
          <h2>Parameters</h2>
          {expandedSections.parameters ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.parameters && (
          <div className="section-content">
            <p className="section-subtitle">Define the parameters your tool accepts</p>
            
            <button className="btn-add" onClick={addParameter}>
              <FiPlus /> Add Property
            </button>

            {config.parameters.length === 0 ? (
              <div className="empty-message">
                No parameters defined. Click "Add Property" to define tool parameters.
              </div>
            ) : (
              <div className="parameters-list">
                {config.parameters.map((param, index) => (
                  <div key={index} className="parameter-item">
                    <div className="parameter-row">
                      <input
                        type="text"
                        placeholder="Parameter name"
                        value={param.name}
                        onChange={(e) => updateParameter(index, 'name', e.target.value)}
                      />
                      <select
                        value={param.type}
                        onChange={(e) => updateParameter(index, 'type', e.target.value)}
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="array">Array</option>
                        <option value="object">Object</option>
                      </select>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                        />
                        Required
                      </label>
                      <button 
                        className="btn-icon-danger"
                        onClick={() => removeParameter(index)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Description"
                      value={param.description}
                      onChange={(e) => updateParameter(index, 'description', e.target.value)}
                      className="parameter-description"
                    />
                  </div>
                ))}
              </div>
            )}

            <label className="checkbox-label mt-3">
              <input
                type="checkbox"
                checked={config.lockSchema}
                onChange={(e) => setConfig({ ...config, lockSchema: e.target.checked })}
              />
              Lock schema (no additional properties)
            </label>
          </div>
        )}
      </div>

      {/* Server Settings */}
      <div className="config-section">
        <div className="section-header" onClick={() => toggleSection('serverSettings')}>
          <h2>Server Settings</h2>
          {expandedSections.serverSettings ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.serverSettings && (
          <div className="section-content">
            <p className="section-subtitle">Configure your server URL and connection settings</p>
            
            <div className="form-group">
              <label>Server URL</label>
              <input
                type="url"
                value={config.serverUrl}
                onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                placeholder="https://api.example.com/function"
              />
            </div>

            <div className="form-group">
              <label>Timeout (seconds)</label>
              <input
                type="number"
                value={config.timeout}
                onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
                min="1"
                max="300"
              />
              <small>Must be between 1 and 300 seconds</small>
            </div>
          </div>
        )}
      </div>

      {/* Authorization */}
      <div className="config-section">
        <div className="section-header" onClick={() => toggleSection('authorization')}>
          <h2>Authorization</h2>
          {expandedSections.authorization ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.authorization && (
          <div className="section-content">
            <p className="section-subtitle">Select a custom credential to authenticate API requests</p>
            
            <div className="form-group">
              <label>Credential</label>
              <select
                value={config.credentials || ''}
                onChange={(e) => setConfig({ ...config, credentials: e.target.value })}
              >
                <option value="">No authentication</option>
                <option value="api-key">API Key</option>
                <option value="bearer">Bearer Token</option>
              </select>
            </div>

            <div className="form-group">
              <label>HTTP Headers</label>
              <button className="btn-add" onClick={addHttpHeader}>
                <FiPlus /> Add Header
              </button>
              
              {config.httpHeaders.length === 0 ? (
                <div className="empty-message">
                  No headers configured. Click "Add Header" to add your first header.
                </div>
              ) : (
                <div className="key-value-list">
                  {config.httpHeaders.map((header, index) => (
                    <div key={index} className="key-value-item">
                      <input
                        type="text"
                        placeholder="Header name"
                        value={header.key}
                        onChange={(e) => updateHttpHeader(index, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Header value"
                        value={header.value}
                        onChange={(e) => updateHttpHeader(index, 'value', e.target.value)}
                      />
                      <button 
                        className="btn-icon-danger"
                        onClick={() => removeHttpHeader(index)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Static Body Fields */}
      <div className="config-section">
        <div className="section-header" onClick={() => toggleSection('staticBody')}>
          <h2>Static Body Fields</h2>
          {expandedSections.staticBody ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.staticBody && (
          <div className="section-content">
            <p className="section-subtitle">Key-value pairs always sent in the request body</p>
            
            <button className="btn-add" onClick={addStaticField}>
              <FiPlus /> Add Field
            </button>

            {config.staticBodyFields.length === 0 ? (
              <div className="empty-message">
                No static body fields configured. Click "Add Field" to add one.
              </div>
            ) : (
              <div className="key-value-list">
                {config.staticBodyFields.map((field, index) => (
                  <div key={index} className="key-value-item">
                    <input
                      type="text"
                      placeholder="Key"
                      value={field.key}
                      onChange={(e) => updateStaticField(index, 'key', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) => updateStaticField(index, 'value', e.target.value)}
                    />
                    <button 
                      className="btn-icon-danger"
                      onClick={() => removeStaticField(index)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response Body */}
      <div className="config-section">
        <div className="section-header" onClick={() => toggleSection('responseBody')}>
          <h2>Response Body</h2>
          {expandedSections.responseBody ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.responseBody && (
          <div className="section-content">
            <p className="section-subtitle">Assign dynamic variables extracted from the API response data</p>
            
            <div className="empty-message">
              No response variables configured. Variables will be extracted automatically from the response.
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="config-section">
        <div className="section-header" onClick={() => toggleSection('messages')}>
          <h2>Messages</h2>
          {expandedSections.messages ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.messages && (
          <div className="section-content">
            <p className="section-subtitle">Configure messages to be spoken during different stages of tool execution</p>
            
            <div className="empty-message">
              No messages configured. The assistant will use default messages during tool execution.
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

export default ToolConfig
