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
      // Immediately update state for instant UI feedback
      setModels(prev => [...prev, newModel])
      return newModel
    } catch (error) {
      console.error('Error adding model:', error)
      throw error
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
      console.log('Deleting model with ID:', id)
      await modelService.deleteModel(id)
      setModels(models.filter(m => (m.id || m._id) !== id))
      console.log('Model deleted successfully')
    } catch (error) {
      console.error('Error deleting model:', error)
      alert(`Failed to delete model: ${error.response?.data?.detail || error.message}`)
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

  const createNewChat = () => {
    // Check if there's already a new chat (one with no messages)
    const existingNewChat = chats.find(chat => !chat.messages || chat.messages.length === 0)
    
    if (existingNewChat) {
      // If there's already an empty chat, just select it
      setActiveChat(existingNewChat.id || existingNewChat._id)
      return
    }
    
    // Create a temporary new chat immediately (will be saved when first message is sent)
    const tempChat = {
      id: 'temp-' + Date.now(),
      title: 'New Chat',
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isTemp: true
    }
    
    setChats([tempChat, ...chats])
    setActiveChat(tempChat.id)
  }

  const deleteChat = async (id) => {
    try {
      // Check if it's a temp chat
      const chat = chats.find(c => (c.id || c._id) === id)
      
      if (chat?.isTemp || id?.toString().startsWith('temp-')) {
        // Just remove from state, no backend call needed
        const filtered = chats.filter(chat => (chat.id || chat._id) !== id)
        setChats(filtered)
        if (activeChat === id && filtered.length > 0) {
          setActiveChat(filtered[0].id || filtered[0]._id)
        } else if (activeChat === id) {
          setActiveChat(null)
        }
      } else {
        // Real chat, delete from backend
        await chatService.deleteChat(id)
        const filtered = chats.filter(chat => (chat.id || chat._id) !== id)
        setChats(filtered)
        if (activeChat === id && filtered.length > 0) {
          setActiveChat(filtered[0].id || filtered[0]._id)
        } else if (activeChat === id) {
          setActiveChat(null)
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  const renameChat = async (id, newTitle) => {
    // Optimistically update UI immediately
    setChats(prev => prev.map(chat => 
      (chat.id || chat._id) === id ? { ...chat, title: newTitle } : chat
    ))
    
    // Update backend in background
    try {
      await chatService.updateChat(id, { title: newTitle })
    } catch (error) {
      console.error('Error renaming chat:', error)
      // Optionally: revert the change if API fails
      loadUserData()
    }
  }

  const pinChat = async (id) => {
    // Find the chat and toggle pinned status
    const chat = chats.find(c => (c.id || c._id) === id)
    const newPinnedStatus = !chat.pinned
    
    // Optimistically update UI immediately with proper sorting
    setChats(prev => {
      const updated = prev.map(c => 
        (c.id || c._id) === id ? { ...c, pinned: newPinnedStatus } : c
      )
      // Sort: pinned first, then by updated_at descending
      return updated.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        // Both pinned or both unpinned - sort by updated_at
        const aTime = new Date(a.updated_at || 0).getTime()
        const bTime = new Date(b.updated_at || 0).getTime()
        return bTime - aTime
      })
    })
    
    // Update backend in background
    try {
      await chatService.updateChat(id, { pinned: newPinnedStatus })
    } catch (error) {
      console.error('Error pinning chat:', error)
      // Optionally: revert the change if API fails
      loadUserData()
    }
  }

  const sendMessage = async (content, modelId) => {
    try {
      let chatId = activeChat
      let isNewChat = false
      
      // Check if current chat is temporary or doesn't exist
      const currentChat = chats.find(c => (c.id || c._id) === chatId)
      const isTemp = currentChat?.isTemp || !chatId
      
      // If no active chat or temp chat, create a real one first
      if (isTemp || !chatId) {
        const title = content.slice(0, 30) + (content.length > 30 ? '...' : '')
        const newChat = await chatService.createChat({ title, messages: [] })
        chatId = newChat.id
        isNewChat = true
        
        // Remove temp chat and add real chat
        setChats(prev => {
          const filtered = prev.filter(c => !(c.id || c._id)?.toString().startsWith('temp-'))
          return [newChat, ...filtered]
        })
        setActiveChat(chatId)
      }
      
      // Optimistically update UI immediately
      const userMessage = { role: 'user', content, timestamp: new Date().toISOString() }
      setChats(prev => prev.map(chat => {
        if ((chat.id || chat._id) === chatId) {
          const newMessages = [...(chat.messages || []), userMessage]
          const title = chat.messages?.length === 0 
            ? content.slice(0, 30) + (content.length > 30 ? '...' : '')
            : chat.title
          return { ...chat, title, messages: newMessages, isTemp: false }
        }
        return chat
      }))
      
      // Send message to backend (async, don't wait)
      chatService.sendMessage(chatId, { role: 'user', content }).catch(err => {
        console.error('Error sending message:', err)
      })
      
      // Get the selected model
      const model = models.find(m => (m.id || m._id) === modelId)
      if (!model) {
        throw new Error('Model not found')
      }
      
      // Call the actual model endpoint
      const endpoint = model.endpoint || 'https://api.openai.com/v1/chat/completions'
      const headers = {
        'Content-Type': 'application/json',
        ...(model.api_key && { 'Authorization': `Bearer ${model.api_key}` }),
        ...(model.headers && model.headers.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}))
      }
      
      // Get chat history for context
      const chatForContext = chats.find(c => (c.id || c._id) === chatId)
      const messages = chatForContext?.messages || []
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model.name,
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          max_tokens: 1000
        })
      })
      
      if (!response.ok) {
        throw new Error(`Model API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const aiContent = data.choices?.[0]?.message?.content || 'No response from model'
      
      const aiMessage = { 
        role: 'assistant', 
        content: aiContent,
        timestamp: new Date().toISOString()
      }
      
      // Add AI response immediately
      setChats(prev => prev.map(chat => {
        if ((chat.id || chat._id) === chatId) {
          return { ...chat, messages: [...(chat.messages || []), aiMessage] }
        }
        return chat
      }))
      
      // Send AI response to backend (async)
      chatService.sendMessage(chatId, { 
        role: 'assistant', 
        content: aiMessage.content 
      }).catch(err => {
        console.error('Error sending AI response:', err)
      })
      
      // Generate title for new chats using LLM
      if (isNewChat) {
        generateChatTitle(chatId, content, model, endpoint, headers).catch(err => {
          console.error('Error generating title:', err)
        })
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      alert(`Failed to send message: ${error.message}`)
    }
  }
  
  const generateChatTitle = async (chatId, firstMessage, model, endpoint, headers) => {
    try {
      // Call LLM to generate a concise title
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model.name,
          messages: [
            { 
              role: 'system', 
              content: 'Generate a concise, descriptive title (max 6 words) for a chat that starts with this question. Only respond with the title, nothing else.' 
            },
            { role: 'user', content: firstMessage }
          ],
          max_tokens: 20
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const title = data.choices?.[0]?.message?.content?.trim() || firstMessage.slice(0, 30)
        
        // Update chat title in UI
        setChats(prev => prev.map(chat => {
          if ((chat.id || chat._id) === chatId) {
            return { ...chat, title }
          }
          return chat
        }))
        
        // Update title in backend
        chatService.updateChat(chatId, { title }).catch(err => {
          console.error('Error updating chat title:', err)
        })
      }
    } catch (error) {
      console.error('Error generating title:', error)
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
        models={models}
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
