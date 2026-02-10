import api from './api'

export const chatService = {
  async getChats() {
    const response = await api.get('/chats')
    return response.data.chats
  },

  async createChat(chatData) {
    const response = await api.post('/chats', chatData)
    return response.data.chat
  },

  async updateChat(id, chatData) {
    const response = await api.put(`/chats/${id}`, chatData)
    return response.data.chat
  },

  async deleteChat(id) {
    const response = await api.delete(`/chats/${id}`)
    return response.data
  },

  async sendMessage(chatId, message) {
    const response = await api.post(`/chats/${chatId}/messages`, message)
    return response.data.chat
  }
}
