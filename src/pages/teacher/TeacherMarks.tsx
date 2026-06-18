import React, { useState, useMemo, useEffect } from 'react';
import { 
  CLASSES, 
  SECTIONS, 
  STUDENTS, 
  TEACHER_ASSIGNMENTS,
  SUBJECTS
} from '../../data/academicMockData';

import { 
  CURRENT_TEACHER_ID, 
  saveExamMarksLedger, 
  getExamMarksLedgers,
  calculateGradeAndPass
} from '../../data/teacherMockData';
import { Student } from '../../types/student';
import { StudentMarksInput } from '../../types/teacher';
import TeacherStudentDrawer from './TeacherStudentDrawer';
import { 
  Save, 
  BookOpen, 
  CheckCircle, 
  RotateCcw
} from 'lucide-react';
import './TeacherPortal.css';

const EXAM_TYPES = [
  { id: 'ct-1', name: 'Class Test 1' },
  { id: 'ct-2', name: 'Class Test 2' },
  { id: 'mid', name: 'Midterm Exam' },
  { id: 'final', name: 'Final Exam' }
];

const TeacherMarks: React.FC = () => {
  // Current teacher assignments
  const myAssignments = useMemo(() => {
    return TEACHER_ASSIGNMENTS.filter(a => a.teacher_id === CURRENT_TEACHER_ID);
  }, []);

  // Assigned classes
  const myClasses = useMemo(() => {
    const classIds = Array.from(new Set(myAssignments.map(a => a.class_id)));
    return CLASSES.filter(c => classIds.includes(c.id));
  }, [myAssignments]);

  // Selections States
  const [selectedClassId, setSelectedClassId] = useState<string>(myClasses[0]?.id ?? '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState<string>('mid');
  const [maxMarks, setMaxMarks] = useState<number>(100);

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

  // Available subjects based on selected class, section, and teacher assignments
  const mySubjects = useMemo(() => {
    if (!selectedClassId || !selectedSectionId) return [];
    const subjectIds = Array.from(
      new Set(
        myAssignments
          .filter(a => a.class_id === selectedClassId && a.section_id === selectedSectionId)
          .map(a => a.subject_id)
      )
    );
    return SUBJECTS.filter(sub => subjectIds.includes(sub.id));
  }, [selectedClassId, selectedSectionId, myAssignments]);

  // Select first subject on change
  useEffect(() => {
    if (mySubjects.length > 0) {
      setSelectedSubjectId(mySubjects[0].id);
    } else {
      setSelectedSubjectId('');
    }
  }, [mySubjects]);

  // Roster students
  const rosterStudents = useMemo(() => {
    if (!selectedClassId || !selectedSectionId) return [];
    return STUDENTS.filter(
      s => s.class_id === selectedClassId && s.grade_id === selectedSectionId && s.status === 'ACTIVE'
    );
  }, [selectedClassId, selectedSectionId]);

  // Input grades mapping states
  const [obtainedMarks, setObtainedMarks] = useState<Record<string, string>>({});
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load existing grade ledger if saved
  useEffect(() => {
    if (!selectedClassId || !selectedSectionId || !selectedSubjectId || !selectedExamType) return;
    const ledgers = getExamMarksLedgers();
    const existing = ledgers.find(
      l => 
        l.classId === selectedClassId && 
        l.sectionId === selectedSectionId && 
        l.subjectId === selectedSubjectId && 
        l.examType === selectedExamType
    );

    const initialObtained: typeof obtainedMarks = {};
    if (existing) {
      setMaxMarks(existing.maxMarks);
      existing.records.forEach(r => {
        initialObtained[r.studentId] = r.obtainedMarks.toString();
      });
      setIsDraftSaved(true);
    } else {
      rosterStudents.forEach(s => {
        initialObtained[s.id] = '';
      });
      setIsDraftSaved(true);
    }

    setObtainedMarks(initialObtained);
  }, [selectedClassId, selectedSectionId, selectedSubjectId, selectedExamType, rosterStudents]);

  // Input Change Handler with Autosave draft logic
  const handleScoreChange = (studentId: string, scoreVal: string) => {
    // Validate number
    if (scoreVal !== '' && (isNaN(Number(scoreVal)) || Number(scoreVal) < 0 || Number(scoreVal) > maxMarks)) {
      return; // prevent out of bounds
    }
    
    setObtainedMarks(prev => {
      const next = { ...prev, [studentId]: scoreVal };
      setIsDraftSaved(false);
      
      // Auto-save draft in background to localStorage after a tiny delay
      const draftPayload: StudentMarksInput[] = rosterStudents.map(s => {
        const score = Number(next[s.id]) || 0;
        const calc = calculateGradeAndPass(score, maxMarks);
        return {
          studentId: s.id,
          obtainedMarks: score,
          grade: calc.grade,
          percentage: calc.percentage,
          passed: calc.passed
        };
      });

      saveExamMarksLedger({
        classId: selectedClassId,
        sectionId: selectedSectionId,
        subjectId: selectedSubjectId,
        examType: selectedExamType,
        maxMarks,
        records: draftPayload,
        isDraft: true
      });
      
      return next;
    });
  };

  // Live Statistics Calculations
  const stats = useMemo(() => {
    let count = 0;
    let sum = 0;
    let highest = 0;
    let lowest = maxMarks;
    let passes = 0;

    rosterStudents.forEach(s => {
      const scoreStr = obtainedMarks[s.id];
      if (scoreStr && scoreStr !== '') {
        const score = Number(scoreStr);
        count++;
        sum += score;
        if (score > highest) highest = score;
        if (score < lowest) lowest = score;

        const calc = calculateGradeAndPass(score, maxMarks);
        if (calc.passed) passes++;
      }
    });

    const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
    const passPercentage = count > 0 ? Math.round((passes / count) * 100) : 0;

    return {
      highest: count > 0 ? highest : 0,
      lowest: count > 0 ? lowest : 0,
      average,
      passPercentage,
      gradedCount: count
    };
  }, [rosterStudents, obtainedMarks, maxMarks]);

  // Final ledger submission
  const handleSubmitMarks = async () => {
    // Check if any student marks are still empty
    const uncompleted = rosterStudents.some(s => !obtainedMarks[s.id] || obtainedMarks[s.id] === '');
    if (uncompleted) {
      if (!window.confirm('Some students do not have marks entered. Do you want to submit anyway? Unentered marks will default to 0.')) {
        return;
      }
    }

    setSaving(true);
    await new Promise(r => setTimeout(r, 600));

    const finalRecords: StudentMarksInput[] = rosterStudents.map(s => {
      const score = Number(obtainedMarks[s.id]) || 0;
      const calc = calculateGradeAndPass(score, maxMarks);
      return {
        studentId: s.id,
        obtainedMarks: score,
        grade: calc.grade,
        percentage: calc.percentage,
        passed: calc.passed
      };
    });

    saveExamMarksLedger({
      classId: selectedClassId,
      sectionId: selectedSectionId,
      subjectId: selectedSubjectId,
      examType: selectedExamType,
      maxMarks,
      records: finalRecords,
      isDraft: false
    });

    setSaving(false);
    setIsDraftSaved(true);
    setToastMessage('Grade ledger submitted successfully to Central academic files.');
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
          <h1>Grade Book Roster Marks</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Enter and review student marks per subject and exam category. Calculations compile automatically.
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
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

        {/* Subject Selection */}
        <div className="filter-group">
          <label className="filter-label">Subject</label>
          <select 
            className="filter-select" 
            value={selectedSubjectId} 
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            disabled={mySubjects.length === 0}
          >
            {mySubjects.length === 0 ? (
              <option value="">No Subjects Taught</option>
            ) : (
              mySubjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))
            )}
          </select>
        </div>

        {/* Exam Selection */}
        <div className="filter-group">
          <label className="filter-label">Exam Type</label>
          <select 
            className="filter-select" 
            value={selectedExamType} 
            onChange={(e) => setSelectedExamType(e.target.value)}
          >
            {EXAM_TYPES.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>

        {/* Max Marks config */}
        <div className="filter-group">
          <label className="filter-label">Max Score Value</label>
          <input 
            type="number"
            className="filter-input" 
            value={maxMarks}
            onChange={(e) => setMaxMarks(Math.max(10, Number(e.target.value)))}
          />
        </div>
      </div>

      {/* Main Grid Content */}
      {rosterStudents.length === 0 ? (
        <div className="classes-empty-view" style={{ minHeight: 300 }}>
          <BookOpen size={40} />
          <h3>No Student Rosters Loaded</h3>
          <p>Assigned students must be mapped to this class level in order to initialize grading files.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Live Recalculating Statistics widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div className="stat-mini-card">
              <div className="stat-mini-label">Graded Roster Count</div>
              <div className="stat-mini-value" style={{ color: 'var(--text-primary)' }}>{stats.gradedCount} / {rosterStudents.length}</div>
            </div>
            <div className="stat-mini-card">
              <div className="stat-mini-label">Highest Score</div>
              <div className="stat-mini-value success">{stats.highest} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ {maxMarks}</span></div>
            </div>
            <div className="stat-mini-card">
              <div className="stat-mini-label">Lowest Score</div>
              <div className="stat-mini-value danger">{stats.lowest} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ {maxMarks}</span></div>
            </div>
            <div className="stat-mini-card">
              <div className="stat-mini-label">Class Average</div>
              <div className="stat-mini-value primary">{stats.average}</div>
            </div>
            <div className="stat-mini-card">
              <div className="stat-mini-label">Pass Percentage</div>
              <div className="stat-mini-value success">{stats.passPercentage}%</div>
            </div>
          </div>

          {/* Roster Spreadsheet Table */}
          <div className="table-card">
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Marks Ledger Spreadsheet
                </h3>
              </div>
              <div>
                {isDraftSaved ? (
                  <span className="autosave-indicator saved">
                    <CheckCircle size={14} /> Draft Saved
                  </span>
                ) : (
                  <span className="autosave-indicator">
                    <RotateCcw size={14} className="shimmer-spin" /> Auto-saving draft...
                  </span>
                )}
              </div>
            </div>

            <div className="erp-table-wrapper">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Admission No</th>
                    <th>Student Name</th>
                    <th style={{ textAlign: 'center' }}>Obtained Marks</th>
                    <th style={{ textAlign: 'center' }}>Percentage</th>
                    <th style={{ textAlign: 'center' }}>Grade Rating</th>
                    <th style={{ textAlign: 'center' }}>Result status</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterStudents.map(student => {
                    const val = obtainedMarks[student.id] || '';
                    const calc = calculateGradeAndPass(Number(val) || 0, maxMarks);
                    const isEntered = val !== '';

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
                            <input 
                              type="text"
                              className={`marks-score-input ${Number(val) > maxMarks ? 'error' : ''}`}
                              placeholder="—"
                              value={val}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            />
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {isEntered ? `${calc.percentage}%` : '—'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }}>
                          {isEntered ? (
                            <span style={{ color: calc.passed ? 'var(--success)' : 'var(--danger)' }}>{calc.grade}</span>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isEntered ? (
                            <span className={`status-pill ${calc.passed ? 'active' : 'suspended'}`} style={{ fontSize: 9 }}>
                              {calc.passed ? 'Passed' : 'Failed'}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Submit Toolbar footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
              <button 
                className="btn btn-primary" 
                style={{ gap: 8 }} 
                onClick={handleSubmitMarks}
                disabled={saving}
              >
                <Save size={16} />
                <span>{saving ? 'Submitting marks...' : 'Submit Final Ledger'}</span>
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

export default TeacherMarks;
