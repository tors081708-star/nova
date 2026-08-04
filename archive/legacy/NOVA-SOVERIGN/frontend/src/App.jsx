import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Chat from './pages/Chat.jsx'
import Notes from './pages/Notes.jsx'
import Tasks from './pages/Tasks.jsx'
import Docs from './pages/Docs.jsx'
import Personas from './pages/Personas.jsx'
import Settings from './pages/Settings.jsx'

function Protected({ children }) {
  const token = localStorage.getItem('nova_token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [, setTick] = useState(0)
  // re-render on login
  useEffect(() => {
    const handler = () => setTick((t) => t + 1)
    window.addEventListener('nova-auth-change', handler)
    return () => window.removeEventListener('nova-auth-change', handler)
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <Protected>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/chat/:sessionId" element={<Chat />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/personas" element={<Personas />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </Protected>
        }
      />
    </Routes>
  )
}
