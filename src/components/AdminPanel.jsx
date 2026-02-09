import { useState } from 'react'
import './AdminPanel.css'

function AdminPanel({ onClose, models, onAddModel, onDeleteModel, pendingUsers, onApproveUser, onRejectUser, users, onUpdateUserRole }) {
  const [activeTab, setActiveTab] = useState('models')
  const [newModel, setNewModel] = useState({ name: '', provider: '', apiKey: '' })

  const handleAddModel = (e) => {
    e.preventDefault()
    onAddModel(newModel)
    setNewModel({ name: '', provider: '', apiKey: '' })
  }

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="admin-header">
          <h2>Admin Panel</h2>
          <button className="close-btn" onClick={onClose}>×</button>
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
            Pending Signups ({pendingUsers.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'models' && (
            <div className="models-section">
              <h3>Add New Model</h3>
              <form onSubmit={handleAddModel} className="add-model-form">
                <input
                  type="text"
                  placeholder="Model Name (e.g., GPT-4)"
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Provider (e.g., OpenAI)"
                  value={newModel.provider}
                  onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="API Key"
                  value={newModel.apiKey}
                  onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                  required
                />
                <button type="submit" className="add-btn">Add Model</button>
              </form>

              <h3>Existing Models</h3>
              <div className="models-list">
                {models.map(model => (
                  <div key={model.id} className="model-card">
                    <div className="model-info">
                      <h4>{model.name}</h4>
                      <p>Provider: {model.provider}</p>
                      <p className="api-key">API Key: {model.apiKey.substring(0, 10)}...</p>
                    </div>
                    <button 
                      className="delete-model-btn"
                      onClick={() => onDeleteModel(model.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'signups' && (
            <div className="signups-section">
              <h3>Pending Signup Requests</h3>
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
              <h3>Manage Users</h3>
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
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
