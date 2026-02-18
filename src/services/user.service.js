import api from './api'

export const userService = {
  async getUsers() {
    const response = await api.get('/users/')
    return response.data
  },

  async getPendingUsers() {
    const response = await api.get('/users/pending/')
    return response.data
  },

  async approveUser(id) {
    const response = await api.put(`/users/${id}/approve/`)
    return response.data
  },

  async updateUserRole(id, role, customRoleId) {
    const response = await api.put(`/users/${id}/role/`, { role, customRoleId })
    return response.data
  },

  async deleteUser(id) {
    const response = await api.delete(`/users/${id}/`)
    return response.data
  },

  async searchUsers(query) {
    const response = await api.get(`/users/search/?query=${encodeURIComponent(query)}`)
    return response.data
  }
}
