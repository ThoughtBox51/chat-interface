import { useState, useRef, useEffect } from 'react'
import './Sidebar.css'
import './LoadingSkeleton.css'

function Sidebar({ chats, activeChat, onSelectChat, onNewChat, onDeleteChat, user, onLogout, onOpenProfile, onRenameChat, onPinChat, onOpenAdmin, loading }) {
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
    const chatId = chat.id || chat._id
    setRenameId(chatId)
    setRenameValue(chat.title)
    setShowChatMenu(null)
  }

  const handleRenameSubmit = (e, chatId) => {
    if (e.key === 'Enter') {
      if (renameValue.trim()) {
        setRenameId(null) // Close input immediately
        onRenameChat(chatId, renameValue) // Update in background
      }
    } else if (e.key === 'Escape') {
      setRenameId(null)
    }
  }

  const handleRenameBlur = (chatId) => {
    if (renameValue.trim()) {
      onRenameChat(chatId, renameValue)
    }
    setRenameId(null)
  }

  const handlePinClick = (chatId) => {
    setShowChatMenu(null) // Close menu immediately
    onPinChat(chatId) // Update in background
  }

  const handleDeleteClick = (chatId) => {
    const chat = chats.find(c => (c.id || c._id) === chatId)
    const chatTitle = chat?.title || 'this chat'
    
    if (window.confirm(`Are you sure you want to delete "${chatTitle}"? This action cannot be undone.`)) {
      setShowChatMenu(null) // Close menu immediately
      onDeleteChat(chatId) // Delete in background
    } else {
      setShowChatMenu(null) // Close menu if cancelled
    }
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
        {loading ? (
          <>
            <div className="skeleton skeleton-chat-item"></div>
            <div className="skeleton skeleton-chat-item"></div>
            <div className="skeleton skeleton-chat-item"></div>
            <div className="skeleton skeleton-chat-item"></div>
          </>
        ) : chats.length === 0 ? (
          <div className="empty-chat-list">
            <p>No chats yet</p>
            <p className="empty-subtitle">Start a new conversation</p>
          </div>
        ) : (
          chats.map(chat => {
            const chatId = chat.id || chat._id
            return (
              <div 
                key={chatId}
                className={`chat-item ${activeChat === chatId ? 'active' : ''} ${chat.pinned ? 'pinned' : ''}`}
                onClick={() => onSelectChat(chatId)}
              >
                {chat.pinned && <span className="pin-icon">📌</span>}
                {renameId === chatId ? (
                  <input
                    type="text"
                    className="rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => handleRenameSubmit(e, chatId)}
                    onBlur={() => handleRenameBlur(chatId)}
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
                      setShowChatMenu(showChatMenu === chatId ? null : chatId)
                    }}
                  >
                    ⋮
                  </button>
                  {showChatMenu === chatId && (
                    <div className="chat-dropdown-menu" ref={chatMenuRef}>
                      <div className="menu-item" onClick={(e) => {
                        e.stopPropagation()
                        handleRenameClick(chat)
                      }}>
                        <span>✏️</span> Rename
                      </div>
                      <div className="menu-item" onClick={(e) => {
                        e.stopPropagation()
                        handlePinClick(chatId)
                      }}>
                        <span>{chat.pinned ? '📌' : '📍'}</span> {chat.pinned ? 'Unpin' : 'Pin'}
                      </div>
                      <div className="menu-divider"></div>
                      <div className="menu-item delete" onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(chatId)
                      }}>
                        <span>🗑️</span> Delete
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
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
