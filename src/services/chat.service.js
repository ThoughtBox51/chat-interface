import api from './api'

export const chatService = {
  async getChats(includeMessages = true) {
    console.log(`Fetching chats (includeMessages: ${includeMessages})...`)
    const startTime = Date.now()
    const response = await api.get(`/chats/?include_messages=${includeMessages}`)
    const duration = Date.now() - startTime
    console.log(`Chats fetched in ${duration}ms:`, response.data.length, 'chats')
    return response.data
  },

  async getChat(chatId) {
    const response = await api.get(`/chats/${chatId}/`)
    return response.data
  },

  async createChat(chatData) {
    const response = await api.post('/chats/', chatData)
    return response.data
  },

  async updateChat(id, chatData) {
    const response = await api.put(`/chats/${id}/`, chatData)
    return response.data
  },

  async deleteChat(id) {
    const response = await api.delete(`/chats/${id}/`)
    return response.data
  },

  async sendMessage(chatId, message) {
    const response = await api.post(`/chats/${chatId}/messages/`, message)
    return response.data
  },

  async createDirectChat(participantId) {
    const response = await api.post(`/chats/direct/?participant_id=${participantId}`)
    return response.data
  }
}
