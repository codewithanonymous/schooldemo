import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#fff' }}>
        <div className="spinner">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Route to the correct dashboard for this role
    const fallback = {
      super_admin: '/super',
      admin:       '/admin',
      teacher:     '/teacher',
      student:     '/student',
      parent:      '/parent'
    }
    return <Navigate to={fallback[role] ?? '/login'} replace />
  }

  return children
}

export default ProtectedRoute
