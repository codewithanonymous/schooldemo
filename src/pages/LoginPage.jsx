import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GraduationCap } from 'lucide-react'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [error, setError] = useState(null)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoadingLocal(true)

    try {
      const res = await login(email, password)
      const role = res?.role || 'user'
      
      // Navigate to dashboard based on role
      if (role === 'admin') navigate('/admin')
      else if (role === 'user') navigate('/dashboard')
      else if (role === 'teacher') navigate('/teacher')
      else if (role === 'parent') navigate('/parent')
      else navigate('/student')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoadingLocal(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <GraduationCap size={40} />
          <span>SchoolPortal</span>
        </div>
        <div className="login-header">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Enter your credentials to access your portal</p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'var(--danger-light)', 
            border: '1px solid var(--danger)', 
            color: 'var(--danger)', 
            padding: '12px', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email, Username, or ID</label>
            <input
              id="email"
              type="text"
              className="form-input"
              placeholder="e.g. admin@example.com or ADM2026001"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '16px', padding: '12px' }}
            disabled={loadingLocal}
          >
            {loadingLocal ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', padding: '16px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center', letterSpacing: '0.05em' }}>
            DEMO ACCOUNTS — Click to fill
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: 'Admin',   email: 'admin@example.com',   color: 'var(--danger)' },
              { label: 'Teacher', email: 'teacher@example.com', color: 'var(--primary)' },
              { label: 'Student', email: 'student@example.com', color: 'var(--success)' },
              { label: 'Parent',  email: 'parent@example.com',  color: 'var(--warning)' },
            ].map(({ label, email: demoEmail, color }) => (
              <button
                key={label}
                type="button"
                onClick={() => { setEmail(demoEmail); setPassword('12345678') }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'transparent', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)', padding: '7px 12px',
                  cursor: 'pointer', textAlign: 'left', gap: '8px',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color, minWidth: 52 }}>{label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>{demoEmail}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>12345678</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
