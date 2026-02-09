import { useState, useRef, useEffect } from 'react'
import './Sidebar.css'

function Sidebar({ chats, activeChat, onSelectChat, onNewChat, onDeleteChat, user, onLogout, onOpenProfile, onRenameChat, onPinChat, onOpenAdmin }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(null)
  const [renameId, setRenameId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const menuRef = useRef(null)
  const chatMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target)) {
        setShowChatMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProfileClick = () => {
    setShowMenu(false)
    onOpenProfile()
  }

  const handleAdminClick = () => {
    setShowMenu(false)
    onOpenAdmin()
  }

  const handleRenameClick = (chat) => {
    setRenameId(chat.id)
    setRenameValue(chat.title)
    setShowChatMenu(null)
  }

  const handleRenameSubmit = (e, chatId) => {
    if (e.key === 'Enter') {
      onRenameChat(chatId, renameValue)
      setRenameId(null)
    } else if (e.key === 'Escape') {
      setRenameId(null)
    }
  }

  const handlePinClick = (chatId) => {
    onPinChat(chatId)
    setShowChatMenu(null)
  }

  const handleDeleteClick = (chatId) => {
    onDeleteChat(chatId)
    setShowChatMenu(null)
  }
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
            className={`chat-item ${activeChat === chat.id ? 'active' : ''} ${chat.pinned ? 'pinned' : ''}`}
            onClick={() => onSelectChat(chat.id)}
          >
            {chat.pinned && <span className="pin-icon">📌</span>}
            {renameId === chat.id ? (
              <input
                type="text"
                className="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => handleRenameSubmit(e, chat.id)}
                onBlur={() => setRenameId(null)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="chat-title">{chat.title}</span>
            )}
            <div className="chat-actions">
              <button 
                className="menu-dots-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowChatMenu(showChatMenu === chat.id ? null : chat.id)
                }}
              >
                ⋮
              </button>
              {showChatMenu === chat.id && (
                <div className="chat-dropdown-menu" ref={chatMenuRef}>
                  <div className="menu-item" onClick={(e) => {
                    e.stopPropagation()
                    handleRenameClick(chat)
                  }}>
                    <span>✏️</span> Rename
                  </div>
                  <div className="menu-item" onClick={(e) => {
                    e.stopPropagation()
                    handlePinClick(chat.id)
                  }}>
                    <span>{chat.pinned ? '📌' : '📍'}</span> {chat.pinned ? 'Unpin' : 'Pin'}
                  </div>
                  <div className="menu-divider"></div>
                  <div className="menu-item delete" onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(chat.id)
                  }}>
                    <span>🗑️</span> Delete
                  </div>
                </div>
              )}
            </div>
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
            <div className="menu-item" onClick={handleProfileClick}>
              <span>👤</span> Profile
            </div>
            <div className="menu-item">
              <span>⚙️</span> Settings
            </div>
            {user?.role === 'admin' && (
              <>
                <div className="menu-divider"></div>
                <div className="menu-item" onClick={handleAdminClick}>
                  <span>🔧</span> Admin Panel
                </div>
              </>
            )}
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
