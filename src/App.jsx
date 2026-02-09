import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import Login from './components/Login'
import Profile from './components/Profile'
import AdminPanel from './components/AdminPanel'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [chats, setChats] = useState([
    { id: 1, title: 'New Chat', messages: [], pinned: false }
  ])
  const [activeChat, setActiveChat] = useState(1)
  
  // Admin data
  const [models, setModels] = useState([
    { id: 1, name: 'GPT-4', provider: 'OpenAI', apiKey: 'sk-1234567890abcdef' },
    { id: 2, name: 'Claude 3', provider: 'Anthropic', apiKey: 'sk-ant-9876543210' }
  ])
  const [pendingUsers, setPendingUsers] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', requestDate: Date.now() - 86400000 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', requestDate: Date.now() - 172800000 }
  ])
  const [allUsers, setAllUsers] = useState([
    { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin' },
    { id: 2, name: 'Regular User', email: 'user@example.com', role: 'user' }
  ])

  const handleLogin = (userData) => {
    setUser({ ...userData, role: userData.role || 'user' })
  }

  const handleLogout = () => {
    setUser(null)
    setChats([{ id: 1, title: 'New Chat', messages: [], pinned: false }])
    setActiveChat(1)
  }

  const handleUpdateProfile = (updatedUser) => {
    setUser(updatedUser)
  }

  // Admin functions
  const addModel = (model) => {
    setModels([...models, { ...model, id: Date.now() }])
  }

  const deleteModel = (id) => {
    setModels(models.filter(m => m.id !== id))
  }

  const approveUser = (id) => {
    const user = pendingUsers.find(u => u.id === id)
    if (user) {
      setAllUsers([...allUsers, { ...user, role: 'user' }])
      setPendingUsers(pendingUsers.filter(u => u.id !== id))
    }
  }

  const rejectUser = (id) => {
    setPendingUsers(pendingUsers.filter(u => u.id !== id))
  }

  const updateUserRole = (id, role) => {
    setAllUsers(allUsers.map(u => u.id === id ? { ...u, role } : u))
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: 'New Chat',
      messages: [],
      pinned: false
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

  const renameChat = (id, newTitle) => {
    setChats(chats.map(chat => 
      chat.id === id ? { ...chat, title: newTitle } : chat
    ))
  }

  const pinChat = (id) => {
    setChats(chats.map(chat => 
      chat.id === id ? { ...chat, pinned: !chat.pinned } : chat
    ).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return 0
    }))
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
        onRenameChat={renameChat}
        onPinChat={pinChat}
        user={user}
        onLogout={handleLogout}
        onOpenProfile={() => setShowProfile(true)}
        onOpenAdmin={() => setShowAdmin(true)}
      />
      <ChatWindow 
        chat={currentChat}
        onSendMessage={sendMessage}
      />
      {showProfile && (
        <Profile 
          user={user}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
      {showAdmin && user?.role === 'admin' && (
        <AdminPanel 
          onClose={() => setShowAdmin(false)}
          models={models}
          onAddModel={addModel}
          onDeleteModel={deleteModel}
          pendingUsers={pendingUsers}
          onApproveUser={approveUser}
          onRejectUser={rejectUser}
          users={allUsers}
          onUpdateUserRole={updateUserRole}
        />
      )}
    </div>
  )
}

export default App
