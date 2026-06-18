import React, { useState, useMemo, useEffect } from 'react';
import { 
  CLASSES, 
  SECTIONS, 
  STUDENTS, 
  TEACHER_ASSIGNMENTS,
  ACADEMIC_YEARS
} from '../../data/academicMockData';
import { 
  CURRENT_TEACHER_ID, 
  saveAttendanceLog, 
  getAttendanceLogs 
} from '../../data/teacherMockData';
import { Student } from '../../types/student';
import { AttendanceRecordInput } from '../../types/teacher';
import TeacherStudentDrawer from './TeacherStudentDrawer';
import { 
  Users, 
  CheckCircle, 
  Save
} from 'lucide-react';
import './TeacherPortal.css';

const TeacherAttendance: React.FC = () => {
  // Current teacher assignments
  const myAssignments = useMemo(() => {
    return TEACHER_ASSIGNMENTS.filter(a => a.teacher_id === CURRENT_TEACHER_ID);
  }, []);

  // Assigned classes derived from assignments
  const myClasses = useMemo(() => {
    const classIds = Array.from(new Set(myAssignments.map(a => a.class_id)));
    return CLASSES.filter(c => classIds.includes(c.id));
  }, [myAssignments]);

  // Selections States
  const [selectedYear, setSelectedYear] = useState<string>('ay-2026');
  const [selectedClassId, setSelectedClassId] = useState<string>(myClasses[0]?.id ?? '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

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

  // Automatically select the first section when the class changes
  useEffect(() => {
    if (mySections.length > 0) {
      setSelectedSectionId(mySections[0].id);
    } else {
      setSelectedSectionId('');
    }
  }, [mySections]);

  // Roster students in selected class + section
  const rosterStudents = useMemo(() => {
    if (!selectedClassId || !selectedSectionId) return [];
    return STUDENTS.filter(
      s => s.class_id === selectedClassId && s.grade_id === selectedSectionId && s.status === 'ACTIVE'
    );
  }, [selectedClassId, selectedSectionId]);

  // Attendance Records state
  const [records, setRecords] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE'>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load existing log if saved
  useEffect(() => {
    if (!selectedClassId || !selectedSectionId || !selectedDate) return;
    const logs = getAttendanceLogs();
    const existing = logs.find(
      l => l.date === selectedDate && l.classId === selectedClassId && l.sectionId === selectedSectionId
    );

    const initialRecords: typeof records = {};
    const initialRemarks: typeof remarks = {};

    rosterStudents.forEach(s => {
      // Default to PRESENT
      initialRecords[s.id] = 'PRESENT';
      initialRemarks[s.id] = '';
    });

    if (existing) {
      existing.records.forEach(r => {
        initialRecords[r.studentId] = r.status;
        initialRemarks[r.studentId] = r.remarks ?? '';
      });
    }

    setRecords(initialRecords);
    setRemarks(initialRemarks);
  }, [selectedClassId, selectedSectionId, selectedDate, rosterStudents]);

  // Helper toggle for individual student
  const handleStatusChange = (studentId: string, status: typeof records[string]) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const handleRemarkChange = (studentId: string, remarkVal: string) => {
    setRemarks(prev => ({ ...prev, [studentId]: remarkVal }));
  };

  // Bulk actions
  const markAllPresent = () => {
    const updated = { ...records };
    rosterStudents.forEach(s => {
      updated[s.id] = 'PRESENT';
    });
    setRecords(updated);
  };

  const markAllAbsent = () => {
    const updated = { ...records };
    rosterStudents.forEach(s => {
      updated[s.id] = 'ABSENT';
    });
    setRecords(updated);
  };

  // Live Statistics
  const stats = useMemo(() => {
    const total = rosterStudents.length;
    if (total === 0) return { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, rate: 0 };
    
    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let leave = 0;

    rosterStudents.forEach(s => {
      const status = records[s.id];
      if (status === 'PRESENT') present++;
      else if (status === 'ABSENT') absent++;
      else if (status === 'LATE') late++;
      else if (status === 'HALF_DAY') halfDay++;
      else if (status === 'LEAVE') leave++;
    });

    const activePresent = present + late; // Late count as present for stats
    const rate = Math.round((activePresent / total) * 100);

    return { present, absent, late, halfDay, leave, rate };
  }, [rosterStudents, records]);

  // Save Submission
  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));

    const recordsPayload: AttendanceRecordInput[] = rosterStudents.map(s => ({
      studentId: s.id,
      status: records[s.id] || 'PRESENT',
      remarks: remarks[s.id] || ''
    }));

    saveAttendanceLog({
      date: selectedDate,
      classId: selectedClassId,
      sectionId: selectedSectionId,
      records: recordsPayload,
      submittedBy: CURRENT_TEACHER_ID
    });

    setSaving(false);
    setToastMessage(`Roll call attendance submitted successfully for ${selectedDate}.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Student Details Drawer State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<Student | null>(null);

  const openStudentDrawer = (student: Student) => {
    setSelectedStudentForDrawer(student);
    setDrawerOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="erp-toast">
          <CheckCircle size={16} /> <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Student Roll Call Attendance</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Select your assigned classroom group level, view roster details, and punch daily attendance records.
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="filters-grid" style={{ marginBottom: 0 }}>
        {/* Academic Year */}
        <div className="filter-group">
          <label className="filter-label">Academic Year</label>
          <select 
            className="filter-select" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {ACADEMIC_YEARS.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>

        {/* Assigned Class */}
        <div className="filter-group">
          <label className="filter-label">Class</label>
          <select 
            className="filter-select" 
            value={selectedClassId} 
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {myClasses.length === 0 ? (
              <option value="">No Classes Assigned</option>
            ) : (
              myClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))
            )}
          </select>
        </div>

        {/* Mapped Section */}
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

        {/* Roll Date */}
        <div className="filter-group">
          <label className="filter-label">Roll Call Date</label>
          <input 
            type="date" 
            className="filter-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Layout */}
      {rosterStudents.length === 0 ? (
        <div className="classes-empty-view" style={{ minHeight: 300 }}>
          <Users size={40} />
          <h3>No Rostered Students Mapped</h3>
          <p>We couldn't locate any active students assigned to the selected Class and Section.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Live KPI statistics banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div className="stat-mini-card">
              <div className="stat-mini-label">Total Roster</div>
              <div className="stat-mini-value" style={{ color: 'var(--text-primary)' }}>{rosterStudents.length}</div>
            </div>
            <div className="stat-mini-card">
              <div className="stat-mini-label">Present</div>
              <div className="stat-mini-value success">{stats.present}</div>
            </div>
            <div className="stat-mini-card">
              <div className="stat-mini-label">Absent</div>
              <div className="stat-mini-value danger">{stats.absent}</div>
            </div>
            <div className="stat-mini-card">
              <div className="stat-mini-label">Late Bus</div>
              <div className="stat-mini-value warning">{stats.late}</div>
            </div>
            <div className="stat-mini-card">
              <div className="stat-mini-label">Attendance Rate</div>
              <div className="stat-mini-value primary">{stats.rate}%</div>
            </div>
          </div>

          {/* Roster Table List */}
          <div className="table-card">
            
            {/* Roster Actions header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Roster roll sheet
              </h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={markAllPresent}>
                  Mark All Present
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12, borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }} onClick={markAllAbsent}>
                  Mark All Absent
                </button>
              </div>
            </div>

            <div className="erp-table-wrapper">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Admission No</th>
                    <th>Student Name</th>
                    <th style={{ textAlign: 'center' }}>Attendance Punch status</th>
                    <th>Log / Remarks Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterStudents.map(student => {
                    const currentStatus = records[student.id] || 'PRESENT';
                    return (
                      <tr key={student.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{student.roll_number}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{student.admission_number}</td>
                        <td style={{ fontWeight: 600 }}>
                          <button 
                            className="btn-link" 
                            style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                            onClick={() => openStudentDrawer(student)}
                          >
                            {student.name} {student.surname}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div className="attendance-punch-group">
                              <button 
                                className={`attendance-badge-btn present ${currentStatus === 'PRESENT' ? 'active' : ''}`}
                                onClick={() => handleStatusChange(student.id, 'PRESENT')}
                              >
                                Present
                              </button>
                              <button 
                                className={`attendance-badge-btn absent ${currentStatus === 'ABSENT' ? 'active' : ''}`}
                                onClick={() => handleStatusChange(student.id, 'ABSENT')}
                              >
                                Absent
                              </button>
                              <button 
                                className={`attendance-badge-btn late ${currentStatus === 'LATE' ? 'active' : ''}`}
                                onClick={() => handleStatusChange(student.id, 'LATE')}
                              >
                                Late
                              </button>
                              <button 
                                className={`attendance-badge-btn half_day ${currentStatus === 'HALF_DAY' ? 'active' : ''}`}
                                onClick={() => handleStatusChange(student.id, 'HALF_DAY')}
                              >
                                Half
                              </button>
                              <button 
                                className={`attendance-badge-btn leave ${currentStatus === 'LEAVE' ? 'active' : ''}`}
                                onClick={() => handleStatusChange(student.id, 'LEAVE')}
                              >
                                Leave
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <input 
                            className="filter-input"
                            style={{ width: '100%', padding: '6px 10px', fontSize: 12 }}
                            placeholder="e.g. Health issue note..."
                            value={remarks[student.id] || ''}
                            onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Save Toolbar footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
              <button 
                className="btn btn-primary" 
                style={{ gap: 8 }} 
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} />
                <span>{saving ? 'Submitting roll...' : 'Submit Roll Call'}</span>
              </button>
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

export default TeacherAttendance;
