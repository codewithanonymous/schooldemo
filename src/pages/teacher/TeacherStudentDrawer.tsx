import React, { useState, useMemo } from 'react';
import { Student, Parent, StudentFullDetails } from '../../types/student';
import { CLASSES } from '../../data/academicMockData';
import { PARENTS, STUDENT_DETAILS_MAP } from '../../data/studentDetailsMockData';
import { 
  X, 
  User, 
  Shield, 
  Calendar, 
  BookOpen, 
  Phone, 
  MapPin 
} from 'lucide-react';
import './TeacherPortal.css';

interface TeacherStudentDrawerProps {
  open: boolean;
  onClose: () => void;
  student: Student | null;
}

const TeacherStudentDrawer: React.FC<TeacherStudentDrawerProps> = ({ open, onClose, student }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'attendance'>('profile');

  // Find parent details
  const parentDetails = useMemo<Parent | null>(() => {
    if (!student) return null;
    const parent = PARENTS.find(p => p.id === student.parent_id);
    return parent || null;
  }, [student]);

  // Find academic and attendance records map
  const fullDetails = useMemo<StudentFullDetails | null>(() => {
    if (!student) return null;
    return STUDENT_DETAILS_MAP[student.id] || null;
  }, [student]);

  // Attendance rate
  const attendanceRate = useMemo(() => {
    if (!fullDetails || fullDetails.attendance.length === 0) return { present: 0, absent: 0, rate: 100 };
    const total = fullDetails.attendance.length;
    const present = fullDetails.attendance.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const absent = total - present;
    return {
      present,
      absent,
      rate: Math.round((present / total) * 100)
    };
  }, [fullDetails]);

  // Final Exam marks summary
  const finalExamMarks = useMemo(() => {
    if (!fullDetails || fullDetails.marks.length === 0) return [];
    return fullDetails.marks.filter(m => m.exam === 'Final Exam');
  }, [fullDetails]);

  if (!student) return null;

  const cls = CLASSES.find(c => c.id === student.class_id);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`drawer-backdrop ${open ? 'open' : ''}`} 
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`drawer-panel ${open ? 'open' : ''}`}>
        
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-area">
            <div className="drawer-avatar">
              {student.name[0]}{student.surname[0]}
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                {student.name} {student.surname}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span className="status-pill active" style={{ fontSize: 9, padding: '1px 6px' }}>
                  {cls ? cls.name : '—'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Roll No: {student.roll_number}
                </span>
              </div>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} title="Close Panel">
            <X size={20} />
          </button>
        </div>

        {/* Tab links */}
        <div className="drawer-tabs">
          <button 
            className={`drawer-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            General Profile
          </button>
          <button 
            className={`drawer-tab ${activeTab === 'academic' ? 'active' : ''}`}
            onClick={() => setActiveTab('academic')}
          >
            Marks History
          </button>
          <button 
            className={`drawer-tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance Logs
          </button>
        </div>

        {/* Drawer Body content */}
        <div className="drawer-body">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <>
              {/* Student basic information */}
              <div className="erp-card">
                <div className="erp-card-title">
                  <User size={15} /> <span>Student Details</span>
                </div>
                <div className="erp-info-grid">
                  <div className="erp-info-item">
                    <span className="erp-info-label">Admission Code</span>
                    <span className="erp-info-value" style={{ fontFamily: 'monospace' }}>{student.admission_number}</span>
                  </div>
                  <div className="erp-info-item">
                    <span className="erp-info-label">Admission Date</span>
                    <span className="erp-info-value">{student.admission_date}</span>
                  </div>
                  <div className="erp-info-item">
                    <span className="erp-info-label">Gender</span>
                    <span className="erp-info-value">{student.sex}</span>
                  </div>
                  <div className="erp-info-item">
                    <span className="erp-info-label">Blood Group</span>
                    <span className="erp-info-value">{student.blood_type}</span>
                  </div>
                  <div className="erp-info-item" style={{ gridColumn: 'span 2' }}>
                    <span className="erp-info-label">Residential Address</span>
                    <span className="erp-info-value" style={{ fontWeight: 500 }}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> {student.address}</span>
                  </div>
                </div>
              </div>

              {/* Parent coordinates */}
              <div className="erp-card">
                <div className="erp-card-title">
                  <Shield size={15} /> <span>Parent / Guardian Contacts</span>
                </div>
                {parentDetails ? (
                  <div className="erp-info-grid">
                    <div className="erp-info-item">
                      <span className="erp-info-label">Father Name</span>
                      <span className="erp-info-value">{parentDetails.father_name}</span>
                    </div>
                    <div className="erp-info-item">
                      <span className="erp-info-label">Mother Name</span>
                      <span className="erp-info-value">{parentDetails.mother_name}</span>
                    </div>
                    <div className="erp-info-item">
                      <span className="erp-info-label">Primary Mobile</span>
                      <span className="erp-info-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> {parentDetails.phone}</span>
                    </div>
                    <div className="erp-info-item">
                      <span className="erp-info-label">Emergency Phone</span>
                      <span className="erp-info-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> {parentDetails.secondary_phone}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No parent records linked.</p>
                )}
              </div>
            </>
          )}

          {/* MARKS TAB */}
          {activeTab === 'academic' && (
            <div className="erp-card">
              <div className="erp-card-title">
                <BookOpen size={15} /> <span>Final Term Exam Report Card</span>
              </div>
              
              <div className="drawer-table-wrapper">
                <table className="drawer-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Score Mapped</th>
                      <th>Grade Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalExamMarks.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                          No finalized exam grades logged yet.
                        </td>
                      </tr>
                    ) : (
                      finalExamMarks.map(mrk => (
                        <tr key={mrk.id}>
                          <td style={{ fontWeight: 600 }}>{mrk.subject}</td>
                          <td>{mrk.marksObtained} / {mrk.maxMarks} ({mrk.percentage}%)</td>
                          <td>
                            <span style={{ 
                              fontWeight: 700, 
                              color: mrk.grade.startsWith('A') || mrk.grade === 'O' ? 'var(--success)' : 'var(--warning)'
                            }}>
                              {mrk.grade}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <>
              {/* Stats overview */}
              <div className="stats-mini-grid" style={{ marginBottom: 12 }}>
                <div className="stat-mini-card">
                  <div className="stat-mini-label">Present</div>
                  <div className="stat-mini-value success">{attendanceRate.present}</div>
                </div>
                <div className="stat-mini-card">
                  <div className="stat-mini-label">Absent</div>
                  <div className="stat-mini-value danger">{attendanceRate.absent}</div>
                </div>
                <div className="stat-mini-card">
                  <div className="stat-mini-label">Rate</div>
                  <div className="stat-mini-value primary">{attendanceRate.rate}%</div>
                </div>
              </div>

              {/* Attendance logs lists */}
              <div className="erp-card">
                <div className="erp-card-title">
                  <Calendar size={15} /> <span>Recent Attendance History</span>
                </div>
                
                <div className="drawer-table-wrapper">
                  <table className="drawer-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Punch Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullDetails && fullDetails.attendance.length > 0 ? (
                        fullDetails.attendance.map(att => (
                          <tr key={att.id}>
                            <td style={{ fontWeight: 600 }}>{att.date}</td>
                            <td>
                              <span className={`status-pill ${
                                att.status === 'PRESENT' ? 'active' : 
                                att.status === 'ABSENT' ? 'suspended' : 'inactive'
                              }`} style={{ fontSize: 9 }}>
                                {att.status}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{att.remarks || '—'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                            No recent logs parsed.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </>
  );
};

export default TeacherStudentDrawer;
export type { TeacherStudentDrawerProps };
