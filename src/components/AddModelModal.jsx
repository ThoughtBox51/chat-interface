import { useState } from 'react'
import './AddModelModal.css'

function AddModelModal({ onClose, onAdd, editModel }) {
  const [step, setStep] = useState(editModel ? 2 : 1)
  const [integrationType, setIntegrationType] = useState(editModel?.integrationType || 'easy')
  const [modelData, setModelData] = useState(editModel || {
    name: '',
    provider: '',
    apiKey: '',
    endpoint: '',
    headers: [{ key: '', value: '', secure: false }],
    authProfile: 'none',
    configurationType: 'default',
    variables: {},
    body: '',
    testResponse: ''
  })
  const [expandedSections, setExpandedSections] = useState({
    auth: false,
    headers: false,
    config: false
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else {
      onAdd({ ...modelData, integrationType, id: editModel?.id })
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
    
    // Simulate API test
    setTimeout(() => {
      const success = Math.random() > 0.3
      setTestResult({
        success,
        message: success 
          ? 'Connection successful! Model is responding correctly.'
          : 'Connection failed. Please check your configuration.',
        response: success ? '{"status": "ok", "model": "' + modelData.name + '", "provider": "' + (modelData.provider || 'custom') + '"}' : null
      })
      setTesting(false)
    }, 2000)
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
              <label>Model endpoint URL</label>
              <p className="field-description">Provide the endpoint URL of the model you want to connect to.</p>
              <input
                type="text"
                placeholder="Enter model endpoint URL"
                value={modelData.endpoint}
                onChange={(e) => setModelData({ ...modelData, endpoint: e.target.value })}
              />
            </div>

            <div className="expandable-section">
              <div 
                className="section-header-small"
                onClick={() => toggleSection('auth')}
              >
                <span>Authorization profile</span>
                <span className={`arrow ${expandedSections.auth ? 'expanded' : ''}`}>›</span>
              </div>
              {expandedSections.auth && (
                <div className="section-content">
                  <p className="field-description">Select the authorization profile you want to use with the request payload.</p>
                  <select 
                    value={modelData.authProfile}
                    onChange={(e) => setModelData({ ...modelData, authProfile: e.target.value })}
                  >
                    <option value="none">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apikey">API Key</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>
              )}
            </div>

            <div className="expandable-section">
              <div 
                className="section-header-small"
                onClick={() => toggleSection('headers')}
              >
                <span>Headers</span>
                <span className={`arrow ${expandedSections.headers ? 'expanded' : ''}`}>›</span>
              </div>
              {expandedSections.headers && (
                <div className="section-content">
                  <p className="field-description">Provide additional information to send along with the HTTP request payload.</p>
                  {modelData.headers.map((header, index) => (
                    <div key={index} className="header-row">
                      <input
                        type="text"
                        placeholder="Enter key"
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        className="header-input"
                      />
                      <input
                        type={header.secure ? 'password' : 'text'}
                        placeholder="Enter value"
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        className="header-input"
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
                  <button className="add-header-btn" onClick={addHeader}>
                    + Add Header
                  </button>
                </div>
              )}
            </div>

            <div className="expandable-section">
              <div 
                className="section-header-small"
                onClick={() => toggleSection('config')}
              >
                <span>Model configurations</span>
                <span className={`arrow ${expandedSections.config ? 'expanded' : ''}`}>›</span>
              </div>
              {expandedSections.config && (
                <div className="section-content">
                  <p className="field-description">Select the specifics of the model's settings</p>
                  
                  <div className="config-options">
                    <label className="radio-option">
                      <input
                        type="radio"
                        checked={modelData.configurationType === 'default'}
                        onChange={() => setModelData({ ...modelData, configurationType: 'default' })}
                      />
                      <div>
                        <strong>Default</strong>
                        <p>Use this option if you want to define a unique request response structure for your model and map it to platform variables</p>
                      </div>
                    </label>
                    
                    <label className="radio-option">
                      <input
                        type="radio"
                        checked={modelData.configurationType === 'existing'}
                        onChange={() => setModelData({ ...modelData, configurationType: 'existing' })}
                      />
                      <div>
                        <strong>Existing Provider Structures</strong>
                        <p>Use this option if your model follows a commonly known request response format like OpenAI's chat completions.</p>
                      </div>
                    </label>
                  </div>

                  {modelData.configurationType === 'default' && (
                    <>
                      <div className="form-field">
                        <label>Request Body</label>
                        <textarea
                          placeholder='{"model": "{{model}}", "messages": {{messages}}}'
                          value={modelData.body}
                          onChange={(e) => setModelData({ ...modelData, body: e.target.value })}
                          rows="4"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                <div className="test-result-header">
                  <span>{testResult.success ? '✓' : '✗'}</span>
                  <strong>{testResult.message}</strong>
                </div>
                {testResult.response && (
                  <pre className="test-response">{testResult.response}</pre>
                )}
              </div>
            )}
          </div>
        )}

        <div className="modal-footer">
          <div className="footer-left">
            {step === 2 && (
              <button 
                className="test-btn" 
                onClick={handleTestConnection}
                disabled={testing || !canTest()}
              >
                {testing ? 'Testing...' : 'Test Connection'}
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
            <button className="primary-btn" onClick={handleNext}>
              {editModel ? 'Save Changes' : step === 1 ? 'Next' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddModelModal
