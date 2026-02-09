import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import './App.css'

function App() {
  const [chats, setChats] = useState([
    { id: 1, title: 'New Chat', messages: [] }
  ])
  const [activeChat, setActiveChat] = useState(1)

  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: 'New Chat',
      messages: []
    }
    setChats([newChat, ...chats])
    setActiveChat(newChat.id)
  }

  const deleteChat = (id) => {
    const filtered = chats.filter(chat => chat.id !== id)
    setChats(filtered)
    if (activeChat === id && filtered.length > 0) {
      setActiveChat(filtered[0].id)
    }
  }

  const sendMessage = (content) => {
    setChats(chats.map(chat => {
      if (chat.id === activeChat) {
        const newMessages = [
          ...chat.messages,
          { role: 'user', content }
        ]
        
        // Update title from first message
        const title = chat.messages.length === 0 
          ? content.slice(0, 30) + (content.length > 30 ? '...' : '')
          : chat.title

        // Simulate AI response
        setTimeout(() => {
          setChats(prev => prev.map(c => 
            c.id === activeChat 
              ? { ...c, messages: [...newMessages, { role: 'assistant', content: 'This is a simulated response. Connect to your LLM API here.' }] }
              : c
          ))
        }, 500)

        return { ...chat, title, messages: newMessages }
      }
      return chat
    }))
  }

  const currentChat = chats.find(chat => chat.id === activeChat)

  return (
    <div className="app">
      <Sidebar 
        chats={chats}
        activeChat={activeChat}
        onSelectChat={setActiveChat}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
      />
      <ChatWindow 
        chat={currentChat}
        onSendMessage={sendMessage}
      />
    </div>
  )
}

export default App
