// src/plugins/axios.js
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://3.66.72.52:3010'
})

// 🔐 Inyectamos el token automáticamente en cada petición
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
