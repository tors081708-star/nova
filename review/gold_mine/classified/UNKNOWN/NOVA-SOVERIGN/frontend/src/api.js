import axios from 'axios'

const BACKEND = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ''
export const API = `${BACKEND}/api`

export const api = axios.create({ baseURL: API })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nova_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('nova_token')
      localStorage.removeItem('nova_email')
      if (location.pathname !== '/login') location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
}
export const meta = {
  models: () => api.get('/meta/models').then((r) => r.data),
  personas: () => api.get('/meta/personas').then((r) => r.data),
}
export const chatApi = {
  newSession: () => api.post('/chat/new-session').then((r) => r.data),
  sessions: () => api.get('/chat/sessions').then((r) => r.data),
  history: (id) => api.get(`/chat/history/${id}`).then((r) => r.data),
  send: (payload) => api.post('/chat', payload).then((r) => r.data),
  del: (id) => api.delete(`/chat/session/${id}`).then((r) => r.data),
}
export const notesApi = {
  list: () => api.get('/notes').then((r) => r.data),
  create: (p) => api.post('/notes', p).then((r) => r.data),
  update: (id, p) => api.patch(`/notes/${id}`, p).then((r) => r.data),
  del: (id) => api.delete(`/notes/${id}`).then((r) => r.data),
  summarize: (id) => api.post(`/notes/${id}/summarize`).then((r) => r.data),
}
export const tasksApi = {
  list: () => api.get('/tasks').then((r) => r.data),
  create: (p) => api.post('/tasks', p).then((r) => r.data),
  update: (id, p) => api.patch(`/tasks/${id}`, p).then((r) => r.data),
  del: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
  prioritize: () => api.post('/tasks/prioritize').then((r) => r.data),
}
export const docsApi = {
  list: () => api.get('/docs').then((r) => r.data),
  get: (id) => api.get(`/docs/${id}`).then((r) => r.data),
  create: (p) => api.post('/docs', p).then((r) => r.data),
  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/docs/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
  },
  del: (id) => api.delete(`/docs/${id}`).then((r) => r.data),
  ask: (p) => api.post('/docs/ask', p).then((r) => r.data),
}
export const dashApi = {
  get: () => api.get('/dashboard').then((r) => r.data),
}
