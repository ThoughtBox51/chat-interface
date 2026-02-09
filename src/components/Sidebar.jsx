import './Sidebar.css'

function Sidebar({ chats, activeChat, onSelectChat, onNewChat, onDeleteChat }) {
  return (
    <div className="sidebar">
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
    </div>
  )
}

export default Sidebar
