import React, { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { LESSONS } from '../../data/mockData'
import BigCalendar from '../../components/BigCalendar'
import Announcements from '../../components/Announcements'

const TeacherDashboard = () => {
  const { user } = useAuth()

  const lessons = useMemo(() => {
    return LESSONS
      .filter(l => l.teacher_id === user?.id)
      .map(l => ({ title: l.name, start: new Date(l.start_time), end: new Date(l.end_time) }))
  }, [user?.id])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1>Teacher Schedule Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View your assigned classes, schedule, and school announcements.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Weekly Timetable</h2>
            <BigCalendar data={lessons} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '420px', width: '100%', justifySelf: 'end' }}>
            <Announcements />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
