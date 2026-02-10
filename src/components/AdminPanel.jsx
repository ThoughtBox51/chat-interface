import { useState } from 'react'
import AddModelModal from './AddModelModal'
import RoleModal from './RoleModal'
import './AdminPanel.css'

function AdminPanel({ onClose, models, onAddModel, onDeleteModel, onEditModel, pendingUsers, onApproveUser, onRejectUser, users, onUpdateUserRole, roles, onAddRole, onEditRole, onDeleteRole }) {
  const [activeTab, setActiveTab] = useState('models')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingModel, setEditingModel] = useState(null)
  const [testingModelId, setTestingModelId] = useState(null)
  const [modelTestResults, setModelTestResults] = useState({})
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  const handleAddModel = (modelData) => {
    if (modelData.id) {
      onEditModel(modelData)
    } else {
      onAddModel(modelData)
    }
    setShowAddModal(false)
    setEditingModel(null)
  }

  const handleEditClick = (model) => {
    setEditingModel(model)
    setShowAddModal(true)
  }

  const handleTestModel = async (model) => {
    setTestingModelId(model.id)
    
    // Simulate API test
    setTimeout(() => {
      const success = Math.random() > 0.3
      setModelTestResults({
        ...modelTestResults,
        [model.id]: {
          success,
          message: success 
            ? 'Connection successful!'
            : 'Connection failed.',
          timestamp: new Date().toLocaleTimeString()
        }
      })
      setTestingModelId(null)
      
      // Clear result after 5 seconds
      setTimeout(() => {
        setModelTestResults(prev => {
          const newResults = { ...prev }
          delete newResults[model.id]
          return newResults
        })
      }, 5000)
    }, 2000)
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-left">
          <button className="back-btn" onClick={onClose}>←</button>
          <h2>Admin Panel</h2>
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          Models
        </button>
        <button 
          className={`tab-btn ${activeTab === 'signups' ? 'active' : ''}`}
          onClick={() => setActiveTab('signups')}
        >
          Pending Signups
          {pendingUsers.length > 0 && <span className="tab-badge">{pendingUsers.length}</span>}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          Roles & Permissions
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'models' && (
          <div className="models-section">
            <div className="section-header">
              <h3>Models</h3>
              <button className="add-model-btn" onClick={() => setShowAddModal(true)}>
                <span>+</span> Add Model
              </button>
            </div>
            <div className="models-list">
              {models.map(model => (
                <div key={model.id} className="model-card">
                  <div className="model-info">
                    <h4>{model.name}</h4>
                    <p>Provider: {model.provider || 'Custom'}</p>
                    {model.apiKey && <p className="api-key">API Key: {model.apiKey?.substring(0, 10)}...</p>}
                    {model.endpoint && <p className="endpoint">Endpoint: {model.endpoint}</p>}
                    {model.integrationType && (
                      <span className="integration-badge">{model.integrationType === 'easy' ? 'Easy Integration' : 'Custom Integration'}</span>
                    )}
                    {modelTestResults[model.id] && (
                      <div className={`test-status ${modelTestResults[model.id].success ? 'success' : 'error'}`}>
                        <span>{modelTestResults[model.id].success ? '✓' : '✗'}</span>
                        {modelTestResults[model.id].message}
                        <span className="test-time">{modelTestResults[model.id].timestamp}</span>
                      </div>
                    )}
                  </div>
                  <div className="model-actions">
                    <button 
                      className="test-model-btn"
                      onClick={() => handleTestModel(model)}
                      disabled={testingModelId === model.id}
                    >
                      {testingModelId === model.id ? 'Testing...' : 'Test'}
                    </button>
                    <button 
                      className="edit-model-btn"
                      onClick={() => handleEditClick(model)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-model-btn"
                      onClick={() => onDeleteModel(model.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'signups' && (
          <div className="signups-section">
            <div className="section-header">
              <h3>Pending Signup Requests</h3>
            </div>
              {pendingUsers.length === 0 ? (
                <p className="empty-message">No pending signup requests</p>
              ) : (
                <div className="signups-list">
                  {pendingUsers.map(user => (
                    <div key={user.id} className="signup-card">
                      <div className="signup-info">
                        <h4>{user.name}</h4>
                        <p>{user.email}</p>
                        <p className="signup-date">Requested: {new Date(user.requestDate).toLocaleDateString()}</p>
                      </div>
                      <div className="signup-actions">
                        <button 
                          className="approve-btn"
                          onClick={() => onApproveUser(user.id)}
                        >
                          Approve
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => onRejectUser(user.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h3>Manage Users</h3>
            </div>
              <div className="users-list">
              {users.map(user => (
                <div key={user.id} className="user-card">
                  <div className="user-info">
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                  </div>
                  <select 
                    value={user.role}
                    onChange={(e) => onUpdateUserRole(user.id, e.target.value)}
                    className="role-select"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.name.toLowerCase()}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="roles-section">
            <div className="section-header">
              <h3>Roles & Permissions</h3>
              <button className="add-model-btn" onClick={() => {
                setEditingRole(null)
                setShowRoleModal(true)
              }}>
                <span>+</span> Create Role
              </button>
            </div>

            <div className="roles-list">
              {roles.map(role => (
                <div key={role.id} className="role-card">
                  <div className="role-info">
                    <h4>{role.name}</h4>
                    <p>{role.description}</p>
                    <div className="role-stats">
                      <span className="stat-badge">
                        {Object.values(role.permissions.models).filter(p => p.use).length} Models
                      </span>
                      <span className="stat-badge">
                        {Object.values(role.permissions.features).filter(Boolean).length} Features
                      </span>
                      <span className="stat-badge">
                        {Object.values(role.permissions.admin).filter(Boolean).length} Admin
                      </span>
                    </div>
                  </div>
                  <div className="model-actions">
                    <button 
                      className="edit-model-btn"
                      onClick={() => {
                        setEditingRole(role)
                        setShowRoleModal(true)
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-model-btn"
                      onClick={() => onDeleteRole(role.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddModelModal 
          onClose={() => {
            setShowAddModal(false)
            setEditingModel(null)
          }}
          onAdd={handleAddModel}
          editModel={editingModel}
        />
      )}
      {showRoleModal && (
        <RoleModal 
          onClose={() => {
            setShowRoleModal(false)
            setEditingRole(null)
          }}
          onSave={(roleData) => {
            if (roleData.id && editingRole) {
              onEditRole(roleData)
            } else {
              onAddRole(roleData)
            }
            setShowRoleModal(false)
            setEditingRole(null)
          }}
          editRole={editingRole}
          models={models}
        />
      )}
    </div>
  )
}

export default AdminPanel
