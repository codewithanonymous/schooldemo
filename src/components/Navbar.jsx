import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Bell } from 'lucide-react'

const Navbar = () => {
  const { user, role } = useAuth()

  const getUserDisplayName = () => {
    if (!user) return 'Guest'
    if (user.user_metadata?.name) {
      return `${user.user_metadata.name} ${user.user_metadata.surname || ''}`
    }
    return user.email?.split('@')[0] || 'User'
  }

  const getInitials = () => {
    if (!user) return '?'
    if (user.user_metadata?.name) {
      const first = user.user_metadata.name[0] || ''
      const last = user.user_metadata.surname ? user.user_metadata.surname[0] : ''
      return (first + last).toUpperCase()
    }
    return (user.email?.[0] || 'U').toUpperCase()
  }

  return (
    <div className="navbar">
      <div>
        {/* Left empty for spacing or page title in future */}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <button className="btn-icon">
          <Bell size={18} />
        </button>

        <div className="nav-user">
          <div className="nav-user-info">
            <div className="nav-user-name">{getUserDisplayName()}</div>
            <div className="nav-user-role">{role || 'User'}</div>
          </div>
          <div className="nav-avatar">
            {getInitials()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Navbar
