import React, { useMemo, useState } from 'react';
import { 
  CLASSES, 
  SECTIONS, 
  STUDENTS, 
  TEACHER_ASSIGNMENTS 
} from '../../data/academicMockData';
import { STUDENT_DETAILS_MAP } from '../../data/studentDetailsMockData';
import { CURRENT_TEACHER_ID } from '../../data/teacherMockData';
import { Student } from '../../types/student';
import TeacherStudentDrawer from './TeacherStudentDrawer';
import { 
  Award, 
  AlertTriangle, 
  TrendingUp, 
  ClipboardCheck 
} from 'lucide-react';
import './TeacherPortal.css';

const TeacherPerformance: React.FC = () => {
  // Current teacher assignments
  const myAssignments = useMemo(() => {
    return TEACHER_ASSIGNMENTS.filter(a => a.teacher_id === CURRENT_TEACHER_ID);
  }, []);

  // Assigned classes
  const myClasses = useMemo(() => {
    const classIds = Array.from(new Set(myAssignments.map(a => a.class_id)));
    return CLASSES.filter(c => classIds.includes(c.id));
  }, [myAssignments]);

  const [selectedClassId, setSelectedClassId] = useState<string>(myClasses[0]?.id ?? '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  // Available sections based on selected class
  const mySections = useMemo(() => {
    if (!selectedClassId) return [];
    const sectionIds = Array.from(
      new Set(
        myAssignments
          .filter(a => a.class_id === selectedClassId)
          .map(a => a.section_id)
      )
    );
    return SECTIONS.filter(s => sectionIds.includes(s.id));
  }, [selectedClassId, myAssignments]);

  // Handle section auto selection
  React.useEffect(() => {
    if (mySections.length > 0) {
      setSelectedSectionId(mySections[0].id);
    } else {
      setSelectedSectionId('');
    }
  }, [mySections]);

  // Roster students
  const rosterStudents = useMemo(() => {
    if (!selectedClassId || !selectedSectionId) return [];
    return STUDENTS.filter(
      s => s.class_id === selectedClassId && s.grade_id === selectedSectionId && s.status === 'ACTIVE'
    );
  }, [selectedClassId, selectedSectionId]);

  // Enrich students with academic performance & attendance rate
  const studentMetrics = useMemo(() => {
    return rosterStudents.map(s => {
      const details = STUDENT_DETAILS_MAP[s.id];
      
      // Calculate attendance rate
      let attendanceRate = 95; // seed default
      if (details && details.attendance.length > 0) {
        const total = details.attendance.length;
        const present = details.attendance.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
        attendanceRate = Math.round((present / total) * 100);
      }

      // Calculate grade average (Final Exam)
      let gradeAverage = 75; // seed default
      if (details && details.marks.length > 0) {
        const finalMarks = details.marks.filter(m => m.exam === 'Final Exam');
        if (finalMarks.length > 0) {
          const totalObtained = finalMarks.reduce((sum, m) => sum + m.marksObtained, 0);
          const totalMax = finalMarks.reduce((sum, m) => sum + m.maxMarks, 0);
          gradeAverage = Math.round((totalObtained / totalMax) * 100);
        }
      }

      return {
        student: s,
        attendanceRate,
        gradeAverage
      };
    });
  }, [rosterStudents]);

  // Class analytics summary
  const summary = useMemo(() => {
    const total = studentMetrics.length;
    if (total === 0) return { avgGrade: 0, avgAttendance: 0, topPerformers: [], attentionList: [] };

    const sumGrades = studentMetrics.reduce((sum, s) => sum + s.gradeAverage, 0);
    const sumAttendance = studentMetrics.reduce((sum, s) => sum + s.attendanceRate, 0);

    // Filter Top Performers (average grade >= 85)
    const top = [...studentMetrics]
      .filter(s => s.gradeAverage >= 85)
      .sort((a, b) => b.gradeAverage - a.gradeAverage);

    // Filter Struggling Students (attendance < 75% or grade average < 70)
    const attention = [...studentMetrics]
      .filter(s => s.attendanceRate < 80 || s.gradeAverage < 70)
      .sort((a, b) => a.gradeAverage - b.gradeAverage);

    return {
      avgGrade: Math.round(sumGrades / total),
      avgAttendance: Math.round(sumAttendance / total),
      topPerformers: top,
      attentionList: attention
    };
  }, [studentMetrics]);

  // Drawer details state
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<Student | null>(null);

  const openStudentDrawer = (student: Student) => {
    setSelectedStudentForDrawer(student);
    setDrawerOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h1>Class Performance & Analytics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Review success reports, class average ratings, and detect student profiles requiring attention.
        </p>
      </div>

      {/* Selector Toolbar */}
      <div className="filters-grid" style={{ marginBottom: 0 }}>
        {/* Class Selection */}
        <div className="filter-group">
          <label className="filter-label">Class</label>
          <select 
            className="filter-select" 
            value={selectedClassId} 
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {myClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Section Selection */}
        <div className="filter-group">
          <label className="filter-label">Section</label>
          <select 
            className="filter-select" 
            value={selectedSectionId} 
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={!selectedClassId}
          >
            {mySections.length === 0 ? (
              <option value="">No Sections Mapped</option>
            ) : (
              mySections.map(s => (
                <option key={s.id} value={s.id}>Section {s.name}</option>
              ))
            )}
          </select>
        </div>
      </div>

      {rosterStudents.length === 0 ? (
        <div className="classes-empty-view" style={{ minHeight: 300 }}>
          <TrendingUp size={40} />
          <h3>No Performance Data</h3>
          <p>Assign students to class level roster before compiling analytical grades calculations.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Summary KPIs Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="class-kpi-card">
              <TrendingUp size={22} className="kpi-icon primary" />
              <div>
                <div className="kpi-label">Class Average Score</div>
                <div className="kpi-val" style={{ color: 'var(--success)' }}>{summary.avgGrade}%</div>
              </div>
            </div>
            <div className="class-kpi-card">
              <ClipboardCheck size={22} className="kpi-icon success" />
              <div>
                <div className="kpi-label">Class Attendance Average</div>
                <div className="kpi-val" style={{ color: 'var(--primary)' }}>{summary.avgAttendance}%</div>
              </div>
            </div>
            <div className="class-kpi-card">
              <Award size={22} className="kpi-icon warning" />
              <div>
                <div className="kpi-label">High Performers</div>
                <div className="kpi-val">{summary.topPerformers.length} Students</div>
              </div>
            </div>
            <div className="class-kpi-card">
              <AlertTriangle size={22} className="kpi-icon danger" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} />
              <div>
                <div className="kpi-label">Needs Attention</div>
                <div className="kpi-val" style={{ color: 'var(--danger)' }}>{summary.attentionList.length} Accounts</div>
              </div>
            </div>
          </div>

          {/* Performance Panels (Top Performers vs Attention list) */}
          <div className="performance-cards-grid">
            
            {/* Top Performers */}
            <div className="highlight-box" style={{ borderLeft: '4px solid var(--success)' }}>
              <div className="highlight-box-title" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award size={16} /> <span>Top Performers (Grade {`>=`} 85%)</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {summary.topPerformers.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                    No students currently averaging above 85% in final reports.
                  </p>
                ) : (
                  summary.topPerformers.map(m => (
                    <div key={m.student.id} className="highlight-student-row">
                      <div>
                        <button 
                          className="btn-link" 
                          style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                          onClick={() => openStudentDrawer(m.student)}
                        >
                          {m.student.name} {m.student.surname}
                        </button>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          Attendance: {m.attendanceRate}%
                        </div>
                      </div>
                      <span className="badge badge-primary" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                        {m.gradeAverage}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Requires Attention */}
            <div className="highlight-box" style={{ borderLeft: '4px solid var(--danger)' }}>
              <div className="highlight-box-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} /> <span>Requires Attention (Attendance {`<`} 80% / Grade {`<`} 70%)</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {summary.attentionList.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                    All students are meeting basic class academic thresholds. Excellent!
                  </p>
                ) : (
                  summary.attentionList.map(m => {
                    const isAttendanceStruggling = m.attendanceRate < 80;
                    return (
                      <div key={m.student.id} className="highlight-student-row">
                        <div>
                          <button 
                            className="btn-link" 
                            style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                            onClick={() => openStudentDrawer(m.student)}
                          >
                            {m.student.name} {m.student.surname}
                          </button>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                            Class Avg: {m.gradeAverage}%
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {isAttendanceStruggling ? (
                            <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', fontSize: 10 }}>
                              Att: {m.attendanceRate}%
                            </span>
                          ) : (
                            <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: 10 }}>
                              Avg: {m.gradeAverage}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Roster overview with detailed indicators */}
          <div className="table-card" style={{ marginTop: 8 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Comprehensive Performance Matrix
              </h3>
            </div>
            
            <div className="erp-table-wrapper">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th style={{ textAlign: 'center' }}>Attendance rate</th>
                    <th style={{ textAlign: 'center' }}>Report Grade Average</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {studentMetrics.map(m => (
                    <tr key={m.student.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{m.student.roll_number}</td>
                      <td style={{ fontWeight: 600 }}>{m.student.name} {m.student.surname}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-pill ${m.attendanceRate >= 90 ? 'active' : m.attendanceRate >= 75 ? 'warning' : 'suspended'}`} style={{ fontSize: 11 }}>
                          {m.attendanceRate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 850 }}>
                        <span style={{ color: m.gradeAverage >= 85 ? 'var(--success)' : m.gradeAverage >= 60 ? 'var(--primary)' : 'var(--danger)' }}>
                          {m.gradeAverage}%
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => openStudentDrawer(m.student)}>
                          Analyze Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Reusable Student Profile Drawer */}
      <TeacherStudentDrawer 
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        student={selectedStudentForDrawer}
      />

    </div>
  );
};

export default TeacherPerformance;
