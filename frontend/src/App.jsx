import { useState } from 'react'
import Auth from './components/Auth.jsx'
import Layout from './components/Layout.jsx'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('pm_token'))
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('pm_email') || '')

  function handleLogin({ access_token }, email) {
    localStorage.setItem('pm_token', access_token)
    localStorage.setItem('pm_email', email)
    setToken(access_token)
    setUserEmail(email)
  }

  function handleLogout() {
    localStorage.removeItem('pm_token')
    localStorage.removeItem('pm_email')
    setToken(null)
    setUserEmail('')
  }

  if (!token) return <Auth onLogin={handleLogin} />
  return <Layout userEmail={userEmail} onLogout={handleLogout} />
}
