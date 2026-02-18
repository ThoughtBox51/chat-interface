import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import Login from './components/Login'
import Profile from './components/Profile'
import AdminPanel from './components/AdminPanel'
import UserSearch from './components/UserSearch'
import { SidebarSkeleton, ChatWindowSkeleton } from './components/LoadingSkeleton'
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
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chatsLoading, setChatsLoading] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [permissions, setPermissions] = useState(null)
  
  // Admin data
  const [models, setModels] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [roles, setRoles] = useState([])

  useEffect(() => {
    console.log('App mounted, checking for user...')
    const initUser = authService.getCurrentUser()
    console.log('Initial user:', initUser ? initUser.email : 'none')
    if (initUser) {
      setUser(initUser)
      
      // Try to load from cache first for instant display
      const cachedChats = sessionStorage.getItem('cachedChats')
      const cachedModels = sessionStorage.getItem('cachedModels')
      const cachedPermissions = sessionStorage.getItem('cachedPermissions')
      const cachedActiveChat = sessionStorage.getItem('cachedActiveChat')
      
      if (cachedChats && cachedModels && cachedPermissions) {
        console.log('Loading from cache...')
        try {
          const parsedChats = JSON.parse(cachedChats)
          setChats(parsedChats)
          setModels(JSON.parse(cachedModels))
          setPermissions(JSON.parse(cachedPermissions))
          
          // Restore active chat
          if (cachedActiveChat && parsedChats.length > 0) {
            const cachedChat = parsedChats.find(c => (c.id || c._id) === cachedActiveChat)
            setActiveChat(cachedActiveChat)
            
            // Only load messages if not already in cache
            if (cachedChat && (!cachedChat.messages || cachedChat.messages.length === 0)) {
              loadChatMessages(cachedActiveChat)
            }
          } else if (parsedChats.length > 0) {
            const firstChatId = parsedChats[0].id || parsedChats[0]._id
            const firstChat = parsedChats[0]
            setActiveChat(firstChatId)
            
            // Only load messages if not already in cache
            if (!firstChat.messages || firstChat.messages.length === 0) {
              loadChatMessages(firstChatId)
            }
          }
          
          setLoading(false)
          setChatsLoading(false)
          
          // Load fresh data in background
          loadUserData(true) // true = background refresh
        } catch (error) {
          console.error('Error loading from cache:', error)
          loadUserData()
        }
      } else {
        loadUserData()
      }
    } else {
      setLoading(false)
    }
    
    // Safety timeout: force loading to false after 65 seconds
    const safetyTimeout = setTimeout(() => {
      console.warn('Safety timeout triggered - forcing loading to false')
      setLoading(false)
      setChatsLoading(false)
    }, 65000)
    
    return () => clearTimeout(safetyTimeout)
  }, [])

  // Polling for new messages in active chat only (only for direct user chats)
  useEffect(() => {
    if (!user || !activeChat) return

    // Check if active chat is a direct user chat
    const currentChat = chats.find(c => (c.id || c._id) === activeChat)
    const isDirectChat = currentChat?.chat_type === 'direct'
    
    // Only poll for direct user chats, not AI chats
    if (!isDirectChat) return

    console.log('Starting polling for direct chat:', activeChat)

    const pollInterval = setInterval(async () => {
      try {
        // Only reload messages for the active direct chat
        const chatData = await chatService.getChat(activeChat)
        
        setChats(prevChats => {
          const currentChat = prevChats.find(c => (c.id || c._id) === activeChat)
          
          // Check if messages have changed
          if (currentChat && chatData.messages?.length !== currentChat.messages?.length) {
            console.log('New messages detected in direct chat, updating...')
            // Update only the active chat with new messages
            return prevChats.map(c => 
              (c.id || c._id) === activeChat ? chatData : c
            )
          }
          
          return prevChats
        })
      } catch (error) {
        console.error('Error polling messages:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => {
      console.log('Stopping polling for chat:', activeChat)
      clearInterval(pollInterval)
    }
  }, [user, activeChat, chats])

  // Cache active chat whenever it changes
  useEffect(() => {
    if (activeChat) {
      sessionStorage.setItem('cachedActiveChat', activeChat)
    }
  }, [activeChat])

  // Cache chats whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      try {
        sessionStorage.setItem('cachedChats', JSON.stringify(chats))
      } catch (error) {
        console.error('Error caching chats:', error)
      }
    }
  }, [chats])

  const loadUserData = async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setChatsLoading(true)
    }
    
    try {
      console.log(isBackgroundRefresh ? 'Background refresh...' : 'Starting to load user data...')
      const startTime = Date.now()
      
      // Load chats without messages for faster initial load
      const [chatsData, modelsData, permissionsData] = await Promise.all([
        chatService.getChats(false), // false = don't include messages
        modelService.getModels(),
        roleService.getCurrentUserPermissions()
      ])
      
      const duration = Date.now() - startTime
      console.log(`Data loaded in ${duration}ms`)
      console.log('Loaded chats:', chatsData.length)
      console.log('Loaded models:', modelsData.length)
      console.log('Loaded permissions:', permissionsData)
      
      // Cache data in sessionStorage for instant loading on return
      try {
        sessionStorage.setItem('cachedChats', JSON.stringify(chatsData))
        sessionStorage.setItem('cachedModels', JSON.stringify(modelsData))
        sessionStorage.setItem('cachedPermissions', JSON.stringify(permissionsData))
      } catch (error) {
        console.error('Error caching data:', error)
      }
      
      setChats(chatsData)
      setModels(modelsData)
      setPermissions(permissionsData)
      
      if (!isBackgroundRefresh && chatsData.length > 0) {
        const firstChatId = chatsData[0].id || chatsData[0]._id
        setActiveChat(firstChatId)
        // Load messages for first chat in background
        loadChatMessages(firstChatId)
      }
      
      console.log('User data loaded successfully')
    } catch (error) {
      console.error('Error loading data:', error)
      console.error('Error details:', error.response?.data || error.message)
      
      if (!isBackgroundRefresh) {
        // Try to load anyway with empty data
        setChats([])
        setModels([])
        setPermissions(null)
        
        // Show user-friendly error
        alert(`Failed to load chats: ${error.message}. Please check the console and backend logs.`)
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false)
        setChatsLoading(false)
      }
    }
  }

  const refreshChats = async () => {
    // Lightweight refresh without showing full page loading
    try {
      const chatsData = await chatService.getChats(false)
      setChats(chatsData)
    } catch (error) {
      console.error('Error refreshing chats:', error)
    }
  }

  const loadChatMessages = async (chatId) => {
    setMessagesLoading(true)
    try {
      const chatData = await chatService.getChat(chatId)
      setChats(prev => prev.map(c => 
        (c.id || c._id) === chatId ? chatData : c
      ))
    } catch (error) {
      console.error('Error loading chat messages:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSelectChat = (chatId) => {
    setActiveChat(chatId)
    
    // Load messages if not already loaded
    const chat = chats.find(c => (c.id || c._id) === chatId)
    if (chat && (!chat.messages || chat.messages.length === 0)) {
      loadChatMessages(chatId)
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

  const refreshPendingUsers = async () => {
    try {
      const pendingData = await userService.getPendingUsers()
      setPendingUsers(pendingData)
    } catch (error) {
      console.error('Error refreshing pending users:', error)
    }
  }

  const refreshUsers = async () => {
    try {
      const usersData = await userService.getUsers()
      setAllUsers(usersData)
    } catch (error) {
      console.error('Error refreshing users:', error)
    }
  }

  const refreshRoles = async () => {
    try {
      const rolesData = await roleService.getRoles()
      setRoles(rolesData)
    } catch (error) {
      console.error('Error refreshing roles:', error)
    }
  }

  const refreshModels = async () => {
    try {
      const modelsData = await modelService.getModels()
      setModels(modelsData)
    } catch (error) {
      console.error('Error refreshing models:', error)
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

  const handleUpdateProfile = async (profileData) => {
    try {
      const updated = await authService.updateProfile(profileData)
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
    } catch (error) {
      console.error('Error updating profile:', error)
      alert(`Failed to update profile: ${error.response?.data?.detail || error.message}`)
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

  const updateUserRole = async (id, selectedValue) => {
    try {
      // Determine if it's admin or a custom role
      let role, customRoleId
      
      if (selectedValue === 'admin') {
        role = 'admin'
        customRoleId = null
      } else {
        // It's a custom role ID
        role = 'user'
        customRoleId = selectedValue
      }
      
      await userService.updateUserRole(id, role, customRoleId)
      
      // Update local state
      setAllUsers(allUsers.map(u => {
        if ((u.id || u._id) === id) {
          return { ...u, role, custom_role: customRoleId }
        }
        return u
      }))
    } catch (error) {
      console.error('Error updating user role:', error)
      alert(`Failed to update user role: ${error.response?.data?.detail || error.message}`)
    }
  }

  const deleteUser = async (id) => {
    try {
      await userService.deleteUser(id)
      setAllUsers(allUsers.filter(u => (u.id || u._id) !== id))
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(`Failed to delete user: ${error.response?.data?.detail || error.message}`)
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
      console.log('Editing role with data:', updatedRole)
      const roleId = updatedRole.id || updatedRole._id
      const updated = await roleService.updateRole(roleId, updatedRole)
      console.log('Role updated successfully:', updated)
      setRoles(roles.map(r => (r.id || r._id) === (updated.id || updated._id) ? updated : r))
    } catch (error) {
      console.error('Error updating role:', error)
      console.error('Error response:', error.response?.data)
      alert(`Failed to update role: ${error.response?.data?.detail || error.message}`)
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
    console.log('Showing full page loading skeleton')
    return (
      <div className="app">
        <SidebarSkeleton />
        <ChatWindowSkeleton />
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#10a37f',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 9999,
          fontSize: '14px',
          fontWeight: '500'
        }}>
          Loading your chats... (Check console for details)
        </div>
      </div>
    )
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
        onRefreshModels={refreshModels}
        pendingUsers={pendingUsers}
        onApproveUser={approveUser}
        onRejectUser={rejectUser}
        onRefreshPendingUsers={refreshPendingUsers}
        users={allUsers}
        onUpdateUserRole={updateUserRole}
        onDeleteUser={deleteUser}
        onRefreshUsers={refreshUsers}
        roles={roles}
        onAddRole={addRole}
        onEditRole={editRole}
        onDeleteRole={deleteRole}
        onRefreshRoles={refreshRoles}
      />
    )
  }

  const createNewChat = () => {
    // Check if there's already a temporary new chat (not saved to backend yet)
    const existingNewChat = chats.find(chat => chat.isTemp === true)
    
    if (existingNewChat) {
      // If there's already a temp chat, just select it
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
      // Revert by refreshing chats
      refreshChats()
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
      // Revert by refreshing chats
      refreshChats()
    }
  }

  const sendMessage = async (content, modelId) => {
    setSending(true)
    try {
      let chatId = activeChat
      let isNewChat = false
      
      // Check if current chat is temporary or doesn't exist
      const currentChat = chats.find(c => (c.id || c._id) === chatId)
      const isTemp = currentChat?.isTemp || !chatId
      const isDirectChat = currentChat?.chat_type === 'direct'
      
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
      const userMessage = { 
        role: 'user', 
        content, 
        timestamp: new Date().toISOString(),
        sender_id: user.id  // Add sender ID for proper alignment
      }
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
      
      // For direct chats, check if there's an AI model mention
      if (isDirectChat) {
        // Check for @modelname pattern (more flexible regex)
        const mentionMatch = content.match(/@([^\s]+)\s+(.+)/i)
        
        console.log('Direct chat message:', content)
        console.log('Mention match:', mentionMatch)
        
        if (mentionMatch) {
          const [, modelName, question] = mentionMatch
          
          console.log('Looking for model:', modelName)
          console.log('Available models:', models.map(m => m.display_name || m.name))
          
          // Find the mentioned model (case-insensitive, handle spaces)
          const mentionedModel = models.find(m => {
            const displayName = (m.display_name || m.name).toLowerCase().replace(/\s+/g, '')
            const searchName = modelName.toLowerCase().replace(/\s+/g, '')
            return displayName === searchName || displayName.includes(searchName)
          })
          
          console.log('Found model:', mentionedModel)
          
          if (mentionedModel) {
            // Call AI model with the question
            try {
              console.log('Calling AI model:', mentionedModel.name, 'with question:', question)
              
              const endpoint = mentionedModel.endpoint || 'https://api.openai.com/v1/chat/completions'
              const headers = {
                'Content-Type': 'application/json',
                ...(mentionedModel.api_key && { 'Authorization': `Bearer ${mentionedModel.api_key}` }),
                ...(mentionedModel.headers && mentionedModel.headers.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}))
              }
              
              console.log('Endpoint:', endpoint)
              console.log('Headers:', headers)
              
              const aiResponse = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                  model: mentionedModel.name,
                  messages: [{ role: 'user', content: question }],
                  max_tokens: 1000
                })
              })
              
              console.log('AI Response status:', aiResponse.status)
              
              if (aiResponse.ok) {
                const data = await aiResponse.json()
                console.log('AI Response data:', data)
                
                const aiContent = data.choices?.[0]?.message?.content || 'No response from model'
                
                const aiMessage = { 
                  role: 'assistant', 
                  content: `🤖 ${mentionedModel.display_name || mentionedModel.name}: ${aiContent}`,
                  timestamp: new Date().toISOString(),
                  sender_id: 'ai-model'
                }
                
                console.log('Adding AI message to chat:', aiMessage)
                
                // Add AI response to chat
                setChats(prev => prev.map(chat => {
                  if ((chat.id || chat._id) === chatId) {
                    return { ...chat, messages: [...(chat.messages || []), aiMessage] }
                  }
                  return chat
                }))
                
                // Send AI response to backend
                chatService.sendMessage(chatId, { 
                  role: 'assistant', 
                  content: aiMessage.content 
                }).catch(err => {
                  console.error('Error sending AI response:', err)
                })
              } else {
                const errorText = await aiResponse.text()
                console.error('AI API error:', aiResponse.status, errorText)
              }
            } catch (error) {
              console.error('Error calling AI model:', error)
            }
          } else {
            console.log('Model not found for name:', modelName)
          }
        } else {
          console.log('No mention pattern found in message')
        }
        
        setSending(false)
        return
      }
      
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
    } finally {
      setSending(false)
    }
  }

  const handleChatCreated = (chat) => {
    // Add or update chat in list
    setChats(prev => {
      const exists = prev.find(c => (c.id || c._id) === (chat.id || chat._id))
      if (exists) {
        // Chat already exists, just select it
        return prev
      }
      // Add new chat to the top of the list
      return [chat, ...prev]
    })
    // Immediately select the chat
    setActiveChat(chat.id || chat._id)
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
        onSelectChat={handleSelectChat}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
        onPinChat={pinChat}
        user={user}
        onLogout={handleLogout}
        onOpenProfile={() => setShowProfile(true)}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenUserSearch={() => setShowUserSearch(true)}
        loading={chatsLoading}
        permissions={permissions}
      />
      <ChatWindow 
        chat={currentChat}
        onSendMessage={sendMessage}
        models={models}
        sending={sending}
        currentUser={user}
        messagesLoading={messagesLoading}
      />
      {showProfile && (
        <Profile 
          user={user}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
      {showUserSearch && (
        <UserSearch
          onClose={() => setShowUserSearch(false)}
          onChatCreated={handleChatCreated}
          existingChats={chats}
        />
      )}
    </div>
  )
}

export default App
