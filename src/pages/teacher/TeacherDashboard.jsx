import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import BigCalendar from '../../components/BigCalendar'
import Announcements from '../../components/Announcements'

const TeacherDashboard = () => {
  const { user } = useAuth()
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeacherSchedule = async () => {
      if (!user) return
      try {
        // RLS on lessons guarantees this only returns rows where teacher_id = auth.uid()
        const { data, error } = await supabase
          .from('lessons')
          .select('name, start_time, end_time')
          .eq('teacher_id', user.id)

        if (!error && data) {
          const formattedLessons = data.map((l) => ({
            title: l.name,
            start: new Date(l.start_time),
            end: new Date(l.end_time),
          }))
          setLessons(formattedLessons)
        }
      } catch (err) {
        console.error("Error loading teacher lessons:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchTeacherSchedule()
  }, [user])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1>Teacher Schedule Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View your assigned classes, schedule, and school announcements.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* Calendar on the left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Weekly Timetable</h2>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <BigCalendar data={lessons} />
            )}
          </div>

          {/* Sidebar announcements on the right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '420px', width: '100%', justifySelf: 'end' }}>
            <Announcements />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
