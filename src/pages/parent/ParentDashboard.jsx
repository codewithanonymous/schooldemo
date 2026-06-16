import React, { useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { STUDENTS, LESSONS } from '../../data/mockData'
import BigCalendar from '../../components/BigCalendar'
import Announcements from '../../components/Announcements'

const ParentDashboard = () => {
  const { user } = useAuth()

  // Get children for this parent
  const children = useMemo(() => STUDENTS.filter(s => s.parent_id === user?.id), [user?.id])
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const activeStudentId = selectedStudentId || children[0]?.id

  const lessons = useMemo(() => {
    const student = children.find(s => s.id === activeStudentId) ?? children[0]
    if (!student) return []
    return LESSONS
      .filter(l => l.class_id === student.class_id)
      .map(l => ({ title: l.name, start: new Date(l.start_time), end: new Date(l.end_time) }))
  }, [activeStudentId, children])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1>Parent Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Monitor your children's class schedules, performance, and school news.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Children's Schedule</h2>
              {children.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="student-select" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Child:</label>
                  <select id="student-select" className="form-select" style={{ width: 'auto', padding: '6px 12px' }}
                    value={activeStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                    {children.map(s => <option key={s.id} value={s.id}>{s.name} {s.surname}</option>)}
                  </select>
                </div>
              )}
            </div>

            {children.length > 0 ? (
              <BigCalendar data={lessons} />
            ) : (
              <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}>
                No children linked to this parent account.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '420px', width: '100%', justifySelf: 'end' }}>
            <Announcements />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParentDashboard
