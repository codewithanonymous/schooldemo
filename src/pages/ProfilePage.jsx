import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const ProfilePage = () => {
  const { user, role } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setMessage(null)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match!")
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setMessage("Password updated successfully!")
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to update password.")
    } finally {
      setLoading(false)
    }
  }

  const getUserDisplayName = () => {
    if (!user) return ''
    if (user.user_metadata?.name) {
      return `${user.user_metadata.name} ${user.user_metadata.surname || ''}`
    }
    return user.email?.split('@')[0] || 'User'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '600px' }}>
      <div>
        <h1>My Profile</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View your profile information and update your security settings.</p>
      </div>

      <div className="chart-card">
        <h2 style={{ marginBottom: '20px' }}>Personal Details</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'block' }}>Full Name</span>
            <span style={{ fontWeight: 600 }}>{getUserDisplayName()}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'block' }}>Email Address</span>
            <span>{user?.email}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'block' }}>System Role</span>
            <span className="badge badge-primary">{role || 'User'}</span>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <h2 style={{ marginBottom: '20px' }}>Change Password</h2>

        {message && (
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)', backgroundColor: 'var(--success-light)', color: 'var(--success)', marginBottom: '16px', fontSize: '14px' }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfilePage
