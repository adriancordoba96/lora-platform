import axios from 'axios'

const API_URL = 'http://3.66.72.52:3010'

const api = axios.create({
  baseURL: API_URL
})

export const login = (username, password) =>
  api.post('/login', { username, password })

export const register = (username, email, password, phone) =>
  api.post('/register', { username, email, password, phone })

export const getNodes = (token) =>
  api.get('/nodes', {
    headers: { Authorization: `Bearer ${token}` }
  })

export const recoverPassword = (email) =>
  api.post('/api/recover', { email })

export const toggleNodeState = (identifier, state) =>
  api.post(`/nodes/${identifier}/state`, { state })

export default api
