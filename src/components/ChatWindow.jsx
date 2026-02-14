import { useState, useRef, useEffect } from 'react'
import './ChatWindow.css'
import { roleService } from '../services/role.service'
import { countChatTokens, formatTokenCount, calculatePercentage } from '../utils/tokenCounter'

function ChatWindow({ chat, onSendMessage, models = [], sending }) {
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [limits, setLimits] = useState(null)
  const [currentTokens, setCurrentTokens] = useState(0)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const limitsData = await roleService.getCurrentUserLimits()
        console.log('Fetched limits:', limitsData)
        setLimits(limitsData)
      } catch (error) {
        console.error('Error fetching limits:', error)
      }
    }
    fetchLimits()
  }, [])

  useEffect(() => {
    if (chat?.messages) {
      const tokens = countChatTokens(chat.messages)
      console.log('Current tokens:', tokens, 'Limits:', limits)
      setCurrentTokens(tokens)
    } else {
      setCurrentTokens(0)
    }
  }, [chat?.messages, limits])

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
      // Only check context limit if one is actually set (not null/undefined)
      if (limits && limits.context_length !== null && limits.context_length !== undefined) {
        const estimatedNewTokens = Math.ceil(input.length / 4) + 10 // Estimate tokens for new message
        const projectedTotal = currentTokens + estimatedNewTokens
        
        if (projectedTotal > limits.context_length) {
          alert(`Context limit reached! This chat has used ${formatTokenCount(currentTokens)} of ${formatTokenCount(limits.context_length)} tokens. Please start a new chat to continue.`)
          return
        }
      }
      
      const message = input
      setInput('')
      await onSendMessage(message, selectedModel)
    }
  }

  // Only show limit reached if there's actually a limit set
  const isContextLimitReached = limits && 
    limits.context_length !== null && 
    limits.context_length !== undefined && 
    currentTokens >= limits.context_length

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
        
        {(() => {
          const shouldShow = limits && limits.context_length !== null && limits.context_length !== undefined && chat?.messages?.length > 0
          console.log('Context indicator check:', {
            limits,
            hasContextLength: limits?.context_length,
            isNotNull: limits?.context_length !== null,
            isNotUndefined: limits?.context_length !== undefined,
            hasMessages: chat?.messages?.length > 0,
            shouldShow
          })
          return shouldShow ? (
            <div className="context-indicator">
              <span className="context-label">Context:</span>
              <span className="context-value">
                {formatTokenCount(currentTokens)} / {formatTokenCount(limits.context_length)}
              </span>
              <div className="context-bar">
                <div 
                  className="context-fill"
                  style={{ 
                    width: `${calculatePercentage(currentTokens, limits.context_length)}%`,
                    backgroundColor: calculatePercentage(currentTokens, limits.context_length) > 90 ? '#ef4444' : '#10a37f'
                  }}
                />
              </div>
            </div>
          ) : null
        })()}
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
        {isContextLimitReached && (
          <div className="context-warning">
            ⚠️ Context limit reached. Start a new chat to continue.
          </div>
        )}
        <div className="input-form-controls">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isContextLimitReached ? "Context limit reached - start new chat" : "Send a message..."}
            className="message-input"
            disabled={sending || isContextLimitReached}
          />
          <button 
            type="submit" 
            className="send-btn" 
            disabled={sending || isContextLimitReached}
            title={isContextLimitReached ? "Context limit reached" : ""}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatWindow
