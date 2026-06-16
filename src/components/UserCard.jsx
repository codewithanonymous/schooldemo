import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Users, GraduationCap, ShieldAlert, Heart, MoreHorizontal } from 'lucide-react'

const UserCard = ({ type }) => {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        // Use lowercase snake_case table names matching production schema
        const tableMap = {
          admin:   'profiles',   // count profiles with role='admin'
          teacher: 'teachers',
          student: 'students',
          parent:  'parents'
        }
        const tableName = tableMap[type] ?? 'students'

        let query = supabase.from(tableName).select('id', { count: 'exact', head: true })

        // For the admin count we filter by role in profiles
        if (type === 'admin') {
          query = supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
        }

        const { count: tableCount, error } = await query

        if (!error && tableCount !== null) {
          setCount(tableCount)
        }
      } catch (err) {
        console.error(`Error loading count for ${type}:`, err)
      } finally {
        setLoading(false)
      }
    }
    fetchCount()
  }, [type])

  const getIcon = () => {
    switch (type) {
      case 'admin':
        return <ShieldAlert size={24} />
      case 'teacher':
        return <GraduationCap size={24} />
      case 'student':
        return <Users size={24} />
      case 'parent':
        return <Heart size={24} />
      default:
        return <Users size={24} />
    }
  }

  const getColorClass = () => {
    switch (type) {
      case 'admin': return 'danger'
      case 'teacher': return 'primary'
      case 'student': return 'success'
      case 'parent': return 'warning'
      default: return 'primary'
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
        <div className="stat-value">
          {loading ? '...' : count}
        </div>
      </div>
    </div>
  )
}

export default UserCard
