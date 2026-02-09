import { useState, useRef, useEffect } from 'react'
import './Sidebar.css'

function Sidebar({ chats, activeChat, onSelectChat, onNewChat, onDeleteChat, user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo-placeholder">
          <span>Logo</span>
        </div>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        + New Chat
      </button>
      
      <div className="chat-list">
        {chats.map(chat => (
          <div 
            key={chat.id}
            className={`chat-item ${activeChat === chat.id ? 'active' : ''}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <span className="chat-title">{chat.title}</span>
            <button 
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteChat(chat.id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer" ref={menuRef}>
        <div className="user-profile" onClick={() => setShowMenu(!showMenu)}>
          <div className="avatar-placeholder">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="username">{user?.name || 'User'}</span>
        </div>
        
        {showMenu && (
          <div className="user-menu">
            <div className="menu-item">
              <span>👤</span> Profile
            </div>
            <div className="menu-item">
              <span>⚙️</span> Settings
            </div>
            <div className="menu-divider"></div>
            <div className="menu-item" onClick={onLogout}>
              <span>🚪</span> Logout
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
