import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import Login from './components/Login'
import Profile from './components/Profile'
import AdminPanel from './components/AdminPanel'
import { authService } from './services/auth.service'
import { chatService } from './services/chat.service'
import { modelService } from './services/model.service'
import { userService } from './services/user.service'
import { roleService } from './services/role.service'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Admin data
  const [models, setModels] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [roles, setRoles] = useState([])

  useEffect(() => {
    const initUser = authService.getCurrentUser()
    if (initUser) {
      setUser(initUser)
      loadUserData()
    } else {
      setLoading(false)
    }
  }, [])

  const loadUserData = async () => {
    try {
      const [chatsData, modelsData] = await Promise.all([
        chatService.getChats(),
        modelService.getModels()
      ])
      setChats(chatsData)
      setModels(modelsData)
      if (chatsData.length > 0) {
        setActiveChat(chatsData[0].id || chatsData[0]._id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAdminData = async () => {
    try {
      const [usersData, pendingData, rolesData] = await Promise.all([
        userService.getUsers(),
        userService.getPendingUsers(),
        roleService.getRoles()
      ])
      setAllUsers(usersData)
      setPendingUsers(pendingData)
      setRoles(rolesData)
    } catch (error) {
      console.error('Error loading admin data:', error)
    }
  }

  const handleLogin = (userData) => {
    setUser(userData)
    loadUserData()
  }

  const handleLogout = () => {
    authService.logout()
    setUser(null)
    setChats([])
    setActiveChat(null)
  }

  const handleUpdateProfile = async (updatedUser) => {
    try {
      const updated = await authService.updateProfile(updatedUser)
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  // Admin functions
  const addModel = async (model) => {
    try {
      const newModel = await modelService.createModel(model)
      setModels([...models, newModel])
    } catch (error) {
      console.error('Error adding model:', error)
    }
  }

  const editModel = async (updatedModel) => {
    try {
      const modelId = updatedModel.id || updatedModel._id
      const updated = await modelService.updateModel(modelId, updatedModel)
      setModels(models.map(m => (m.id || m._id) === (updated.id || updated._id) ? updated : m))
    } catch (error) {
      console.error('Error updating model:', error)
    }
  }

  const deleteModel = async (id) => {
    try {
      await modelService.deleteModel(id)
      setModels(models.filter(m => (m.id || m._id) !== id))
    } catch (error) {
      console.error('Error deleting model:', error)
    }
  }

  const approveUser = async (id) => {
    try {
      await userService.approveUser(id)
      await loadAdminData()
    } catch (error) {
      console.error('Error approving user:', error)
    }
  }

  const rejectUser = async (id) => {
    try {
      await userService.deleteUser(id)
      setPendingUsers(pendingUsers.filter(u => u._id !== id))
    } catch (error) {
      console.error('Error rejecting user:', error)
    }
  }

  const updateUserRole = async (id, role) => {
    try {
      await userService.updateUserRole(id, role)
      setAllUsers(allUsers.map(u => u._id === id ? { ...u, role } : u))
    } catch (error) {
      console.error('Error updating user role:', error)
    }
  }

  const addRole = async (role) => {
    try {
      const newRole = await roleService.createRole(role)
      setRoles([...roles, newRole])
    } catch (error) {
      console.error('Error adding role:', error)
    }
  }

  const editRole = async (updatedRole) => {
    try {
      const updated = await roleService.updateRole(updatedRole._id, updatedRole)
      setRoles(roles.map(r => r._id === updated._id ? updated : r))
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const deleteRole = async (id) => {
    try {
      await roleService.deleteRole(id)
      setRoles(roles.filter(r => r._id !== id))
    } catch (error) {
      console.error('Error deleting role:', error)
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  if (showAdmin && user?.role === 'admin') {
    if (models.length === 0 || allUsers.length === 0) {
      loadAdminData()
    }
    
    return (
      <AdminPanel 
        onClose={() => setShowAdmin(false)}
        models={models}
        onAddModel={addModel}
        onEditModel={editModel}
        onDeleteModel={deleteModel}
        pendingUsers={pendingUsers}
        onApproveUser={approveUser}
        onRejectUser={rejectUser}
        users={allUsers}
        onUpdateUserRole={updateUserRole}
        roles={roles}
        onAddRole={addRole}
        onEditRole={editRole}
        onDeleteRole={deleteRole}
      />
    )
  }

  const createNewChat = async () => {
    try {
      const newChat = await chatService.createChat({ title: 'New Chat', messages: [] })
      setChats([newChat, ...chats])
      setActiveChat(newChat.id || newChat._id)
    } catch (error) {
      console.error('Error creating chat:', error)
    }
  }

  const deleteChat = async (id) => {
    try {
      await chatService.deleteChat(id)
      const filtered = chats.filter(chat => (chat.id || chat._id) !== id)
      setChats(filtered)
      if (activeChat === id && filtered.length > 0) {
        setActiveChat(filtered[0].id || filtered[0]._id)
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  const renameChat = async (id, newTitle) => {
    try {
      await chatService.updateChat(id, { title: newTitle })
      setChats(chats.map(chat => 
        (chat.id || chat._id) === id ? { ...chat, title: newTitle } : chat
      ))
    } catch (error) {
      console.error('Error renaming chat:', error)
    }
  }

  const pinChat = async (id) => {
    try {
      const chat = chats.find(c => (c.id || c._id) === id)
      await chatService.updateChat(id, { pinned: !chat.pinned })
      setChats(chats.map(chat => 
        (chat.id || chat._id) === id ? { ...chat, pinned: !chat.pinned } : chat
      ).sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return 0
      }))
    } catch (error) {
      console.error('Error pinning chat:', error)
    }
  }

  const sendMessage = async (content) => {
    try {
      // If no active chat, create one first
      if (!activeChat) {
        const newChat = await chatService.createChat({ title: 'New Chat', messages: [] })
        setChats([newChat, ...chats])
        setActiveChat(newChat.id)
        
        // Send message to the new chat
        await chatService.sendMessage(newChat.id, { role: 'user', content })
        
        // Update the new chat with the message
        const updatedChat = {
          ...newChat,
          title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
          messages: [{ role: 'user', content, timestamp: new Date().toISOString() }]
        }
        setChats([updatedChat, ...chats])
        
        // Simulate AI response
        setTimeout(async () => {
          await chatService.sendMessage(newChat.id, { 
            role: 'assistant', 
            content: 'This is a simulated response. Connect to your LLM API here.' 
          })
          const updatedChats = await chatService.getChats()
          setChats(updatedChats)
        }, 500)
        
        return
      }
      
      // Send message to existing chat
      await chatService.sendMessage(activeChat, { role: 'user', content })
      
      // Update local state
      setChats(chats.map(chat => {
        if (chat.id === activeChat || chat._id === activeChat) {
          const newMessages = [...chat.messages, { role: 'user', content, timestamp: new Date().toISOString() }]
          const title = chat.messages.length === 0 
            ? content.slice(0, 30) + (content.length > 30 ? '...' : '')
            : chat.title
          
          // Simulate AI response
          setTimeout(async () => {
            await chatService.sendMessage(activeChat, { 
              role: 'assistant', 
              content: 'This is a simulated response. Connect to your LLM API here.' 
            })
            const updatedChats = await chatService.getChats()
            setChats(updatedChats)
          }, 500)

          return { ...chat, title, messages: newMessages }
        }
        return chat
      }))
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    }
  }

  const currentChat = chats.find(chat => chat.id === activeChat || chat._id === activeChat)

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
    </div>
  )
}

export default App
