import { useState } from 'react'
import './AddModelModal.css'
import { modelService } from '../services/model.service'

// Fixed {{variable}} in text content - timestamp update 4
function AddModelModal({ onClose, onAdd, editModel }) {
  const [step, setStep] = useState(editModel ? 2 : 1)
  const [integrationType, setIntegrationType] = useState(
    editModel?.integration_type || editModel?.integrationType || 'easy'
  )
  const [modelData, setModelData] = useState(editModel ? {
    name: editModel.name || '',
    displayName: editModel.display_name || '',
    provider: editModel.provider || '',
    apiKey: editModel.api_key || '',
    endpoint: editModel.endpoint || '',
    headers: editModel.headers || [],
    authProfile: editModel.auth_profile || 'none',
    configurationType: editModel.configuration_type || 'default',
    variables: editModel.variables || {},
    body: editModel.body || '',
    testResponse: editModel.test_response || '',
    structuredResponse: editModel.structured_response || false,
    dataGeneration: editModel.data_generation || false,
    streaming: editModel.streaming || false,
    toolCalling: editModel.tool_calling || {},
    modalities: editModel.modalities || []
  } : {
    name: '',
    displayName: '',
    provider: '',
    apiKey: '',
    endpoint: '',
    headers: [],
    authProfile: 'none',
    configurationType: 'default',
    variables: {},
    body: '',
    testResponse: '',
    structuredResponse: false,
    dataGeneration: false,
    streaming: false,
    toolCalling: {},
    modalities: []
  })
  
  const [expandedSections, setExpandedSections] = useState({
    auth: false,
    headers: false,
    config: false,
    variables: false,
    bodyConfig: false,
    testResponse: false,
    modelFeatures: false,
    toolCalling: false,
    modalities: false
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testPassed, setTestPassed] = useState(editModel ? true : false) // Existing models are assumed tested

  // Helper to update model data and reset test status
  const updateModelData = (updates) => {
    setModelData({ ...modelData, ...updates })
    if (!editModel) {
      setTestPassed(false) // Reset test status when config changes
    }
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else {
      // Only allow saving if test passed (for new models) or if editing
      if (!editModel && !testPassed) {
        alert('Please test the connection successfully before saving the model.')
        return
      }
      
      const backendData = {
        name: modelData.name,
        display_name: modelData.displayName || null,
        provider: modelData.provider || null,
        integration_type: integrationType,
        endpoint: modelData.endpoint || null,
        api_key: modelData.apiKey || null,
        auth_profile: modelData.authProfile || 'none',
        is_active: true,
        headers: modelData.headers || [],
        configuration_type: modelData.configurationType || 'default',
        variables: modelData.variables || {},
        body: modelData.body || '',
        test_response: modelData.testResponse || '',
        structured_response: modelData.structuredResponse || false,
        data_generation: modelData.dataGeneration || false,
        streaming: modelData.streaming || false,
        tool_calling: modelData.toolCalling || {},
        modalities: modelData.modalities || []
      }
      
      if (editModel?.id) {
        backendData.id = editModel.id
      }
      
      onAdd(backendData)
      onClose()
    }
  }

  const addHeader = () => {
    setModelData({
      ...modelData,
      headers: [...modelData.headers, { key: '', value: '', secure: false }]
    })
  }

  const updateHeader = (index, field, value) => {
    const newHeaders = [...modelData.headers]
    newHeaders[index][field] = value
    setModelData({ ...modelData, headers: newHeaders })
  }

  const removeHeader = (index) => {
    setModelData({
      ...modelData,
      headers: modelData.headers.filter((_, i) => i !== index)
    })
  }

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    })
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    setTestPassed(false)
    
    try {
      // Test directly to the model endpoint for both new and existing models
      console.log('Testing model directly to endpoint:', modelData.endpoint)
      
      const endpoint = modelData.endpoint || 'https://api.openai.com/v1/chat/completions'
      const headers = {
        'Content-Type': 'application/json',
        ...(modelData.apiKey && { 'Authorization': `Bearer ${modelData.apiKey}` }),
        ...modelData.headers.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {})
      }
      
      console.log('Test request headers:', headers)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: modelData.name,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setTestResult({
          success: true,
          message: 'Connection successful! Model is responding correctly.',
          response: JSON.stringify(data, null, 2)
        })
        setTestPassed(true)
      } else {
        const errorText = await response.text()
        setTestResult({
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`,
          response: errorText
        })
        setTestPassed(false)
      }
    } catch (error) {
      console.error('Test connection error:', error)
      setTestResult({
        success: false,
        message: `Connection failed: ${error.message}`,
        response: null
      })
      setTestPassed(false)
    } finally {
      setTesting(false)
    }
  }

  const canTest = () => {
    if (integrationType === 'easy') {
      return modelData.provider && modelData.name && modelData.apiKey
    } else {
      return modelData.name && modelData.endpoint
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>
              {editModel 
                ? 'Edit Model Configuration'
                : step === 1 
                ? 'Add an external model' 
                : integrationType === 'easy' 
                ? 'Easy Integration' 
                : 'Custom API integration'}
            </h2>
            <p className="modal-subtitle">
              {editModel
                ? 'Update your model settings and test the connection'
                : step === 1 
                ? 'Bring your model into the platform using API integration.'
                : integrationType === 'easy'
                ? 'Select a provider and enter your API key'
                : 'Bring your model in using API integration.'}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        {step === 1 ? (
          <div className="modal-body">
            <h3 className="section-title">Select the integration type</h3>
            
            <div 
              className={`integration-option ${integrationType === 'easy' ? 'selected' : ''}`}
              onClick={() => setIntegrationType('easy')}
            >
              <input 
                type="radio" 
                checked={integrationType === 'easy'}
                onChange={() => setIntegrationType('easy')}
              />
              <div className="option-icon">📦</div>
              <div className="option-content">
                <h4>Easy integration</h4>
                <p>Integrate models from leading providers such as OpenAI, Anthropic, Google, Azure, Cohere, Amazon Bedrock & Vertex AI.</p>
              </div>
            </div>

            <div 
              className={`integration-option ${integrationType === 'custom' ? 'selected' : ''}`}
              onClick={() => setIntegrationType('custom')}
            >
              <input 
                type="radio" 
                checked={integrationType === 'custom'}
                onChange={() => setIntegrationType('custom')}
              />
              <div className="option-icon api">API</div>
              <div className="option-content">
                <h4>Custom integration</h4>
                <p>Connect your models via our easy to use API integration.</p>
              </div>
            </div>
          </div>
        ) : integrationType === 'easy' ? (
          <div className="modal-body">
            <div className="form-field">
              <label>Provider</label>
              <select 
                value={modelData.provider}
                onChange={(e) => setModelData({ ...modelData, provider: e.target.value })}
              >
                <option value="">Select provider</option>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Google">Google</option>
                <option value="Azure">Azure</option>
                <option value="Cohere">Cohere</option>
                <option value="Amazon Bedrock">Amazon Bedrock</option>
                <option value="Vertex AI">Vertex AI</option>
              </select>
            </div>

            <div className="form-field">
              <label>Model Name</label>
              <input
                type="text"
                placeholder="e.g., GPT-4"
                value={modelData.name}
                onChange={(e) => setModelData({ ...modelData, name: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>Display Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g., GPT-4 Turbo"
                value={modelData.displayName}
                onChange={(e) => setModelData({ ...modelData, displayName: e.target.value })}
              />
              <p className="field-description">Friendly name shown in the chat dropdown</p>
            </div>

            <div className="form-field">
              <label>API Key</label>
              <input
                type="password"
                placeholder="Enter your API key"
                value={modelData.apiKey}
                onChange={(e) => setModelData({ ...modelData, apiKey: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <div className="form-field">
              <label>Connection name</label>
              <p className="field-description">Name used to refer to this model within other platform components</p>
              <input
                type="text"
                placeholder="Enter model name"
                value={modelData.name}
                onChange={(e) => setModelData({ ...modelData, name: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>Display Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g., My Custom Model"
                value={modelData.displayName}
                onChange={(e) => setModelData({ ...modelData, displayName: e.target.value })}
              />
              <p className="field-description">Friendly name shown in the chat dropdown</p>
            </div>

            <div className="form-field">
              <label>Model endpoint URL</label>
              <p className="field-description">Provide the endpoint URL of the model you want to connect to.</p>
              <input
                type="text"
                placeholder="Enter model endpoint URL"
                value={modelData.endpoint}
                onChange={(e) => setModelData({ ...modelData, endpoint: e.target.value })}
              />
            </div>

            {/* Authorization Profile */}
            <div className="collapsible-section">
              <div 
                className="collapsible-header"
                onClick={() => toggleSection('auth')}
              >
                <span className="collapsible-title">Authorization profile</span>
                <span className={`arrow ${expandedSections.auth ? 'expanded' : ''}`}>›</span>
              </div>
              {expandedSections.auth && (
                <div className="collapsible-content">
                  <p className="field-description">Select the authorization profile you want to use with the request payload.</p>
                  <select 
                    value={modelData.authProfile}
                    onChange={(e) => setModelData({ ...modelData, authProfile: e.target.value })}
                    className="auth-select"
                  >
                    <option value="none">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apikey">API Key</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>
              )}
            </div>

            {/* Headers */}
            <div className="collapsible-section">
              <div 
                className="collapsible-header"
                onClick={() => toggleSection('headers')}
              >
                <span className="collapsible-title">Headers</span>
                <span className={`arrow ${expandedSections.headers ? 'expanded' : ''}`}>›</span>
              </div>
              <p className="collapsible-subtitle">Provide additional information to send along with the HTTP request payload.</p>
              {expandedSections.headers && (
                <div className="collapsible-content">
                  <div className="headers-list">
                    {modelData.headers.map((header, index) => (
                      <div key={index} className="header-item">
                        <input
                          type="text"
                          placeholder="Enter key"
                          value={header.key}
                          onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        />
                        <input
                          type={header.secure ? 'password' : 'text'}
                          placeholder="Enter value"
                          value={header.value}
                          onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        />
                        <label className="secure-checkbox">
                          <input
                            type="checkbox"
                            checked={header.secure}
                            onChange={(e) => updateHeader(index, 'secure', e.target.checked)}
                          />
                          Secure
                        </label>
                        <button 
                          className="remove-header-btn"
                          onClick={() => removeHeader(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="add-header-btn" onClick={addHeader}>
                    + Add Header
                  </button>
                </div>
              )}
            </div>

            {/* Model Configurations */}
            <div className="collapsible-section">
              <div 
                className="collapsible-header"
                onClick={() => toggleSection('config')}
              >
                <span className="collapsible-title">Model configurations</span>
                <span className={`arrow ${expandedSections.config ? 'expanded' : ''}`}>›</span>
              </div>
              <p className="collapsible-subtitle">Select the specifics of the model's settings</p>
              {expandedSections.config && (
                <div className="collapsible-content">
                  <div className="config-options">
                    <label className="integration-option" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="radio"
                        checked={modelData.configurationType === 'default'}
                        onChange={() => setModelData({ ...modelData, configurationType: 'default' })}
                      />
                      <div className="option-content">
                        <h4>Default</h4>
                        <p>Use this option if you want to define a unique request response structure for your model and map it to platform variables</p>
                      </div>
                    </label>
                    
                    <label className="integration-option" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="radio"
                        checked={modelData.configurationType === 'existing'}
                        onChange={() => setModelData({ ...modelData, configurationType: 'existing' })}
                      />
                      <div className="option-content">
                        <h4>Existing Provider Structures</h4>
                        <p>Use this option if your model follows a commonly known request response format like OpenAI's chat completions.</p>
                      </div>
                    </label>
                  </div>

                  {/* Show sections based on configuration type */}
                  {modelData.configurationType === 'default' && (
                    <>
                      {/* Variables */}
                      <div className="sub-collapsible">
                        <div 
                          className="collapsible-header"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSection('variables')
                          }}
                        >
                          <span className="collapsible-title">Variables</span>
                          <span className={`arrow ${expandedSections.variables ? 'expanded' : ''}`}>›</span>
                        </div>
                        <p className="collapsible-subtitle">Provide the variables that you want to use in the request payload</p>
                        {expandedSections.variables && (
                          <div className="collapsible-content">
                            <textarea
                              placeholder={'{"temperature": 0.7, "max_tokens": 1000}'}
                              value={JSON.stringify(modelData.variables, null, 2)}
                              onChange={(e) => {
                                try {
                                  setModelData({ ...modelData, variables: JSON.parse(e.target.value) })
                                } catch {}
                              }}
                              rows="4"
                            />
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="sub-collapsible">
                        <div 
                          className="collapsible-header"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSection('bodyConfig')
                          }}
                        >
                          <span className="collapsible-title">Body</span>
                          <span className={`arrow ${expandedSections.bodyConfig ? 'expanded' : ''}`}>›</span>
                        </div>
                        <p className="collapsible-subtitle">The request body can consist of the model's relevant parameters, users have to define it manually. For dynamic variable mapping use {`"{{variable}}"`}.</p>
                        {expandedSections.bodyConfig && (
                          <div className="collapsible-content">
                            <textarea
                              placeholder={`{"model": "{{model}}", "messages": "{{messages}}"}`}
                              value={modelData.body}
                              onChange={(e) => setModelData({ ...modelData, body: e.target.value })}
                              rows="6"
                            />
                          </div>
                        )}
                      </div>

                      {/* Test Response */}
                      <div className="sub-collapsible">
                        <div 
                          className="collapsible-header"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSection('testResponse')
                          }}
                        >
                          <span className="collapsible-title">Test response</span>
                          <span className={`arrow ${expandedSections.testResponse ? 'expanded' : ''}`}>›</span>
                        </div>
                        <p className="collapsible-subtitle">Find the response created for the configured LLM service here</p>
                        {expandedSections.testResponse && (
                          <div className="collapsible-content">
                            <textarea
                              placeholder="Test response will appear here after testing"
                              value={modelData.testResponse}
                              onChange={(e) => setModelData({ ...modelData, testResponse: e.target.value })}
                              rows="4"
                              readOnly
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Show these sections only when "Existing Provider Structures" is selected */}
                  {modelData.configurationType === 'existing' && (
                    <>
                      {/* Model Features */}
                      <div className="sub-collapsible">
                        <div 
                          className="collapsible-header"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSection('modelFeatures')
                          }}
                        >
                          <span className="collapsible-title">Model features</span>
                          <span className={`arrow ${expandedSections.modelFeatures ? 'expanded' : ''}`}>›</span>
                        </div>
                        <p className="collapsible-subtitle">Easily enable or disable features to tailor model's functionality to your needs.</p>
                        {expandedSections.modelFeatures && (
                          <div className="collapsible-content">
                            <div className="feature-item-text">
                              <strong>Structured response</strong>
                              <p>Structured response support enables models to return outputs in predefined JSON formats, making them easily machine-readable and integrable with downstream</p>
                            </div>

                            <div className="feature-item-text">
                              <strong>Data generation</strong>
                              <p>Enables synthetic data generation for text-based tasks using prompts and patterns. This can enable data in the prompt playground.</p>
                            </div>

                            <div className="feature-item">
                              <div>
                                <strong>Streaming</strong>
                                <p>Enables real-time, token-by-token generation for faster, more interactive AI responses.</p>
                              </div>
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={modelData.streaming}
                                  onChange={(e) => setModelData({ ...modelData, streaming: e.target.checked })}
                                />
                                <span className="toggle-slider"></span>
                              </label>
                            </div>

                            {/* Tool Calling */}
                            <div className="nested-collapsible">
                              <div 
                                className="collapsible-header"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSection('toolCalling')
                                }}
                              >
                                <span className="collapsible-title">Tool calling</span>
                                <span className={`arrow ${expandedSections.toolCalling ? 'expanded' : ''}`}>›</span>
                              </div>
                              <p className="collapsible-subtitle">Tool calling enables the model to invoke external functions or APIs by generating structured JSON outputs based on the task.</p>
                              {expandedSections.toolCalling && (
                                <div className="collapsible-content">
                                  <textarea
                                    placeholder={'{"enabled": true, "tools": []}'}
                                    value={JSON.stringify(modelData.toolCalling, null, 2)}
                                    onChange={(e) => {
                                      try {
                                        setModelData({ ...modelData, toolCalling: JSON.parse(e.target.value) })
                                      } catch {}
                                    }}
                                    rows="4"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Modalities Supported */}
                            <div className="nested-collapsible">
                              <div 
                                className="collapsible-header"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSection('modalities')
                                }}
                              >
                                <span className="collapsible-title">Modalities supported</span>
                                <span className={`arrow ${expandedSections.modalities ? 'expanded' : ''}`}>›</span>
                              </div>
                              <p className="collapsible-subtitle">Specify the modalities supported by this model</p>
                              {expandedSections.modalities && (
                                <div className="collapsible-content">
                                  <div className="modality-options">
                                    {['text', 'image', 'audio', 'video'].map(modality => (
                                      <label key={modality} className="checkbox-option">
                                        <input
                                          type="checkbox"
                                          checked={modelData.modalities.includes(modality)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setModelData({ ...modelData, modalities: [...modelData.modalities, modality] })
                                            } else {
                                              setModelData({ ...modelData, modalities: modelData.modalities.filter(m => m !== modality) })
                                            }
                                          }}
                                        />
                                        <span>{modality.charAt(0).toUpperCase() + modality.slice(1)}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="sub-collapsible">
                        <div 
                          className="collapsible-header"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSection('bodyConfig')
                          }}
                        >
                          <span className="collapsible-title">Body</span>
                          <span className={`arrow ${expandedSections.bodyConfig ? 'expanded' : ''}`}>›</span>
                        </div>
                        <p className="collapsible-subtitle">Define the request & response structure followed by your model and the model name that needs to be passed within the request</p>
                        {expandedSections.bodyConfig && (
                          <div className="collapsible-content">
                            <textarea
                              placeholder={`{"model": "{{model}}", "messages": "{{messages}}"}`}
                              value={modelData.body}
                              onChange={(e) => setModelData({ ...modelData, body: e.target.value })}
                              rows="6"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                <div className="test-result-title">
                  {testResult.success ? '✓ Success' : '✗ Failed'}
                </div>
                <div className="test-result-message">{testResult.message}</div>
                {testResult.response && (
                  <div className="test-result-details">
                    <pre>{testResult.response}</pre>
                  </div>
                )}
              </div>
            )}
            
            {!editModel && !testPassed && step === 2 && (
              <div className="test-required-message">
                ⚠️ Please test the connection successfully before saving the model.
              </div>
            )}
          </div>
        )}

        <div className="modal-footer">
          <div className="footer-left">
            {step === 2 && (
              <button 
                className="test-btn secondary-btn" 
                onClick={handleTestConnection}
                disabled={testing || !canTest()}
              >
                {testing ? (
                  <>
                    <span className="loading-spinner"></span> Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
            )}
          </div>
          <div className="footer-right">
            {step === 2 && !editModel && (
              <button className="secondary-btn" onClick={() => setStep(1)}>
                Back
              </button>
            )}
            <button className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="primary-btn" 
              onClick={handleNext}
              disabled={step === 2 && !editModel && !testPassed}
              title={step === 2 && !editModel && !testPassed ? 'Please test the connection successfully before saving' : ''}
            >
              {editModel ? 'Save Changes' : step === 1 ? 'Next' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddModelModal
