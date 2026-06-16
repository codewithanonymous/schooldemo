import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import BigCalendar from '../../components/BigCalendar'
import Announcements from '../../components/Announcements'

const ParentDashboard = () => {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [lessons, setLessons] = useState([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(true)

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user) return
      try {
        // RLS ensures only this parent's children are returned
        const { data, error } = await supabase
          .from('students')
          .select('id, name, surname, class_id')
          .eq('parent_id', user.id)

        if (!error && data) {
          setStudents(data)
          if (data.length > 0) {
            setSelectedStudentId(data[0].id)
          }
        }
      } catch (err) {
        console.error("Error loading parent students:", err)
      } finally {
        setLoadingStudents(false)
      }
    }
    fetchStudents()
  }, [user])

  useEffect(() => {
    const fetchStudentSchedule = async () => {
      if (!selectedStudentId) return
      setLoadingSchedule(true)
      try {
        const student = students.find(s => s.id === selectedStudentId)
        if (student?.class_id) {
          // RLS ensures only lessons for this class are returned
          const { data, error } = await supabase
            .from('lessons')
            .select('name, start_time, end_time')
            .eq('class_id', student.class_id)

          if (!error && data) {
            const formattedLessons = data.map((l) => ({
              title: l.name,
              start: new Date(l.start_time),
              end: new Date(l.end_time),
            }))
            setLessons(formattedLessons)
          } else {
            setLessons([])
          }
        } else {
          setLessons([])
        }
      } catch (err) {
        console.error("Error loading student schedule:", err)
      } finally {
        setLoadingSchedule(false)
      }
    }
    fetchStudentSchedule()
  }, [selectedStudentId, students])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1>Parent Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Monitor your children's class schedules, performance, and school news.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* Calendar on the left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Children's Schedule</h2>
              {students.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="student-select" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Child:</label>
                  <select
                    id="student-select"
                    className="form-select"
                    style={{ width: 'auto', padding: '6px 12px' }}
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.surname}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {loadingStudents || loadingSchedule ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <div className="spinner"></div>
              </div>
            ) : students.length > 0 ? (
              <BigCalendar data={lessons} />
            ) : (
              <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}>
                No children linked to this parent account.
              </div>
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

export default ParentDashboard
