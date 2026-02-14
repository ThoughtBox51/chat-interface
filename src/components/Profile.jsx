import { useState, useEffect } from 'react'
import './Profile.css'
import { roleService } from '../services/role.service'
import { formatTokenCount, calculatePercentage } from '../utils/tokenCounter'

function Profile({ user, onUpdateProfile, onClose }) {
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email || '')
  const [bio, setBio] = useState(user.bio || '')
  const [limits, setLimits] = useState(null)

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const limitsData = await roleService.getCurrentUserLimits()
        setLimits(limitsData)
      } catch (error) {
        console.error('Error fetching limits:', error)
      }
    }
    fetchLimits()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    // Only send name and bio (email cannot be changed)
    onUpdateProfile({ name, bio })
    onClose()
  }

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2>Profile Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {name.charAt(0).toUpperCase()}
            </div>
            <button type="button" className="change-avatar-btn">
              Change Avatar
            </button>
          </div>

          <div className="profile-form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="profile-form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="disabled-input"
              title="Email cannot be changed"
            />
            <span className="field-hint">Email cannot be changed</span>
          </div>

          <div className="profile-form-group">
            <label>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows="4"
            />
          </div>

          {limits && limits.max_tokens_per_month && (
            <div className="usage-stats-section">
              <h3>Usage Statistics</h3>
              
              <div className="stat-item">
                <div className="stat-header">
                  <label>Token Usage This Month</label>
                  <span className="stat-value">
                    {formatTokenCount(limits.tokens_used_this_month)} / {formatTokenCount(limits.max_tokens_per_month)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${calculatePercentage(limits.tokens_used_this_month, limits.max_tokens_per_month)}%`,
                      backgroundColor: calculatePercentage(limits.tokens_used_this_month, limits.max_tokens_per_month) > 90 ? '#ef4444' : '#10a37f'
                    }}
                  />
                </div>
                <div className="stat-footer">
                  <span>{calculatePercentage(limits.tokens_used_this_month, limits.max_tokens_per_month)}% used</span>
                  <span>{formatTokenCount(limits.max_tokens_per_month - limits.tokens_used_this_month)} remaining</span>
                </div>
              </div>
            </div>
          )}

          <div className="profile-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Profile
