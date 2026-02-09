import { useState, useRef, useEffect } from 'react'
import './ChatWindow.css'

function ChatWindow({ chat, onSendMessage }) {
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chat?.messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      onSendMessage(input)
      setInput('')
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <select 
          className="model-selector"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="claude-3">Claude 3</option>
          <option value="claude-2">Claude 2</option>
        </select>
      </div>

      <div className="messages">
        {chat?.messages.length === 0 ? (
          <div className="empty-state">
            <h1>Chat App</h1>
            <p>Start a conversation</p>
          </div>
        ) : (
          chat?.messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a message..."
          className="message-input"
        />
        <button type="submit" className="send-btn">
          Send
        </button>
      </form>
    </div>
  )
}

export default ChatWindow
