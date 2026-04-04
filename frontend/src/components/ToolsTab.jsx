import React, { useState, useEffect } from 'react';
import { FiTool, FiPlus, FiTrash2, FiSettings, FiActivity, FiArrowRight, FiCode, FiZap } from 'react-icons/fi'
import config from '../config'
import './ToolsTab.css';

const countries = [
  { code: "+1", name: "United States", emoji: "🇺🇸" },
  { code: "+91", name: "India", emoji: "🇮🇳" },
  { code: "+44", name: "United Kingdom", emoji: "🇬🇧" },
  { code: "+61", name: "Australia", emoji: "🇦🇺" },
  { code: "+81", name: "Japan", emoji: "🇯🇵" },
  { code: "+49", name: "Germany", emoji: "🇩🇪" },
  { code: "+33", name: "France", emoji: "🇫🇷" },
  { code: "+39", name: "Italy", emoji: "🇮🇹" },
  { code: "+34", name: "Spain", emoji: "🇪🇸" },
  { code: "+86", name: "China", emoji: "🇨🇳" },
  { code: "+7", name: "Russia", emoji: "🇷🇺" },
  { code: "+82", name: "South Korea", emoji: "🇰🇷" },
  { code: "+971", name: "UAE", emoji: "🇦🇪" },
  { code: "+62", name: "Indonesia", emoji: "🇮🇩" },
  { code: "+92", name: "Pakistan", emoji: "🇵🇰" },
  { code: "+880", name: "Bangladesh", emoji: "🇧🇩" },
  { code: "+20", name: "Egypt", emoji: "🇪🇬" },
  { code: "+55", name: "Brazil", emoji: "🇧🇷" },
  { code: "+27", name: "South Africa", emoji: "🇿🇦" },
  { code: "+47", name: "Norway", emoji: "🇳🇴" },
  { code: "+46", name: "Sweden", emoji: "🇸🇪" },
  { code: "+31", name: "Netherlands", emoji: "🇳🇱" },
  { code: "+41", name: "Switzerland", emoji: "🇨🇭" },
  { code: "+48", name: "Poland", emoji: "🇵🇱" },
  { code: "+90", name: "Turkey", emoji: "🇹🇷" },
  { code: "+213", name: "Algeria", emoji: "🇩🇿" },
  { code: "+63", name: "Philippines", emoji: "🇵🇭" },
  { code: "+94", name: "Sri Lanka", emoji: "🇱🇰" },
  { code: "+66", name: "Thailand", emoji: "🇹🇭" },
  { code: "+84", name: "Vietnam", emoji: "🇻🇳" },
  { code: "+60", name: "Malaysia", emoji: "🇲🇾" },
  { code: "+256", name: "Uganda", emoji: "🇺🇬" },
];

export default function ToolsTab({ assistant, onUpdate }) {
  const [toolsOpen, setToolsOpen] = useState(true);
  const [predefinedOpen, setPredefinedOpen] = useState(true);
  const [customOpen, setCustomOpen] = useState(true);
  const [availableTools, setAvailableTools] = useState([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [selectedTools, setSelectedTools] = useState(assistant?.tools || []);
  
  // Get values from assistant or use defaults
  const [endCallEnabled, setEndCallEnabled] = useState(assistant?.transferSettings?.endCallEnabled || false);
  const [dialKeypadEnabled, setDialKeypadEnabled] = useState(assistant?.transferSettings?.dialKeypadEnabled || false);
  const [selectedCountry, setSelectedCountry] = useState(
    countries.find(c => c.code === (assistant?.transferSettings?.countryCode || '+1')) || countries[0]
  );
  const [phoneNumber, setPhoneNumber] = useState(assistant?.transferSettings?.phoneNumber || '');

  // Fetch available tools
  useEffect(() => {
    const fetchTools = async () => {
      try {
        setIsLoadingTools(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tools', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (data.success) {
          setAvailableTools(data.tools);
          console.log('✅ Loaded tools:', data.tools.length);
        }
      } catch (error) {
        console.error('❌ Error fetching tools:', error);
      } finally {
        setIsLoadingTools(false);
      }
    };

    fetchTools();
  }, []);

  // Update parent when settings change
  const handleSettingChange = (field, value) => {
    const updatedSettings = {
      ...assistant?.transferSettings,
      [field]: value
    };
    
    if (onUpdate) {
      onUpdate('transferSettings', updatedSettings);
    }
  };

  const handleEndCallToggle = () => {
    const newValue = !endCallEnabled;
    setEndCallEnabled(newValue);
    handleSettingChange('endCallEnabled', newValue);
  };

  const handleDialKeypadToggle = () => {
    const newValue = !dialKeypadEnabled;
    setDialKeypadEnabled(newValue);
    handleSettingChange('dialKeypadEnabled', newValue);
  };

  const handleCountryChange = (code) => {
    const country = countries.find(c => c.code === code);
    setSelectedCountry(country);
    handleSettingChange('countryCode', code);
  };

  const handlePhoneNumberChange = (number) => {
    setPhoneNumber(number);
    handleSettingChange('phoneNumber', number);
  };

  const handleToolToggle = (toolId) => {
    const newSelectedTools = selectedTools.includes(toolId)
      ? selectedTools.filter(id => id !== toolId)
      : [...selectedTools, toolId];
    
    setSelectedTools(newSelectedTools);
    if (onUpdate) {
      onUpdate('tools', newSelectedTools);
    }
  };

  return (
    <div className="tools-tab-container">
      {/* Tools Section */}
      <div className="tools-section">
        <div 
          className="tools-section-header" 
          onClick={() => setToolsOpen(!toolsOpen)}
        >
          <h3>Tools</h3>
          <span className="collapse-icon">{toolsOpen ? "▲" : "▼"}</span>
        </div>
        
        {toolsOpen && (
          <div className="tools-section-body">
            <p className="section-description">
              Tools enable voicebots to perform actions during calls. Add tools
              from the Tools Library to connect with Make.com or GHL workflows,
              or create custom tools with your backend.
            </p>
            
            <div className="info-box">
              <span className="info-icon">ℹ️</span>
              <span>
                Note: Tools have different Request and Response format as compared
                to Functions. Check our{" "}
                <a 
                  href="https://docs.vapi.ai/tools" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  tools guide
                </a>{" "}
                for more details
              </span>
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
                <>
                  <select 
                    className="tools-select-dropdown"
                    value=""
                    onChange={(e) => {
                      const toolId = e.target.value;
                      if (toolId && !selectedTools.includes(toolId)) {
                        const newSelectedTools = [...selectedTools, toolId];
                        setSelectedTools(newSelectedTools);
                        if (onUpdate) {
                          onUpdate('tools', newSelectedTools);
                        }
                      }
                      e.target.value = ""; // Reset dropdown
                    }}
                  >
                    <option value="" disabled>-- Select Tools --</option>
                    {availableTools.map(tool => (
                      <option key={tool.id} value={tool.id}>
                        {tool.name || 'Untitled Tool'}
                      </option>
                    ))}
                  </select>
                  
                  {/* Selected Tools Display */}
                  {selectedTools.length > 0 && (
                    <div className="selected-tools-list">
                      {selectedTools.map(toolId => {
                        const tool = availableTools.find(t => t.id === toolId);
                        return tool ? (
                          <div key={toolId} className="selected-tool-item">
                            <span>{tool.name || 'Untitled Tool'}</span>
                            <button
                              type="button"
                              className="remove-tool-btn"
                              onClick={() => {
                                const newSelectedTools = selectedTools.filter(id => id !== toolId);
                                setSelectedTools(newSelectedTools);
                                if (onUpdate) {
                                  onUpdate('tools', newSelectedTools);
                                }
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Predefined Functions Section */}
      <div className="tools-section">
        <div 
          className="tools-section-header"
          onClick={() => setPredefinedOpen(!predefinedOpen)}
        >
          <h3>Predefined Functions</h3>
          <span className="collapse-icon">{predefinedOpen ? "▲" : "▼"}</span>
        </div>
        
        {predefinedOpen && (
          <div className="tools-section-body">
            <p className="section-description">
              We've pre-built functions for common use cases. You can enable them
              and configure them below.
            </p>

            {/* End Call Function Toggle */}
            <div className="toggle-row">
              <div className="toggle-info">
                <strong>Enable End Call Function</strong>
                <span className="toggle-description">
                  This allows the assistant to end the call from its side.{" "}
                  <em>(Best for gpt-4 and bigger models.)</em>
                </span>
              </div>
              <div
                className={`toggle-switch ${endCallEnabled ? "active" : ""}`}
                onClick={handleEndCallToggle}
              >
                <div className="toggle-slider"></div>
              </div>
            </div>

            {/* Dial Keypad Toggle */}
            <div className="toggle-row">
              <div className="toggle-info">
                <strong>Dial Keypad</strong>
                <span className="toggle-description">
                  This sets whether the assistant can dial digits on the keypad.
                </span>
              </div>
              <div
                className={`toggle-switch ${dialKeypadEnabled ? "active" : ""}`}
                onClick={handleDialKeypadToggle}
              >
                <div className="toggle-slider"></div>
              </div>
            </div>

            {/* Forwarding Phone Number */}
            <div className="form-group">
              <label>Forwarding Phone Number (Human Agent)</label>
              <p className="section-description" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                Enter the phone number where you want to receive calls when users request human transfer.
              </p>
              <div className="phone-input-group">
                <select 
                  className="country-select"
                  value={selectedCountry.code}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  style={{
                    width: '140px',
                    padding: '0.75rem',
                    background: '#0a0a0b',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.875rem'
                  }}
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.emoji} {country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="phone-input"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneNumberChange(e.target.value)}
                  placeholder="Enter phone number (e.g., 9548744216)"
                  style={{ 
                    flex: 1,
                    minWidth: '300px',
                    padding: '0.75rem 1rem',
                    background: '#0a0a0b',
                    border: '2px solid #54f5c4',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <div className="input-help">
                {phoneNumber ? (
                  <>Complete number: <strong>{selectedCountry.code}{phoneNumber}</strong></>
                ) : (
                  <>Example: {selectedCountry.code}9548744216</>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Functions Section */}
      <div className="tools-section">
        <div 
          className="tools-section-header"
          onClick={() => setCustomOpen(!customOpen)}
        >
          <h3>Custom Functions</h3>
          <span className="collapse-icon">{customOpen ? "▲" : "▼"}</span>
        </div>
        
        {customOpen && (
          <div className="tools-section-body">
            <p className="section-description">
              Define your custom functions here to enhance your assistant's
              capabilities. You can use your own code or tools like{" "}
              <strong>Pipedream</strong> or <strong>Make</strong> for setup.
            </p>

            <div className="warning-box">
              <span className="warning-icon">⚠️</span>
              <span>
                Note: Functions are the same as tools, except they follow older
                syntax as per the OpenAI Spec. Check our{" "}
                <a 
                  href="https://docs.vapi.ai/tools/custom-tools" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  functions guide
                </a>.
              </span>
            </div>

            <button className="create-function-btn" disabled>
              <span>Create a new function</span>
              <span className="disabled-icon">⛔</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
