import { useState, useRef, useEffect } from 'react'
import './ChatWindow.css'

function ChatWindow({ chat, onSendMessage, models = [], sending }) {
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chat?.messages])

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id || models[0]._id)
    }
  }, [models])

  const formatMessage = (content) => {
    // Enhanced markdown-like formatting
    let formatted = content
    
    // Escape HTML to prevent XSS
    formatted = formatted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Remove standalone --- lines (horizontal rules that create gaps)
    formatted = formatted.replace(/^---+$/gm, '')
    
    // Headers (must come before bold)
    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>')
    
    // Code blocks with language support ```language\ncode```
    formatted = formatted.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`
    })
    
    // Inline code `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // Bold text **text**
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    
    // Italic text *text* (but not in middle of words)
    formatted = formatted.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '<em>$1</em>')
    
    // Numbered lists
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li class="numbered">$1</li>')
    
    // Bullet lists (-, *, •)
    formatted = formatted.replace(/^[\-\*•]\s+(.+)$/gm, '<li class="bullet">$1</li>')
    
    // Wrap consecutive list items
    formatted = formatted.replace(/(<li class="numbered">[\s\S]+?<\/li>)(?!\n<li class="numbered">)/g, '<ol>$1</ol>')
    formatted = formatted.replace(/(<li class="bullet">[\s\S]+?<\/li>)(?!\n<li class="bullet">)/g, '<ul>$1</ul>')
    
    // Links [text](url)
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Clean up multiple consecutive newlines (more than 2)
    formatted = formatted.replace(/\n{3,}/g, '\n\n')
    
    // Paragraphs - split by double newlines
    const parts = formatted.split(/\n\n+/)
    formatted = parts.map(part => {
      part = part.trim()
      if (!part) return ''
      // Don't wrap if already wrapped in block elements
      if (part.match(/^<(h[123]|pre|ol|ul|blockquote)/)) {
        return part
      }
      // Single newlines become <br>
      const withBreaks = part.replace(/\n/g, '<br>')
      return `<p>${withBreaks}</p>`
    }).filter(p => p).join('')
    
    return formatted
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (input.trim() && !sending && selectedModel) {
      const message = input
      setInput('')
      await onSendMessage(message, selectedModel)
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <select 
          className="model-selector"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={models.length === 0}
        >
          {models.length === 0 ? (
            <option value="">No models available</option>
          ) : (
            models.map(model => (
              <option key={model.id || model._id} value={model.id || model._id}>
                {model.display_name || model.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="messages">
        {chat?.messages.length === 0 ? (
          <div className="empty-state">
            <h1>Chat App</h1>
            <p>Start a conversation</p>
          </div>
        ) : (
          <>
            {chat?.messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div 
                  className="message-content"
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
              </div>
            ))}
            {sending && (
              <div className="message assistant typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </>
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
          disabled={sending}
        />
        <button type="submit" className="send-btn" disabled={sending}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default ChatWindow
