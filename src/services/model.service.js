import api from './api'

export const modelService = {
  async getModels() {
    const response = await api.get('/models')
    return response.data.models
  },

  async createModel(modelData) {
    const response = await api.post('/models', modelData)
    return response.data.model
  },

  async updateModel(id, modelData) {
    const response = await api.put(`/models/${id}`, modelData)
    return response.data.model
  },

  async deleteModel(id) {
    const response = await api.delete(`/models/${id}`)
    return response.data
  },

  async testModel(id) {
    const response = await api.post(`/models/${id}/test`)
    return response.data
  }
}
