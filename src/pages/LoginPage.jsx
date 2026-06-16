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
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="e.g. admin@school.com"
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

        <div style={{ marginTop: '24px', padding: '16px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'center' }}>
            DEMO ACCOUNT DETAILS
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div><strong>Admin:</strong> admin@example.com / 12345678</div>
            <div><strong>Teacher:</strong> teacher@example.com / 12345678</div>
            <div><strong>Student:</strong> student@example.com / 12345678</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
