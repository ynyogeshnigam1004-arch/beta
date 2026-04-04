import { useState, useEffect } from 'react'
import { FiPlus, FiPhone, FiCheck, FiX, FiActivity, FiArrowRight, FiUser, FiSettings, FiTrash2, FiEdit2, FiRefreshCw } from 'react-icons/fi'
import config from '../config'
import './PhoneNumbers.css'

function PhoneNumbers() {
  const [phoneNumbers, setPhoneNumbers] = useState([])
  const [assistants, setAssistants] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updatingPhoneId, setUpdatingPhoneId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Add phone number flow state
  const [step, setStep] = useState(1) // 1: credentials, 2: select number, 3: configure
  const [credentials, setCredentials] = useState({ accountSid: '', authToken: '' })
  const [availableNumbers, setAvailableNumbers] = useState([])
  const [selectedNumber, setSelectedNumber] = useState('')
  const [numberConfig, setNumberConfig] = useState({ label: '', assistantId: '' })
  const [testingCredentials, setTestingCredentials] = useState(false)
  const [fetchingNumbers, setFetchingNumbers] = useState(false)
  const [savingNumber, setSavingNumber] = useState(false)
  const [updatingAssignments, setUpdatingAssignments] = useState(new Set())
  const [updatingCredentials, setUpdatingCredentials] = useState(false)

  useEffect(() => {
    fetchPhoneNumbers()
    fetchAssistants()
  }, [])

  const handle401Error = () => {
    localStorage.clear()
    alert('Your session has expired. Please log in again.')
    window.location.href = '/login'
  }

  const fetchPhoneNumbers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/phone-numbers', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401) {
        handle401Error()
        return
      }

      const data = await response.json()
      if (data.success) {
        setPhoneNumbers(data.phoneNumbers || [])
      } else {
        setError(data.error)
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error)
      setError('Failed to load phone numbers')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssistants = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/assistants', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401) {
        handle401Error()
        return
      }

      const data = await response.json()
      if (data.success) {
        setAssistants(data.assistants || [])
      }
    } catch (error) {
      console.error('Error fetching assistants:', error)
    }
  }

  const testCredentials = async () => {
    if (!credentials.accountSid || !credentials.authToken) {
      alert('Please enter both Account SID and Auth Token')
      return
    }

    setTestingCredentials(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/phone-numbers/test-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(credentials)
      })

      if (response.status === 401) {
        handle401Error()
        return
      }

      const data = await response.json()
      if (data.success) {
        alert('✅ Credentials are valid!')
        setStep(2)
        fetchAvailableNumbers()
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      alert(`❌ Error testing credentials: ${error.message}`)
    } finally {
      setTestingCredentials(false)
    }
  }

  const fetchAvailableNumbers = async () => {
    setFetchingNumbers(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/phone-numbers/fetch-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(credentials)
      })

      if (response.status === 401) {
        handle401Error()
        return
      }

      const data = await response.json()
      if (data.success) {
        setAvailableNumbers(data.phoneNumbers || [])
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      alert(`❌ Error fetching numbers: ${error.message}`)
    } finally {
      setFetchingNumbers(false)
    }
  }

  const saveCredentialsAndNumber = async () => {
    if (!selectedNumber || !numberConfig.label || !numberConfig.assistantId) {
      alert('Please fill in all fields')
      return
    }

    setSavingNumber(true)
    try {
      const token = localStorage.getItem('token')
      
      // First save credentials
      const credResponse = await fetch('/api/phone-numbers/save-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(credentials)
      })

      if (credResponse.status === 401) {
        handle401Error()
        return
      }

      const credData = await credResponse.json()
      if (!credData.success) {
        throw new Error(credData.error)
      }

      // Then add phone number
      const numberResponse = await fetch('/api/phone-numbers/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: selectedNumber,
          label: numberConfig.label,
          assignedAssistantId: numberConfig.assistantId
        })
      })

      if (numberResponse.status === 401) {
        handle401Error()
        return
      }

      const numberData = await numberResponse.json()
      if (numberData.success) {
        alert('✅ Phone number added successfully!')
        setShowAddModal(false)
        resetAddFlow()
        fetchPhoneNumbers()
      } else {
        throw new Error(numberData.error)
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`)
    } finally {
      setSavingNumber(false)
    }
  }

  const updateAssistantAssignment = async (phoneNumberId, assistantId) => {
    // Add to updating set
    setUpdatingAssignments(prev => new Set([...prev, phoneNumberId]))
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/phone-numbers/${phoneNumberId}/assistant`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assignedAssistantId: assistantId })
      })

      if (response.status === 401) {
        handle401Error()
        return
      }

      const data = await response.json()
      if (data.success) {
        // Show success feedback
        const phoneCard = document.querySelector(`[data-phone-id="${phoneNumberId}"]`)
        if (phoneCard) {
          phoneCard.classList.add('update-success')
          setTimeout(() => phoneCard.classList.remove('update-success'), 2000)
        }
        fetchPhoneNumbers() // Refresh the list
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      alert(`❌ Error updating assignment: ${error.message}`)
    } finally {
      // Remove from updating set
      setUpdatingAssignments(prev => {
        const newSet = new Set(prev)
        newSet.delete(phoneNumberId)
        return newSet
      })
    }
  }

  const deletePhoneNumber = async (phoneNumberId) => {
    if (!window.confirm('Are you sure you want to remove this phone number?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/phone-numbers/${phoneNumberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401) {
        handle401Error()
        return
      }

      const data = await response.json()
      if (data.success) {
        fetchPhoneNumbers()
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      alert(`❌ Error deleting phone number: ${error.message}`)
    }
  }

  const updateCredentials = async () => {
    if (!credentials.accountSid || !credentials.authToken) {
      alert('Please enter both Account SID and Auth Token')
      return
    }

    setUpdatingCredentials(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/phone-numbers/update-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(credentials)
      })

      if (response.status === 401) {
        handle401Error()
        return
      }

      const data = await response.json()
      if (data.success) {
        alert('✅ Credentials updated successfully! API keys have been created for human transfer.')
        setShowUpdateModal(false)
        setCredentials({ accountSid: '', authToken: '' })
        fetchPhoneNumbers()
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      alert(`❌ Error updating credentials: ${error.message}`)
    } finally {
      setUpdatingCredentials(false)
    }
  }

  const resetAddFlow = () => {
    setStep(1)
    setCredentials({ accountSid: '', authToken: '' })
    setAvailableNumbers([])
    setSelectedNumber('')
    setNumberConfig({ label: '', assistantId: '' })
  }

  if (loading) {
    return (
      <div className="phone-numbers">
        <div className="loading-state">
          <FiRefreshCw className="loading-spinner" />
          <p>Loading phone numbers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="phone-numbers">
      <div className="page-header">
        <div className="header-content">
          <h1>Phone Numbers</h1>
          <p>Manage your Twilio phone numbers and assistant assignments</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <FiPlus /> Add Phone Number
        </button>
      </div>

      {error && (
        <div className="error-message">
          <FiX />
          <span>{error}</span>
        </div>
      )}

      <div className="phone-numbers-grid">
        {phoneNumbers.length === 0 ? (
          <div className="empty-state">
            <FiPhone className="empty-icon" />
            <h3>No Phone Numbers</h3>
            <p>Add your first Twilio phone number to start receiving calls</p>
            <button 
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <FiPlus /> Add Phone Number
            </button>
          </div>
        ) : (
          phoneNumbers.map((phoneNumber) => (
            <div key={phoneNumber.id} className="phone-number-card" data-phone-id={phoneNumber.id}>
              <div className="card-header">
                <div className="phone-info">
                  <h3>{phoneNumber.phoneNumber}</h3>
                  <span className="phone-label">{phoneNumber.label}</span>
                </div>
                <div className="card-actions">
                  <button 
                    className="btn-icon btn-update"
                    onClick={() => setShowUpdateModal(true)}
                    title="Update Twilio Credentials"
                  >
                    <FiRefreshCw />
                  </button>
                  <button 
                    className="btn-icon"
                    onClick={() => deletePhoneNumber(phoneNumber.id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
              
              <div className="card-content">
                <div className="form-group">
                  <label>
                    Assigned Assistant
                    {updatingAssignments.has(phoneNumber.id) && (
                      <span className="saving-indicator">
                        <FiRefreshCw className="loading-spinner" /> Saving...
                      </span>
                    )}
                  </label>
                  <select
                    value={phoneNumber.assignedAssistantId || ''}
                    onChange={(e) => updateAssistantAssignment(phoneNumber.id, e.target.value)}
                    disabled={updatingAssignments.has(phoneNumber.id)}
                  >
                    <option value="">Select Assistant</option>
                    {assistants.map((assistant) => (
                      <option key={assistant.id} value={assistant.id}>
                        {assistant.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="phone-status">
                  <span className={`status-badge ${phoneNumber.assignedAssistantId ? 'active' : 'inactive'}`}>
                    {phoneNumber.assignedAssistantId ? 'Active' : 'Not Configured'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Phone Number Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Phone Number</h2>
              <button 
                className="btn-icon"
                onClick={() => {
                  setShowAddModal(false)
                  resetAddFlow()
                }}
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {step === 1 && (
                <div className="step-content">
                  <h3>Step 1: Twilio Credentials</h3>
                  <p>Enter your Twilio Account SID and Auth Token</p>
                  
                  <div className="form-group">
                    <label>Account SID</label>
                    <input
                      type="text"
                      placeholder="AC..."
                      value={credentials.accountSid}
                      onChange={(e) => setCredentials({...credentials, accountSid: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Auth Token</label>
                    <input
                      type="password"
                      placeholder="Your auth token"
                      value={credentials.authToken}
                      onChange={(e) => setCredentials({...credentials, authToken: e.target.value})}
                    />
                  </div>
                  
                  <button 
                    className="btn-primary"
                    onClick={testCredentials}
                    disabled={testingCredentials}
                  >
                    {testingCredentials ? <FiRefreshCw className="loading-spinner" /> : <FiCheck />}
                    {testingCredentials ? 'Testing...' : 'Test & Continue'}
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="step-content">
                  <h3>Step 2: Select Phone Number</h3>
                  <p>Choose a phone number from your Twilio account</p>
                  
                  {fetchingNumbers ? (
                    <div className="loading-state">
                      <FiRefreshCw className="loading-spinner" />
                      <p>Fetching your phone numbers...</p>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>Available Phone Numbers</label>
                        <select
                          value={selectedNumber}
                          onChange={(e) => setSelectedNumber(e.target.value)}
                        >
                          <option value="">Select a phone number</option>
                          {availableNumbers.map((number) => (
                            <option key={number.phoneNumber} value={number.phoneNumber}>
                              {number.phoneNumber} {number.friendlyName && `(${number.friendlyName})`}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="step-actions">
                        <button 
                          className="btn-secondary"
                          onClick={() => setStep(1)}
                        >
                          Back
                        </button>
                        <button 
                          className="btn-primary"
                          onClick={() => setStep(3)}
                          disabled={!selectedNumber}
                        >
                          Continue
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="step-content">
                  <h3>Step 3: Configure</h3>
                  <p>Set up your phone number with a label and assistant</p>
                  
                  <div className="form-group">
                    <label>Label</label>
                    <input
                      type="text"
                      placeholder="e.g., Sales Line, Support"
                      value={numberConfig.label}
                      onChange={(e) => setNumberConfig({...numberConfig, label: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Assign Assistant</label>
                    <select
                      value={numberConfig.assistantId}
                      onChange={(e) => setNumberConfig({...numberConfig, assistantId: e.target.value})}
                    >
                      <option value="">Select Assistant</option>
                      {assistants.map((assistant) => (
                        <option key={assistant.id} value={assistant.id}>
                          {assistant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="step-actions">
                    <button 
                      className="btn-secondary"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </button>
                    <button 
                      className="btn-success"
                      onClick={saveCredentialsAndNumber}
                      disabled={savingNumber}
                    >
                      {savingNumber ? <FiRefreshCw className="loading-spinner" /> : <FiCheck />}
                      {savingNumber ? 'Saving...' : 'Add Phone Number'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Credentials Modal */}
      {showUpdateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Update Twilio Credentials</h2>
              <button 
                className="btn-icon"
                onClick={() => {
                  setShowUpdateModal(false)
                  setCredentials({ accountSid: '', authToken: '' })
                }}
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="step-content">
                <div className="info-box">
                  <h4>🔑 Why Update Credentials?</h4>
                  <p>This will create the necessary API keys for human transfer functionality. Your existing phone number configuration will be preserved.</p>
                </div>
                
                <div className="form-group">
                  <label>Account SID</label>
                  <input
                    type="text"
                    placeholder="AC..."
                    value={credentials.accountSid}
                    onChange={(e) => setCredentials({...credentials, accountSid: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Auth Token</label>
                  <input
                    type="password"
                    placeholder="Your auth token"
                    value={credentials.authToken}
                    onChange={(e) => setCredentials({...credentials, authToken: e.target.value})}
                  />
                </div>
                
                <div className="step-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setShowUpdateModal(false)
                      setCredentials({ accountSid: '', authToken: '' })
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-success"
                    onClick={updateCredentials}
                    disabled={updatingCredentials}
                  >
                    {updatingCredentials ? <FiRefreshCw className="loading-spinner" /> : <FiCheck />}
                    {updatingCredentials ? 'Updating...' : 'Update Credentials'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhoneNumbers