import { useState } from 'react'
import './RoleModal.css'

function RoleModal({ onClose, onSave, editRole, models }) {
  const [roleData, setRoleData] = useState(() => {
    // Ensure all fields are present, even when editing existing roles
    const defaultData = {
      name: '',
      description: '',
      max_chats: null,
      max_tokens_per_month: null,
      context_length: 4096,
      permissions: {
        models: {},
        features: {
          chat: false,
          history: false,
          export: false,
          share: false,
          settings: false,
          profile: false
        },
        admin: {
          manageUsers: false,
          manageModels: false,
          manageRoles: false,
          viewAnalytics: false,
          systemSettings: false
        }
      }
    }
    
    // Merge with editRole data if provided
    if (editRole) {
      return {
        ...defaultData,
        ...editRole,
        // Ensure limits are properly set (convert undefined to null)
        max_chats: editRole.max_chats !== undefined ? editRole.max_chats : null,
        max_tokens_per_month: editRole.max_tokens_per_month !== undefined ? editRole.max_tokens_per_month : null,
        context_length: editRole.context_length !== undefined ? editRole.context_length : 4096,
        permissions: {
          ...defaultData.permissions,
          ...editRole.permissions
        }
      }
    }
    
    return defaultData
  })

  const handleSave = () => {
    // Use the correct ID field (id for roles, not _id)
    const roleToSave = {
      ...roleData,
      id: editRole?.id || editRole?._id
    }
    console.log('Saving role with data:', roleToSave)
    onSave(roleToSave)
    onClose()
  }

  const toggleModelPermission = (modelId, permission) => {
    setRoleData({
      ...roleData,
      permissions: {
        ...roleData.permissions,
        models: {
          ...roleData.permissions.models,
          [modelId]: {
            ...roleData.permissions.models[modelId],
            [permission]: !roleData.permissions.models[modelId]?.[permission]
          }
        }
      }
    })
  }

  const toggleFeaturePermission = (feature) => {
    setRoleData({
      ...roleData,
      permissions: {
        ...roleData.permissions,
        features: {
          ...roleData.permissions.features,
          [feature]: !roleData.permissions.features[feature]
        }
      }
    })
  }

  const toggleAdminPermission = (permission) => {
    setRoleData({
      ...roleData,
      permissions: {
        ...roleData.permissions,
        admin: {
          ...roleData.permissions.admin,
          [permission]: !roleData.permissions.admin[permission]
        }
      }
    })
  }

  const selectAllModels = (permission) => {
    const newModels = {}
    models.forEach(model => {
      newModels[model.id] = {
        ...roleData.permissions.models[model.id],
        [permission]: true
      }
    })
    setRoleData({
      ...roleData,
      permissions: {
        ...roleData.permissions,
        models: newModels
      }
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="role-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{editRole ? 'Edit Role' : 'Create New Role'}</h2>
            <p className="modal-subtitle">Define role permissions for models and features</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label>Role Name</label>
            <input
              type="text"
              placeholder="e.g., Content Creator, Analyst"
              value={roleData.name}
              onChange={(e) => setRoleData({ ...roleData, name: e.target.value })}
            />
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea
              placeholder="Describe what this role can do"
              value={roleData.description}
              onChange={(e) => setRoleData({ ...roleData, description: e.target.value })}
              rows="2"
            />
          </div>

          <div className="permissions-section">
            <h3>Usage Limits</h3>
            <p className="section-description">Set resource limits for this role (leave empty for unlimited)</p>
            
            <div className="limits-grid">
              <div className="form-field">
                <label>Max Chats</label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  min="0"
                  value={roleData.max_chats || ''}
                  onChange={(e) => setRoleData({ 
                    ...roleData, 
                    max_chats: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
                <span className="field-hint">Maximum number of chats this role can create</span>
              </div>

              <div className="form-field">
                <label>Max Tokens per Month</label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  min="0"
                  value={roleData.max_tokens_per_month || ''}
                  onChange={(e) => setRoleData({ 
                    ...roleData, 
                    max_tokens_per_month: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
                <span className="field-hint">Monthly token usage limit</span>
              </div>

              <div className="form-field">
                <label>Context Length</label>
                <input
                  type="number"
                  placeholder="4096"
                  min="512"
                  max="128000"
                  value={roleData.context_length || 4096}
                  onChange={(e) => setRoleData({ 
                    ...roleData, 
                    context_length: e.target.value ? parseInt(e.target.value) : 4096 
                  })}
                />
                <span className="field-hint">Maximum context length for chat sessions</span>
              </div>
            </div>
          </div>

          <div className="permissions-section">
            <h3>Model Permissions</h3>
            <p className="section-description">Control which models this role can access and use</p>
            
            {models.length > 0 ? (
              <>
                <div className="permission-actions">
                  <button className="select-all-btn" onClick={() => selectAllModels('use')}>
                    Select All for Use
                  </button>
                  <button className="select-all-btn" onClick={() => selectAllModels('view')}>
                    Select All for View
                  </button>
                </div>

                <div className="permissions-table">
                  <div className="table-header">
                    <div className="model-name-col">Model</div>
                    <div className="permission-col">View</div>
                    <div className="permission-col">Use</div>
                    <div className="permission-col">Configure</div>
                  </div>
                  {models.map(model => (
                    <div key={model.id} className="table-row">
                      <div className="model-name-col">
                        <strong>{model.name}</strong>
                        <span className="model-provider">{model.provider || 'Custom'}</span>
                      </div>
                      <div className="permission-col">
                        <input
                          type="checkbox"
                          checked={roleData.permissions.models[model.id]?.view || false}
                          onChange={() => toggleModelPermission(model.id, 'view')}
                        />
                      </div>
                      <div className="permission-col">
                        <input
                          type="checkbox"
                          checked={roleData.permissions.models[model.id]?.use || false}
                          onChange={() => toggleModelPermission(model.id, 'use')}
                        />
                      </div>
                      <div className="permission-col">
                        <input
                          type="checkbox"
                          checked={roleData.permissions.models[model.id]?.configure || false}
                          onChange={() => toggleModelPermission(model.id, 'configure')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty-message">No models available. Add models first to assign permissions.</p>
            )}
          </div>

          <div className="permissions-section">
            <h3>Feature Permissions</h3>
            <p className="section-description">Control access to platform features</p>
            
            <div className="permission-grid">
              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.features.chat}
                  onChange={() => toggleFeaturePermission('chat')}
                />
                <div>
                  <strong>Chat</strong>
                  <span>Create and send messages</span>
                </div>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.features.history}
                  onChange={() => toggleFeaturePermission('history')}
                />
                <div>
                  <strong>Chat History</strong>
                  <span>View and manage chat history</span>
                </div>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.features.export}
                  onChange={() => toggleFeaturePermission('export')}
                />
                <div>
                  <strong>Export</strong>
                  <span>Export conversations and data</span>
                </div>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.features.share}
                  onChange={() => toggleFeaturePermission('share')}
                />
                <div>
                  <strong>Share</strong>
                  <span>Share chats with others</span>
                </div>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.features.settings}
                  onChange={() => toggleFeaturePermission('settings')}
                />
                <div>
                  <strong>Settings</strong>
                  <span>Access user settings</span>
                </div>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.features.profile}
                  onChange={() => toggleFeaturePermission('profile')}
                />
                <div>
                  <strong>Profile</strong>
                  <span>Edit profile information</span>
                </div>
              </label>
            </div>
          </div>

          <div className="permissions-section">
            <h3>Admin Permissions</h3>
            <p className="section-description">Grant administrative capabilities</p>
            
            <div className="permission-grid">
              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.admin.manageUsers}
                  onChange={() => toggleAdminPermission('manageUsers')}
                />
                <div>
                  <strong>Manage Users</strong>
                  <span>Create, edit, and delete users</span>
                </div>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.admin.manageModels}
                  onChange={() => toggleAdminPermission('manageModels')}
                />
                <div>
                  <strong>Manage Models</strong>
                  <span>Add, edit, and remove models</span>
                </div>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.admin.manageRoles}
                  onChange={() => toggleAdminPermission('manageRoles')}
                />
                <div>
                  <strong>Manage Roles</strong>
                  <span>Create and edit roles</span>
                </div>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.admin.viewAnalytics}
                  onChange={() => toggleAdminPermission('viewAnalytics')}
                />
                <div>
                  <strong>View Analytics</strong>
                  <span>Access usage analytics</span>
                </div>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={roleData.permissions.admin.systemSettings}
                  onChange={() => toggleAdminPermission('systemSettings')}
                />
                <div>
                  <strong>System Settings</strong>
                  <span>Configure system settings</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-right">
            <button className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="primary-btn" 
              onClick={handleSave}
              disabled={!roleData.name}
            >
              {editRole ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoleModal
