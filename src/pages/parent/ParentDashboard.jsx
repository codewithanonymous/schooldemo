import React, { useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { LESSONS } from '../../data/mockData'
import { STUDENT_LEDGER, CLASSES, SECTIONS } from '../../data/academicMockData'
import { STUDENT_DETAILS_MAP } from '../../data/studentDetailsMockData'
import BigCalendar from '../../components/BigCalendar'
import Announcements from '../../components/Announcements'
import { Calendar, CreditCard, Award, UserCheck, User, Lock, Activity } from 'lucide-react'

const ParentDashboard = () => {
  const { user } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [activeTab, setActiveTab] = useState('schedule')

  // Find all children linked to this parent (reads from localStorage list)
  const children = useMemo(() => {
    const stored = localStorage.getItem('erp_students')
    if (stored) {
      try {
        const list = JSON.parse(stored)
        return list.filter(s => s.parent_id === user?.id)
      } catch (_) {}
    }
    return []
  }, [user?.id])

  const activeStudentId = selectedStudentId || children[0]?.id || ''

  const activeStudent = useMemo(() => {
    return children.find(s => s.id === activeStudentId)
  }, [activeStudentId, children])

  const className = useMemo(() => {
    if (!activeStudent) return ''
    const classObj = CLASSES.find(c => c.id === activeStudent.class_id)
    const secObj = SECTIONS.find(sec => sec.id === activeStudent.grade_id)
    return `${classObj ? classObj.name : ''} - ${secObj ? secObj.name : ''}`
  }, [activeStudent])

  // Get active student lessons schedule
  const lessons = useMemo(() => {
    if (!activeStudent) return []
    return LESSONS
      .filter(l => l.class_id === activeStudent.class_id)
      .map(l => ({ title: l.name, start: new Date(l.start_time), end: new Date(l.end_time) }))
  }, [activeStudent])

  // Get details
  const details = useMemo(() => {
    if (!activeStudentId) return { attendance: [], marks: [], feeSummary: { totalFee: 0, paidAmount: 0, pendingAmount: 0 }, payments: [] }
    return STUDENT_DETAILS_MAP[activeStudentId] || { attendance: [], marks: [], feeSummary: { totalFee: 0, paidAmount: 0, pendingAmount: 0 }, payments: [] }
  }, [activeStudentId])

  const ledger = useMemo(() => {
    if (!activeStudentId) return { totalFee: 0, paidAmount: 0, pendingAmount: 0, overdueAmount: 0, payments: [] }
    return STUDENT_LEDGER[activeStudentId] || details.feeSummary
  }, [activeStudentId, details])

  // Attendance stats
  const attendanceStats = useMemo(() => {
    const records = details.attendance || []
    if (records.length === 0) return { rate: 100, present: 0, absent: 0, late: 0 }
    const present = records.filter(r => r.status === 'PRESENT').length
    const late = records.filter(r => r.status === 'LATE').length
    const halfDay = records.filter(r => r.status === 'HALF_DAY').length
    const absent = records.filter(r => r.status === 'ABSENT').length
    
    const totalDays = records.length
    const attended = present + late + halfDay * 0.5
    const rate = Math.round((attended / totalDays) * 100)
    
    return { rate, present, absent, late, totalDays }
  }, [details])

  const fmtCurrency = (val) => `₹${Number(val ?? 0).toLocaleString('en-IN')}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Parent Portal Dashboard</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Monitor your children's timetable schedule, report card results, fee ledgers, and attendance rates.
          </p>
        </div>

        {/* Children dropdown selector */}
        {children.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--bg-card)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>ACTIVE CHILD:</span>
            <select 
              value={activeStudentId} 
              onChange={(e) => setSelectedStudentId(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {children.map(s => <option key={s.id} value={s.id}>{s.name} {s.surname} ({s.admission_number})</option>)}
            </select>
          </div>
        )}
      </div>

      {children.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}>
          No children linked to this parent account. Please contact the administrator.
        </div>
      ) : (
        <>
          {/* Active Child Profile Details Card */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px' }}>
                {activeStudent?.name.charAt(0)}{activeStudent?.surname.charAt(0)}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{activeStudent?.name} {activeStudent?.surname}</h3>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Admission ID: {activeStudent?.admission_number} | Class: {className} | Roll No: {activeStudent?.roll_number}
                </p>
              </div>
            </div>
            
            {/* Quick Stats Grid */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>ATTENDANCE RATE</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: attendanceStats.rate >= 75 ? '#10b981' : '#ef4444' }}>{attendanceStats.rate}%</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>FEE OUTSTANDING</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: ledger.pendingAmount > 0 ? '#ef4444' : '#10b981' }}>{fmtCurrency(ledger.pendingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Child Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '24px', paddingBottom: '2px' }}>
            {[
              { id: 'schedule', label: "Child's Schedule", icon: Calendar },
              { id: 'attendance', label: 'Attendance Roll', icon: UserCheck },
              { id: 'marks', label: 'Academic Grades', icon: Award },
              { id: 'fees', label: 'Fee Transactions', icon: CreditCard }
            ].map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                    padding: '8px 4px 12px 4px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Main Layout Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              
              {/* TIMETABLE TAB */}
              {activeTab === 'schedule' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Weekly Lecture Schedule</h2>
                  <BigCalendar data={lessons} />
                </div>
              )}

              {/* ATTENDANCE TAB */}
              {activeTab === 'attendance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Attendance Ledger</h2>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>ATTENDANCE RATE</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: attendanceStats.rate >= 75 ? '#10b981' : '#ef4444' }}>{attendanceStats.rate}%</div>
                    </div>
                    <div style={{ padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>DAYS PRESENT</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#10b981' }}>{attendanceStats.present}</div>
                    </div>
                    <div style={{ padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>DAYS ABSENT</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#ef4444' }}>{attendanceStats.absent}</div>
                    </div>
                    <div style={{ padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>LATE ARRIVALS</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#f59e0b' }}>{attendanceStats.late}</div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0' }}>Child's Attendance logs</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {details.attendance && details.attendance.length > 0 ? (
                        details.attendance.slice(0, 10).map((r) => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(r.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{r.remarks || 'No remarks'}</div>
                            </div>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              backgroundColor: r.status === 'PRESENT' ? 'rgba(16, 185, 129, 0.1)' : r.status === 'ABSENT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: r.status === 'PRESENT' ? '#10b981' : r.status === 'ABSENT' ? '#ef4444' : '#f59e0b'
                            }}>{r.status}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No attendance logs captured.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ACADEMICS / MARKS TAB */}
              {activeTab === 'marks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Report Card Results</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {details.marks && details.marks.length > 0 ? (
                      details.marks.map((m) => (
                        <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 100px', alignItems: 'center', background: 'var(--bg-main)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{m.subject}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{m.exam}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MARKS</div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{m.marksObtained} / {m.maxMarks}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PERCENTAGE</div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{m.percentage}%</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>GRADE</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: m.grade === 'A+' || m.grade === 'O' ? '#10b981' : '#6366f1' }}>{m.grade}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: m.marksObtained >= (m.maxMarks * 0.35) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: m.marksObtained >= (m.maxMarks * 0.35) ? '#10b981' : '#ef4444'
                            }}>{m.marksObtained >= (m.maxMarks * 0.35) ? 'PASS' : 'FAIL'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No examination marks published yet.</div>
                    )}
                  </div>
                </div>
              )}

              {/* FEES TAB */}
              {activeTab === 'fees' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Fee Ledger Overview</h2>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL ACADEMIC FEE</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>{fmtCurrency(ledger.totalFee)}</div>
                    </div>
                    <div style={{ padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL AMOUNT PAID</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#10b981' }}>{fmtCurrency(ledger.paidAmount)}</div>
                    </div>
                    <div style={{ padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>OUTSTANDING DUE</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: ledger.pendingAmount > 0 ? '#ef4444' : '#10b981' }}>{fmtCurrency(ledger.pendingAmount)}</div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0' }}>Transaction History</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {ledger.payments && ledger.payments.length > 0 ? (
                        ledger.payments.map((p) => (
                          <div key={p.receiptNumber} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.receiptNumber}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Date: {p.date} | Mode: {p.paymentMethod} {p.transactionId ? `| Txn Ref: ${p.transactionId}` : ''}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>+{fmtCurrency(p.amount)}</div>
                              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>SUCCESS</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions recorded yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Announcements />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ParentDashboard;
