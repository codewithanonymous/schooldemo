import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import BigCalendar from '../../components/BigCalendar'
import Announcements from '../../components/Announcements'

const StudentDashboard = () => {
  const { user } = useAuth()
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudentSchedule = async () => {
      if (!user) return
      try {
        // RLS guarantees student can only fetch their own row
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('class_id')
          .eq('id', user.id)
          .maybeSingle()

        if (studentError) throw studentError

        if (studentData?.class_id) {
          // RLS guarantees only lessons in the student's class are returned
          const { data, error } = await supabase
            .from('lessons')
            .select('name, start_time, end_time')
            .eq('class_id', studentData.class_id)

          if (!error && data) {
            const formattedLessons = data.map((l) => ({
              title: l.name,
              start: new Date(l.start_time),
              end: new Date(l.end_time),
            }))
            setLessons(formattedLessons)
          }
        }
      } catch (err) {
        console.error("Error loading student lessons:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStudentSchedule()
  }, [user])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1>Student Timetable Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View your class schedule, homework assignments, and announcements.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* Calendar on the left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Weekly Schedule</h2>
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

export default StudentDashboard
