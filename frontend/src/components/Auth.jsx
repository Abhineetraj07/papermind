import { useState } from 'react'
import { authApi } from '../api/client.js'
import LogoMark from './LogoMark.jsx'

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await authApi.register({ email, password, name })
      }
      const data = await authApi.login({ email, password })
      onLogin(data, email)
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <LogoMark size={44} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '.02em' }}>
            Paper<em style={{ color: 'var(--gold)' }}>Mind</em>
          </span>
        </div>
        <p className="auth-tagline">Query knowledge. Discover connections.</p>

        <div className="auth-tabs">
          <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>Sign In</button>
          <button className={`auth-tab${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')}>Register</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="field">
              <label className="field-label">Name</label>
              <input className="field-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
            </div>
          )}
          <div className="field">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Enter the Archive' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
