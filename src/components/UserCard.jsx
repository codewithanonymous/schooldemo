import React from 'react'
import { STATS } from '../data/mockData'
import { Users, GraduationCap, ShieldAlert, Heart, MoreHorizontal } from 'lucide-react'

const UserCard = ({ type }) => {
  const count = STATS[type + 's'] ?? 0

  const getIcon = () => {
    switch (type) {
      case 'admin':   return <ShieldAlert size={24} />
      case 'teacher': return <GraduationCap size={24} />
      case 'student': return <Users size={24} />
      case 'parent':  return <Heart size={24} />
      default:        return <Users size={24} />
    }
  }

  const getColorClass = () => {
    switch (type) {
      case 'admin':   return 'danger'
      case 'teacher': return 'primary'
      case 'student': return 'success'
      case 'parent':  return 'warning'
      default:        return 'primary'
    }
  }

  return (
    <div className="stat-card">
      <div className={`stat-icon ${getColorClass()}`}>
        {getIcon()}
      </div>
      <div style={{ flexGrow: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="stat-label">{type.charAt(0).toUpperCase() + type.slice(1)}s</span>
          <button className="btn-icon" style={{ padding: '2px', border: 'none', background: 'none' }}>
            <MoreHorizontal size={16} />
          </button>
        </div>
        <div className="stat-value">{count}</div>
      </div>
    </div>
  )
}

export default UserCard
