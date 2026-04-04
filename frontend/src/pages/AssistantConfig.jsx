import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiSave, FiX, FiPlus, FiTrash2, FiInfo, FiCode, FiArrowLeft } from 'react-icons/fi'
import config from '../config'
import './AssistantConfig.css'

function AssistantConfig() {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [activeTab, setActiveTab] = useState('model')
  const [config, setConfig] = useState({
    name: id === 'new' ? '' : 'New Assistant',
    provider: 'Groq',
    model: 'llama-3.1-8b-instant',
    firstMessageMode: 'assistant-speaks-first',
    firstMessage: 'Hello.',
    systemPrompt: 'This is a blank template with minimal defaults, you can change the model, temperature, and messages.',
    maxTokens: 250,
    temperature: 0.5,
    tools: [],
    // Voice configuration
    voiceProvider: 'Cartesia',
    voiceModel: 'sonic-3',
    voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
    voiceLanguage: 'en',
    voiceDialect: 'us',
    voiceSpeed: 1.0,
    voiceEmotion: 'neutral',
    voiceVolume: 1.0,
    voicePitch: 1.0
  })

  const [groqModels, setGroqModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [availableTools, setAvailableTools] = useState([])
  const [isLoadingTools, setIsLoadingTools] = useState(false)

  // Fetch Groq models from API
  useEffect(() => {
    const fetchGroqModels = async () => {
      try {
        setIsLoadingModels(true)
        const response = await fetch('/api/models')
        const data = await response.json()
        
        if (data.success && data.models.llm) {
          const modelsList = Object.entries(data.models.llm).map(([key, value]) => ({
            key,
            name: value.name || key,
            latency: value.latency,
            speed: value.speed,
            pricing: value.pricing,
            description: value.description,
            contextWindow: value.contextWindow,
            ownedBy: value.ownedBy
          }))
          setGroqModels(modelsList)
          console.log('✅ Loaded Groq models:', modelsList.length)
        }
      } catch (error) {
        console.error('❌ Error fetching Groq models:', error)
        // Fallback to hardcoded models
        setGroqModels([
          { key: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70b Versatile' },
          { key: 'llama-3.1-8b-instant', name: 'Llama 3.1 8b Instant' },
          { key: 'mixtral-8x7b-32768', name: 'Mixtral 8x7b 32768' }
        ])
      } finally {
        setIsLoadingModels(false)
      }
    }

    fetchGroqModels()
  }, [])

  // Fetch available tools
  useEffect(() => {
    const fetchTools = async () => {
      try {
        setIsLoadingTools(true)
        const token = localStorage.getItem('token')
        const response = await fetch('/api/tools', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        
        if (data.success) {
          setAvailableTools(data.tools)
          console.log('✅ Loaded tools:', data.tools.length)
        }
      } catch (error) {
        console.error('❌ Error fetching tools:', error)
      } finally {
        setIsLoadingTools(false)
      }
    }

    fetchTools()
  }, [])

  const providers = [
    'OpenAI',
    'Groq',
    'Anthropic',
    'Google'
  ]

  const handleSave = () => {
    console.log('Saving config:', config)
    // TODO: Save to backend
    navigate('/assistants')
  }

  const handleToolToggle = (toolId) => {
    setConfig(prev => ({
      ...prev,
      tools: prev.tools.includes(toolId)
        ? prev.tools.filter(id => id !== toolId)
        : [...prev.tools, toolId]
    }))
  }

  return (
    <div className="assistant-config">
      {/* Header */}
      <div className="config-header">
        <button className="back-btn" onClick={() => navigate('/assistants')}>
          <FiArrowLeft /> Back
        </button>
        <div className="header-title">
          <h1>{id === 'new' ? 'New Assistant' : config.name}</h1>
          <span className="assistant-id">2&4125&2-e18a-4e55-8eb6-...</span>
        </div>
        <div className="header-actions">
          <button className="btn-secondary">Code</button>
          <button className="btn-secondary">Test</button>
          <button className="btn-secondary">Chat</button>
          <button className="btn-primary">Talk to Assistant</button>
          <button className="btn-success">Published</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="config-tabs">
        <button 
          className={`tab-btn ${activeTab === 'model' ? 'active' : ''}`}
          onClick={() => setActiveTab('model')}
        >
          Model
        </button>
        <button 
          className={`tab-btn ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          Voice
        </button>
        <button 
          className={`tab-btn ${activeTab === 'transcriber' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcriber')}
        >
          Transcriber
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          Tools
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          Analysis
        </button>
        <button 
          className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
        <button 
          className={`tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
          onClick={() => setActiveTab('compliance')}
        >
          Compliance
        </button>
        <button 
          className={`tab-btn ${activeTab === 'widget' ? 'active' : ''}`}
          onClick={() => setActiveTab('widget')}
        >
          Widget
        </button>
      </div>

      {/* Provider Tags */}
      <div className="provider-tags">
        <span className="tag active">vapi</span>
        <span className="tag">deepgram</span>
        <span className="tag">gpt 4o</span>
        <span className="tag">vapi</span>
        <span className="tag">web</span>
      </div>

      {/* Cost and Latency */}
      <div className="metrics-bar">
        <div className="metric-item">
          <span className="metric-label">Cost</span>
          <div className="metric-bar">
            <div className="bar-segment teal" style={{ width: '35%' }}></div>
            <div className="bar-segment orange" style={{ width: '20%' }}></div>
            <div className="bar-segment yellow" style={{ width: '15%' }}></div>
            <div className="bar-segment blue" style={{ width: '15%' }}></div>
            <div className="bar-segment gray" style={{ width: '15%' }}></div>
          </div>
          <span className="metric-value">~$0.1 /min</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Latency</span>
          <div className="metric-bar">
            <div className="bar-segment orange" style={{ width: '25%' }}></div>
            <div className="bar-segment yellow" style={{ width: '30%' }}></div>
            <div className="bar-segment blue" style={{ width: '25%' }}></div>
            <div className="bar-segment purple" style={{ width: '20%' }}></div>
          </div>
          <span className="metric-value">~1050 ms</span>
        </div>
      </div>

      {/* Main Configuration */}
      <div className="config-content">
        {/* Model Tab */}
        {activeTab === 'model' && (
        <div className="config-section">
          <h2 className="section-title">MODEL</h2>
          <p className="section-subtitle">Configure the behavior of the assistant.</p>

          {/* Provider */}
          <div className="form-group">
            <label>Provider</label>
            <select 
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
            >
              {providers.map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div className="form-group">
            <label>Model (Groq) <span className="label-info">ⓘ</span></label>
            <select 
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              disabled={isLoadingModels}
            >
              {isLoadingModels ? (
                <option>Loading models...</option>
              ) : groqModels.length > 0 ? (
                      groqModels.map(model => (
                        <option key={model.key} value={model.key}>
                          {model.name} - {model.speed} TPS - ${model.pricing?.inputPerMinute}/${model.pricing?.outputPerMinute} per min
                        </option>
                      ))
              ) : (
                <option value="llama-3.3-70b-versatile">Llama 3.3 70b Versatile</option>
              )}
            </select>
          </div>

          {/* First Message Mode */}
          <div className="form-group">
            <label>First Message Mode <span className="label-info">ⓘ</span></label>
            <select 
              value={config.firstMessageMode}
              onChange={(e) => setConfig({ ...config, firstMessageMode: e.target.value })}
            >
              <option value="assistant-speaks-first">Assistant speaks first</option>
              <option value="assistant-waits">Assistant waits for user</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* First Message */}
          <div className="form-group">
            <label>First Message <span className="label-info">ⓘ</span></label>
            <textarea
              value={config.firstMessage}
              onChange={(e) => setConfig({ ...config, firstMessage: e.target.value })}
              placeholder="Enter the first message..."
              rows={2}
            />
          </div>

          {/* System Prompt */}
          <div className="form-group">
            <label>
              System Prompt <span className="label-info">ⓘ</span>
              <button className="generate-btn">✨ Generate</button>
            </label>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              placeholder="Enter system prompt..."
              rows={6}
            />
          </div>

          {/* Files */}
          <div className="form-group">
            <label>Files <span className="label-info">ⓘ</span></label>
            <button className="select-files-btn">Select Files</button>
          </div>

          {/* Max Tokens and Temperature */}
          <div className="form-row">
            <div className="form-group">
              <label>Max Tokens <span className="label-info">ⓘ</span></label>
              <input
                type="number"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                min="1"
                max="4096"
              />
            </div>
            <div className="form-group">
              <label>Temperature <span className="label-info">ⓘ</span></label>
              <div className="temperature-control">
                <input
                  type="range"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  min="0"
                  max="1"
                  step="0.1"
                />
                <span className="temperature-value">{config.temperature}</span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Voice Tab */}
        {activeTab === 'voice' && (
        <div className="config-section">
          <h2 className="section-title">VOICE</h2>
          <p className="section-subtitle">Configure the voice characteristics and accent for your assistant.</p>

          {/* Voice Provider */}
          <div className="form-group">
            <label>Voice Provider</label>
            <select 
              value={config.voiceProvider}
              onChange={(e) => setConfig({ ...config, voiceProvider: e.target.value })}
            >
              <option value="Cartesia">Cartesia</option>
              <option value="ElevenLabs">ElevenLabs</option>
              <option value="OpenAI">OpenAI</option>
            </select>
          </div>

          {/* Voice Model */}
          <div className="form-group">
            <label>Voice Model <span className="label-info">ⓘ</span></label>
            <select 
              value={config.voiceModel}
              onChange={(e) => setConfig({ ...config, voiceModel: e.target.value })}
            >
              <option value="sonic-3">Sonic-3 (Latest - Emotion Control)</option>
              <option value="sonic-2">Sonic-2 (Most Capable)</option>
              <option value="sonic-turbo">Sonic Turbo (Fastest)</option>
              <option value="sonic-english">Sonic English</option>
              <option value="sonic-multilingual">Sonic Multilingual</option>
            </select>
          </div>

          {/* Voice Selection */}
          <div className="form-group">
            <label>Voice <span className="label-info">ⓘ</span></label>
            <select 
              value={config.voiceId}
              onChange={(e) => setConfig({ ...config, voiceId: e.target.value })}
            >
              <option value="a0e99841-438c-4a64-b679-ae501e7d6091">Sarah (Female, Professional)</option>
              <option value="b7d50908-b17c-442d-ad8d-810c63997ed9">David (Male, Friendly)</option>
              <option value="c45a5188-4f34-4d51-9b6f-8e7a2c8d9e0f">Emma (Female, Warm)</option>
              <option value="d56b6299-5e45-5e62-ac7g-9f8b3d9e0f1g">James (Male, Authoritative)</option>
            </select>
          </div>

          {/* Language and Accent */}
          <div className="form-row">
            <div className="form-group">
              <label>Language <span className="label-info">ⓘ</span></label>
              <select 
                value={config.voiceLanguage}
                onChange={(e) => setConfig({ ...config, voiceLanguage: e.target.value })}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="hi">Hindi</option>
                <option value="ru">Russian</option>
                <option value="nl">Dutch</option>
                <option value="pl">Polish</option>
                <option value="sv">Swedish</option>
                <option value="tr">Turkish</option>
              </select>
            </div>
            <div className="form-group">
              <label>Accent/Dialect <span className="label-info">ⓘ</span></label>
              <select 
                value={config.voiceDialect}
                onChange={(e) => setConfig({ ...config, voiceDialect: e.target.value })}
                disabled={!['en', 'es', 'pt', 'fr'].includes(config.voiceLanguage)}
              >
                {config.voiceLanguage === 'en' && (
                  <>
                    <option value="us">US English</option>
                    <option value="uk">British English</option>
                    <option value="au">Australian English</option>
                    <option value="in">Indian English</option>
                    <option value="so">South African English</option>
                  </>
                )}
                {config.voiceLanguage === 'es' && (
                  <>
                    <option value="es">Spain Spanish</option>
                    <option value="mx">Mexican Spanish</option>
                    <option value="ar">Argentinian Spanish</option>
                  </>
                )}
                {config.voiceLanguage === 'pt' && (
                  <>
                    <option value="br">Brazilian Portuguese</option>
                    <option value="pt">European Portuguese</option>
                  </>
                )}
                {config.voiceLanguage === 'fr' && (
                  <>
                    <option value="fr">French (France)</option>
                    <option value="ca">Canadian French</option>
                  </>
                )}
                {!['en', 'es', 'pt', 'fr'].includes(config.voiceLanguage) && (
                  <option value="">No dialect options available</option>
                )}
              </select>
            </div>
          </div>

          {/* Voice Controls */}
          <div className="voice-controls">
            <h3>Voice Characteristics</h3>
            
            {/* Speed Control */}
            <div className="form-group">
              <label>Speed <span className="label-info">ⓘ</span></label>
              <div className="slider-control">
                <input
                  type="range"
                  value={config.voiceSpeed}
                  onChange={(e) => setConfig({ ...config, voiceSpeed: parseFloat(e.target.value) })}
                  min="0.5"
                  max="2.0"
                  step="0.1"
                />
                <span className="slider-value">{config.voiceSpeed}x</span>
              </div>
              <p className="help-text">Control speaking speed (0.5x = slow, 2.0x = fast)</p>
            </div>

            {/* Volume Control */}
            <div className="form-group">
              <label>Volume <span className="label-info">ⓘ</span></label>
              <div className="slider-control">
                <input
                  type="range"
                  value={config.voiceVolume}
                  onChange={(e) => setConfig({ ...config, voiceVolume: parseFloat(e.target.value) })}
                  min="0.5"
                  max="2.0"
                  step="0.1"
                />
                <span className="slider-value">{config.voiceVolume}x</span>
              </div>
              <p className="help-text">Control voice volume (0.5x = quiet, 2.0x = loud)</p>
            </div>

            {/* Emotion Control (Sonic-3 only) */}
            {config.voiceModel === 'sonic-3' && (
              <div className="form-group">
                <label>Emotion <span className="label-info">ⓘ</span></label>
                <select 
                  value={config.voiceEmotion}
                  onChange={(e) => setConfig({ ...config, voiceEmotion: e.target.value })}
                >
                  <option value="neutral">Neutral</option>
                  <option value="happy">Happy</option>
                  <option value="sad">Sad</option>
                  <option value="angry">Angry</option>
                  <option value="excited">Excited</option>
                  <option value="calm">Calm</option>
                  <option value="confident">Confident</option>
                  <option value="empathetic">Empathetic</option>
                </select>
                <p className="help-text">Emotional tone for Sonic-3 model</p>
              </div>
            )}

            {/* Pitch Control */}
            <div className="form-group">
              <label>Pitch <span className="label-info">ⓘ</span></label>
              <div className="slider-control">
                <input
                  type="range"
                  value={config.voicePitch}
                  onChange={(e) => setConfig({ ...config, voicePitch: parseFloat(e.target.value) })}
                  min="0.5"
                  max="2.0"
                  step="0.1"
                />
                <span className="slider-value">{config.voicePitch}x</span>
              </div>
              <p className="help-text">Control voice pitch (0.5x = lower, 2.0x = higher)</p>
            </div>
          </div>

          {/* Voice Preview */}
          <div className="form-group">
            <label>Voice Preview</label>
            <div className="voice-preview">
              <textarea
                placeholder="Enter text to preview the voice..."
                rows={3}
                defaultValue="Hello! This is how I will sound with the current voice settings."
              />
              <button className="btn-secondary preview-btn">🔊 Preview Voice</button>
            </div>
          </div>
        </div>
        )}

        {/* Transcriber Tab */}
        {activeTab === 'transcriber' && (
        <div className="config-section">
          <h2 className="section-title">TRANSCRIBER</h2>
          <p className="section-subtitle">Configure speech-to-text settings for your assistant.</p>
          
          <div className="form-group">
            <label>Transcriber Provider</label>
            <select defaultValue="Deepgram">
              <option value="Deepgram">Deepgram</option>
              <option value="OpenAI">OpenAI Whisper</option>
              <option value="Google">Google Speech-to-Text</option>
            </select>
          </div>

          <div className="form-group">
            <label>Language Detection</label>
            <select defaultValue="auto">
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
        <div className="config-section">
          <h2 className="section-title">ANALYSIS</h2>
          <p className="section-subtitle">Configure call analysis and insights.</p>
          
          <div className="form-group">
            <label>Enable Call Analysis</label>
            <input type="checkbox" defaultChecked />
            <p className="help-text">Analyze calls for sentiment, keywords, and insights</p>
          </div>
        </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
        <div className="config-section">
          <h2 className="section-title">ADVANCED</h2>
          <p className="section-subtitle">Advanced configuration options.</p>
          
          <div className="form-group">
            <label>Silence Timeout (ms)</label>
            <input type="number" defaultValue="1000" />
          </div>

          <div className="form-group">
            <label>Max Call Duration (minutes)</label>
            <input type="number" defaultValue="30" />
          </div>
        </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
        <div className="config-section">
          <h2 className="section-title">COMPLIANCE</h2>
          <p className="section-subtitle">Configure compliance and privacy settings.</p>
          
          <div className="form-group">
            <label>Record Calls</label>
            <input type="checkbox" />
            <p className="help-text">Enable call recording for compliance</p>
          </div>
        </div>
        )}

        {/* Widget Tab */}
        {activeTab === 'widget' && (
        <div className="config-section">
          <h2 className="section-title">WIDGET</h2>
          <p className="section-subtitle">Configure the web widget for your assistant.</p>
          
          <div className="form-group">
            <label>Widget Theme</label>
            <select defaultValue="light">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
        )}
        {activeTab === 'tools' && (
        <div className="config-section">
          <h2 className="section-title">TOOLS</h2>
          <p className="section-subtitle">Configure tools and functions to extend your assistant's capabilities.</p>

          {/* Tools Section */}
          <div className="form-group">
            <label>Tools</label>
            <p className="help-text">
              Tools enable voicebots to perform actions during calls. Add tools from the Tools Library to connect with Make.com or GHL workflows, or create custom tools with your backend.
            </p>
            
            <div className="info-box">
              <span className="info-icon">ℹ️</span>
              <span>Note: Tools have different Request and Response format as compared to Functions. Check our <a href="#" className="link">tools guide</a> for more details</span>
            </div>

            <div className="form-group">
              <label>Select Tools</label>
              {isLoadingTools ? (
                <div className="loading-message">Loading tools...</div>
              ) : availableTools.length === 0 ? (
                <div className="empty-tools-message">
                  <p>No tools available. <a href="/tools/new" className="link">Create your first tool</a></p>
                </div>
              ) : (
                <div className="tools-selection">
                  {availableTools.map(tool => (
                    <label key={tool.id} className="tool-checkbox-label">
                      <input
                        type="checkbox"
                        checked={config.tools.includes(tool.id)}
                        onChange={() => handleToolToggle(tool.id)}
                      />
                      <div className="tool-checkbox-info">
                        <span className="tool-checkbox-name">{tool.name || 'Untitled Tool'}</span>
                        <span className="tool-checkbox-desc">{tool.description || 'No description'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Predefined Functions */}
          <div className="form-group">
            <label>Predefined Functions</label>
            <p className="help-text">
              We've pre-built functions for common use cases. You can enable them and configure them below.
            </p>
            <div className="empty-tools-message">
              <p>No predefined functions configured yet.</p>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Save Button */}
      <div className="config-footer">
        <button className="btn-save" onClick={handleSave}>
          <FiSave /> Save Configuration
        </button>
      </div>
    </div>
  )
}

export default AssistantConfig

