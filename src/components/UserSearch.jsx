import { useState } from 'react'
import { userService } from '../services/user.service'
import { chatService } from '../services/chat.service'
import './UserSearch.css'

function UserSearch({ onClose, onChatCreated, existingChats }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [creatingChatWith, setCreatingChatWith] = useState(null)

  const handleSearch = async (searchQuery) => {
    setQuery(searchQuery)
    
    if (searchQuery.length < 2) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    try {
      const users = await userService.searchUsers(searchQuery)
      setResults(users)
      setSearched(true)
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasExistingChat = (userId) => {
    return existingChats?.some(
      chat => chat.chat_type === 'direct' && chat.participant_id === userId
    )
  }

  const handleStartChat = async (userId, userName) => {
    setCreatingChatWith(userId)
    try {
      const chat = await chatService.createDirectChat(userId)
      // Immediately update UI and close modal
      onChatCreated(chat)
      // Small delay to show success before closing
      setTimeout(() => {
        onClose()
      }, 100)
    } catch (error) {
      console.error('Error creating direct chat:', error)
      alert('Failed to start chat')
      setCreatingChatWith(null)
    }
  }

  return (
    <div className="user-search-modal" onClick={onClose}>
      <div className="user-search-content" onClick={(e) => e.stopPropagation()}>
        <div className="user-search-header">
          <h2>Search Users</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />

        <div className="search-results">
          {loading && <div className="search-hint">Searching...</div>}
          
          {!loading && !searched && (
            <div className="search-hint">Type at least 2 characters to search</div>
          )}
          
          {!loading && searched && results.length === 0 && (
            <div className="no-results">No users found</div>
          )}
          
          {!loading && results.map((user) => {
            const existingChat = hasExistingChat(user.id)
            const isCreating = creatingChatWith === user.id
            return (
              <div key={user.id} className="user-item">
                <div className="user-info">
                  <div className="user-name">{user.name}</div>
                  <div className="user-email">{user.email}</div>
                </div>
                <button 
                  className={`chat-btn ${existingChat ? 'existing' : ''} ${isCreating ? 'loading' : ''}`}
                  onClick={() => handleStartChat(user.id, user.name)}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <span className="spinner"></span>
                      Opening...
                    </>
                  ) : existingChat ? 'Open Chat' : 'Chat'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default UserSearch
