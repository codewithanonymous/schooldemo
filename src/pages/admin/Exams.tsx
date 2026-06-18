import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { STUDENTS, CLASSES, SECTIONS, TEACHER_ASSIGNMENTS, SUBJECTS } from '../../data/academicMockData';

import { STAFF } from '../../data/staffDetailsMockData';
import {
  EXAMS,
  EXAM_MARKS,
  createExam,
  updateExam,
  deleteExam,
  saveMarksRecord,
  calculateGrade,
  Exam,
  ExamMarksRecord,
  StudentExamMark
} from '../../data/examMockData';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  FileText,
  UserCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle,
  Award,
  TrendingDown,
  ChevronRight,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import './Exams.css';

const Exams: React.FC = () => {
  const { user } = useAuth() as any;
  const location = useLocation();

  // Role resolution
  const currentRole = useMemo(() => user?.role || 'admin', [user]);
  const currentUserId = useMemo(() => user?.id || 'usr-admin-001', [user]);

  // --- Core State Variables ---
  const [examsList, setExamsList] = useState<Exam[]>(EXAMS);
  const [marksRecords, setMarksRecords] = useState<Record<string, ExamMarksRecord>>(EXAM_MARKS);

  // Sync state with localstorage updates (e.g. if tabs are refreshed)
  useEffect(() => {
    const syncStates = () => {
      setExamsList([...EXAMS]);
      setMarksRecords({ ...EXAM_MARKS });
    };
    window.addEventListener('focus', syncStates);
    return () => window.removeEventListener('focus', syncStates);
  }, []);

  // --- Filtering & Search States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // --- Parent Portal Child Selection ---
  const parentChildren = useMemo(() => {
    if (currentRole !== 'parent') return [];
    return STUDENTS.filter(s => s.parent_id === currentUserId);
  }, [currentRole, currentUserId]);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    parentChildren[0]?.id || ''
  );

  const selectedChild = useMemo(() => {
    return STUDENTS.find(s => s.id === selectedChildId);
  }, [selectedChildId]);

  // --- Create/Edit Exam Modal States ---
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete'>('create');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Modal Form States
  const [formYear, setFormYear] = useState('ay-2026');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<Exam['examType']>('Unit Test');
  const [formClass, setFormClass] = useState('c-1');
  const [formSection, setFormSection] = useState('sec-1a');
  const [formSubject, setFormSubject] = useState('s1');
  const [formDate, setFormDate] = useState('');
  const [formMaxMarks, setFormMaxMarks] = useState(100);
  const [formPassMarks, setFormPassMarks] = useState(35);
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<Exam['status']>('Draft');
  
  const [saving, setSaving] = useState(false);

  // --- Side Drawer Detail Panel States ---
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerExam, setDrawerExam] = useState<Exam | null>(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'overview' | 'teachers' | 'marks' | 'analytics'>('overview');

  // Teacher Marks Entry States
  const [teacherMarksInput, setTeacherMarksInput] = useState<Record<string, string>>({});
  const [teacherRemarksInput, setTeacherRemarksInput] = useState<Record<string, string>>({});
  const [marksValidationErrors, setMarksValidationErrors] = useState<string | null>(null);
  const [marksSaving, setMarksSaving] = useState(false);

  // Auto-open drawer if requested from route location state
  useEffect(() => {
    if (location.state && (location.state as any).openExamId) {
      const targetExam = examsList.find(e => e.id === (location.state as any).openExamId);
      if (targetExam) {
        setDrawerExam(targetExam);
        setDrawerActiveTab('marks');
        setDrawerOpen(true);
      }
    }
  }, [location.state, examsList]);

  // --- Data Calculations for active role view ---
  
  // 1. Resolve assigned exams for teachers
  const teacherAssignments = useMemo(() => {
    return TEACHER_ASSIGNMENTS.filter(a => a.teacher_id === currentUserId);
  }, [currentUserId]);

  const examsForRole = useMemo(() => {
    if (currentRole === 'admin') {
      return examsList;
    }
    if (currentRole === 'teacher') {
      return examsList.filter(exam =>
        teacherAssignments.some(a =>
          a.class_id === exam.classId &&
          a.section_id === exam.sectionId &&
          a.subject_id === exam.subjectId
        )
      );
    }
    if (currentRole === 'student') {
      const studentObj = STUDENTS.find(s => s.id === currentUserId);
      if (!studentObj) return [];
      return examsList.filter(exam =>
        exam.classId === studentObj.class_id &&
        exam.sectionId === studentObj.grade_id &&
        exam.status === 'Completed'
      );
    }
    if (currentRole === 'parent') {
      if (!selectedChild) return [];
      return examsList.filter(exam =>
        exam.classId === selectedChild.class_id &&
        exam.sectionId === selectedChild.grade_id &&
        exam.status === 'Completed'
      );
    }
    return [];
  }, [currentRole, examsList, teacherAssignments, currentUserId, selectedChild]);

  // 2. Compute Filter Option Dropdowns dynamically
  const uniqueAcademicYears = useMemo(() => ['ay-2026', 'ay-2025'], []);
  const classOptions = useMemo(() => CLASSES, []);
  const sectionOptions = useMemo(() => {
    if (classFilter === 'All') return SECTIONS;
    return SECTIONS.filter(s => s.class_id === classFilter);
  }, [classFilter]);

  // Form Section update dependent on Form Class Selection
  useEffect(() => {
    const matchingSecs = SECTIONS.filter(s => s.class_id === formClass);
    if (matchingSecs.length > 0) {
      setFormSection(matchingSecs[0].id);
    }
  }, [formClass]);

  // 3. Apply Search & Filters
  const filteredExams = useMemo(() => {
    return examsForRole.filter(exam => {
      const matchesSearch =
        exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (SUBJECTS.find(sub => sub.id === exam.subjectId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesYear = yearFilter === 'All' || exam.academicYearId === yearFilter;
      const matchesClass = classFilter === 'All' || exam.classId === classFilter;
      const matchesSection = sectionFilter === 'All' || exam.sectionId === sectionFilter;
      const matchesSubject = subjectFilter === 'All' || exam.subjectId === subjectFilter;
      const matchesType = typeFilter === 'All' || exam.examType === typeFilter;
      const matchesStatus = statusFilter === 'All' || exam.status === statusFilter;

      return matchesSearch && matchesYear && matchesClass && matchesSection && matchesSubject && matchesType && matchesStatus;
    });
  }, [examsForRole, searchQuery, yearFilter, classFilter, sectionFilter, subjectFilter, typeFilter, statusFilter]);

  // Pagination indexing
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedExams = useMemo(() => {
    return filteredExams.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredExams, indexOfFirstItem, indexOfLastItem]);
  
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);

  // --- Top KPI Widgets Calculations ---
  const kpiMetrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = examsForRole.length;
    const upcoming = examsForRole.filter(e => e.examDate > today).length;
    const published = examsForRole.filter(e => e.status === 'Published').length;
    const completed = examsForRole.filter(e => e.status === 'Completed').length;
    
    // Pending submission: status Published, but marks not submitted or isDraft
    const pendingSubmission = examsForRole.filter(e => 
      e.status === 'Published' && (!marksRecords[e.id] || marksRecords[e.id].isDraft)
    ).length;
    
    const resultsPublished = completed;

    return { total, upcoming, published, completed, pendingSubmission, resultsPublished };
  }, [examsForRole, marksRecords]);

  // Student specific KPI aggregations
  const studentMetrics = useMemo(() => {
    if (currentRole !== 'student') return null;
    const myMarks = Object.values(marksRecords)
      .map(rec => rec.marks[currentUserId])
      .filter(Boolean);

    const taken = myMarks.length;
    const passed = myMarks.filter(m => m.passed).length;
    const passRate = taken > 0 ? Math.round((passed / taken) * 100) : 0;
    
    const percentages = myMarks.map(m => m.percentage);
    const avgPercentage = percentages.length > 0
      ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
      : 0;

    return { taken, passed, passRate, avgPercentage };
  }, [currentRole, marksRecords, currentUserId]);

  // Parent specific KPI aggregations
  const parentMetrics = useMemo(() => {
    if (currentRole !== 'parent' || !selectedChild) return null;
    const childMarks = Object.values(marksRecords)
      .map(rec => rec.marks[selectedChild.id])
      .filter(Boolean);

    const taken = childMarks.length;
    const passed = childMarks.filter(m => m.passed).length;
    const passRate = taken > 0 ? Math.round((passed / taken) * 100) : 0;

    const percentages = childMarks.map(m => m.percentage);
    const avgPercentage = percentages.length > 0
      ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
      : 0;

    return { taken, passed, passRate, avgPercentage };
  }, [currentRole, selectedChild, marksRecords]);

  // --- Handlers: Modal Forms ---
  const handleOpenCreate = () => {
    setModalType('create');
    setSelectedExam(null);
    setFormYear('ay-2026');
    setFormName('');
    setFormType('Unit Test');
    setFormClass(CLASSES[0]?.id || 'c-1');
    setFormSubject(SUBJECTS[0]?.id || 's1');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMaxMarks(100);
    setFormPassMarks(35);
    setFormDesc('');
    setFormStatus('Draft');
    setShowModal(true);
  };

  const handleOpenEdit = (exam: Exam, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('edit');
    setSelectedExam(exam);
    setFormYear(exam.academicYearId);
    setFormName(exam.name);
    setFormType(exam.examType);
    setFormClass(exam.classId);
    setFormSection(exam.sectionId);
    setFormSubject(exam.subjectId);
    setFormDate(exam.examDate);
    setFormMaxMarks(exam.maxMarks);
    setFormPassMarks(exam.passingMarks);
    setFormDesc(exam.description);
    setFormStatus(exam.status);
    setShowModal(true);
  };

  const handleOpenDelete = (exam: Exam, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('delete');
    setSelectedExam(exam);
    setShowModal(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 450));

    const payload = {
      academicYearId: formYear,
      name: formName,
      examType: formType,
      classId: formClass,
      sectionId: formSection,
      subjectId: formSubject,
      examDate: formDate,
      maxMarks: Number(formMaxMarks),
      passingMarks: Number(formPassMarks),
      description: formDesc,
      status: formStatus
    };

    if (modalType === 'create') {
      createExam(payload);
      setExamsList([...EXAMS]);
    } else if (modalType === 'edit' && selectedExam) {
      updateExam(selectedExam.id, payload);
      setExamsList([...EXAMS]);
      // Update drawer if opened on edited exam
      if (drawerExam && drawerExam.id === selectedExam.id) {
        setDrawerExam({ ...drawerExam, ...payload });
      }
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedExam) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 350));
    deleteExam(selectedExam.id);
    setExamsList([...EXAMS]);
    setMarksRecords({ ...EXAM_MARKS });
    if (drawerExam && drawerExam.id === selectedExam.id) {
      setDrawerOpen(false);
      setDrawerExam(null);
    }
    setSaving(false);
    setShowModal(false);
  };

  const handleTogglePublish = (exam: Exam, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus: Exam['status'] = exam.status === 'Draft' ? 'Published' : 'Archived';
    updateExam(exam.id, { status: nextStatus });
    setExamsList([...EXAMS]);
    if (drawerExam && drawerExam.id === exam.id) {
      setDrawerExam({ ...drawerExam, status: nextStatus });
    }
  };

  // --- Handlers: Side Drawer Detail Panels & Tabs ---
  const handleExamRowClick = (exam: Exam) => {
    setDrawerExam(exam);
    setDrawerActiveTab('overview');
    
    // Load student marks from database for teacher entry inputs
    const marksRecord = marksRecords[exam.id];
    const initialMarks: Record<string, string> = {};
    const initialRemarks: Record<string, string> = {};

    const studentList = STUDENTS.filter(
      s => s.class_id === exam.classId && s.grade_id === exam.sectionId && s.status === 'ACTIVE'
    );

    studentList.forEach(s => {
      const studentMark = marksRecord?.marks[s.id];
      initialMarks[s.id] = studentMark ? String(studentMark.obtainedMarks) : '';
      initialRemarks[s.id] = studentMark?.remarks || '';
    });

    setTeacherMarksInput(initialMarks);
    setTeacherRemarksInput(initialRemarks);
    setMarksValidationErrors(null);
    setDrawerOpen(true);
  };

  // Student marks inputs handler with inline error boundaries
  const handleMarkInputChange = (studentId: string, val: string, maxMarks: number) => {
    setTeacherMarksInput(prev => ({ ...prev, [studentId]: val }));

    if (val === '') {
      setMarksValidationErrors(null);
      return;
    }

    const num = Number(val);
    if (isNaN(num)) {
      setMarksValidationErrors('Marks must be numeric values.');
    } else if (num < 0 || num > maxMarks) {
      setMarksValidationErrors(`Marks obtained cannot exceed max marks of ${maxMarks} or fall below 0.`);
    } else {
      setMarksValidationErrors(null);
    }
  };

  const handleRemarksInputChange = (studentId: string, val: string) => {
    setTeacherRemarksInput(prev => ({ ...prev, [studentId]: val }));
  };

  const handleMarksSubmit = async (isDraftSubmit: boolean) => {
    if (!drawerExam) return;
    
    // Final check on numeric bounds
    let finalValid = true;
    const studentList = STUDENTS.filter(
      s => s.class_id === drawerExam.classId && s.grade_id === drawerExam.sectionId && s.status === 'ACTIVE'
    );

    for (let s of studentList) {
      const markStr = teacherMarksInput[s.id];
      if (!isDraftSubmit && markStr === '') {
        setMarksValidationErrors('All marks must be filled prior to finalizing submission.');
        return;
      }
      if (markStr !== '') {
        const num = Number(markStr);
        if (isNaN(num) || num < 0 || num > drawerExam.maxMarks) {
          finalValid = false;
          break;
        }
      }
    }

    if (!finalValid) {
      setMarksValidationErrors(`Score bounds exceeded. All marks must fall between 0 and ${drawerExam.maxMarks}.`);
      return;
    }

    setMarksSaving(true);
    await new Promise(r => setTimeout(r, 600));

    const finalMarksMap: Record<string, StudentExamMark> = {};

    studentList.forEach(s => {
      const scoreStr = teacherMarksInput[s.id];
      if (scoreStr !== '') {
        const score = Number(scoreStr);
        const pct = Math.round((score / drawerExam.maxMarks) * 100);
        const isPassed = score >= drawerExam.passingMarks;

        finalMarksMap[s.id] = {
          studentId: s.id,
          obtainedMarks: score,
          percentage: pct,
          grade: calculateGrade(pct),
          passed: isPassed,
          remarks: teacherRemarksInput[s.id] || ''
        };
      }
    });

    const marksRecordPayload = {
      marks: finalMarksMap,
      isDraft: isDraftSubmit,
      submittedBy: currentUserId,
      submittedAt: new Date().toISOString()
    };

    saveMarksRecord(drawerExam.id, marksRecordPayload);
    setMarksRecords({ ...EXAM_MARKS });

    // If fully submitted, auto complete exam status so results publish automatically
    if (!isDraftSubmit) {
      updateExam(drawerExam.id, { status: 'Completed' });
      setExamsList([...EXAMS]);
      setDrawerExam(prev => prev ? { ...prev, status: 'Completed' } : null);
    }

    setMarksSaving(false);
    setMarksValidationErrors(null);
  };

  // --- Sub-render Components: Side Drawer Tabs ---

  // Overview Tab
  const renderOverviewTab = (exam: Exam) => {
    const classObj = CLASSES.find(c => c.id === exam.classId);
    const secObj = SECTIONS.find(s => s.id === exam.sectionId);
    const subObj = SUBJECTS.find(s => s.id === exam.subjectId);

    return (
      <div className="overview-grid">
        <div className="overview-item">
          <span className="overview-item-label">Exam Name</span>
          <span className="overview-item-value">{exam.name}</span>
        </div>
        <div className="overview-item">
          <span className="overview-item-label">Exam Category</span>
          <span className="overview-item-value">{exam.examType}</span>
        </div>
        <div className="overview-item">
          <span className="overview-item-label">Class Level</span>
          <span className="overview-item-value">{classObj?.name || 'Class'}</span>
        </div>
        <div className="overview-item">
          <span className="overview-item-label">Section Group</span>
          <span className="overview-item-value">Section {secObj?.name || 'A'}</span>
        </div>
        <div className="overview-item">
          <span className="overview-item-label">Subject Roster</span>
          <span className="overview-item-value">{subObj?.name || 'General'}</span>
        </div>
        <div className="overview-item">
          <span className="overview-item-label">Evaluation Date</span>
          <span className="overview-item-value">{exam.examDate}</span>
        </div>
        <div className="overview-item">
          <span className="overview-item-label">Status</span>
          <span className={`badge badge-${exam.status === 'Completed' ? 'success' : exam.status === 'Published' ? 'info' : exam.status === 'Draft' ? 'warning' : 'danger'}`} style={{ alignSelf: 'flex-start', padding: '6px 12px' }}>
            {exam.status}
          </span>
        </div>
        <div className="overview-item">
          <span className="overview-item-label">Passing Criteria</span>
          <span className="overview-item-value" style={{ color: 'var(--success)' }}>
            {exam.passingMarks} / {exam.maxMarks} Marks ({Math.round((exam.passingMarks / exam.maxMarks) * 100)}%)
          </span>
        </div>
        <div className="overview-item" style={{ gridColumn: 'span 2' }}>
          <span className="overview-item-label">Syllabus Details</span>
          <span className="overview-item-value" style={{ fontWeight: 400, fontSize: '13px', color: 'var(--text-secondary)' }}>
            {exam.description || 'No exam description or syllabus topics listed.'}
          </span>
        </div>
      </div>
    );
  };

  // Teachers Tab
  const renderTeachersTab = (exam: Exam) => {
    // Find teacher assignments matching Class+Section+Subject
    const assignments = TEACHER_ASSIGNMENTS.filter(
      a => a.class_id === exam.classId && a.section_id === exam.sectionId && a.subject_id === exam.subjectId
    );

    return (
      <div>
        <h3 style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--text-primary)' }}>Assigned Subject Teachers</h3>
        {assignments.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
            No teachers assigned to this class-subject configuration.
          </div>
        ) : (
          assignments.map(asg => {
            const teacher = STAFF.find(s => s.id === asg.teacher_id);
            const subject = SUBJECTS.find(sub => sub.id === asg.subject_id);
            const markRec = marksRecords[exam.id];

            let submissionText = 'Not Started';
            let statusClass = 'danger';
            if (markRec) {
              submissionText = markRec.isDraft ? 'In Progress (Draft)' : 'Submitted & Finalized';
              statusClass = markRec.isDraft ? 'warning' : 'success';
            }

            return (
              <div className="teacher-item-card" key={asg.id}>
                <div>
                  <div className="teacher-item-name">{teacher ? `${teacher.name} ${teacher.surname}` : 'Unassigned Instructor'}</div>
                  <div className="teacher-item-subject">{subject?.name || 'General'}</div>
                </div>
                <div className="teacher-item-status-group">
                  <span className={`badge badge-${statusClass}`}>{submissionText}</span>
                  {markRec && !markRec.isDraft && (
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      On: {new Date(markRec.submittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  // Marks Tab
  const renderMarksTab = (exam: Exam) => {
    const studentList = STUDENTS.filter(
      s => s.class_id === exam.classId && s.grade_id === exam.sectionId && s.status === 'ACTIVE'
    );

    const markRec = marksRecords[exam.id];

    // If teacher is logged in, show input form
    if (currentRole === 'teacher') {
      const isCompleted = exam.status === 'Completed';

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="dashboard-card-title">Marks Score Sheet</span>
              <span className="dashboard-card-subtitle">Student roll-calls for Section {SECTIONS.find(s=>s.id === exam.sectionId)?.name || 'A'}</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Max Score: <strong style={{ color: 'var(--primary)' }}>{exam.maxMarks}</strong>
            </span>
          </div>

          {marksValidationErrors && (
            <div className="validation-alert">
              <AlertCircle size={16} />
              <span>{marksValidationErrors}</span>
            </div>
          )}

          <div className="drawer-table-wrapper">
            <table className="drawer-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th style={{ textAlign: 'center' }}>Score obtained</th>
                  <th>Evaluator Remarks</th>
                </tr>
              </thead>
              <tbody>
                {studentList.map(student => (
                  <tr key={student.id}>
                    <td style={{ fontWeight: 600 }}>{student.roll_number}</td>
                    <td>{student.name} {student.surname}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="text"
                        className={`marks-input ${
                          teacherMarksInput[student.id] !== '' &&
                          (isNaN(Number(teacherMarksInput[student.id])) ||
                            Number(teacherMarksInput[student.id]) < 0 ||
                            Number(teacherMarksInput[student.id]) > exam.maxMarks)
                            ? 'invalid'
                            : ''
                        }`}
                        placeholder="--"
                        value={teacherMarksInput[student.id] || ''}
                        disabled={isCompleted && !markRec?.isDraft}
                        onChange={e => handleMarkInputChange(student.id, e.target.value, exam.maxMarks)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        placeholder="Add teacher comment..."
                        value={teacherRemarksInput[student.id] || ''}
                        disabled={isCompleted && !markRec?.isDraft}
                        onChange={e => handleRemarksInputChange(student.id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!isCompleted || markRec?.isDraft) && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={marksSaving}
                onClick={() => handleMarksSubmit(true)}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={marksSaving || !!marksValidationErrors}
                onClick={() => handleMarksSubmit(false)}
              >
                {marksSaving ? 'Submitting...' : 'Finalize & Publish'}
              </button>
            </div>
          )}
        </div>
      );
    }

    // Admin view (Read-only list of grades)
    const marksCount = markRec ? Object.keys(markRec.marks).length : 0;
    const pendingCount = studentList.length - marksCount;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="marks-summary-grid">
          <div className="marks-summary-box">
            <div className="marks-summary-value" style={{ color: 'var(--primary)' }}>{studentList.length}</div>
            <div className="marks-summary-label">Class Size</div>
          </div>
          <div className="marks-summary-box">
            <div className="marks-summary-value" style={{ color: 'var(--success)' }}>{marksCount}</div>
            <div className="marks-summary-label">Scores Post</div>
          </div>
          <div className="marks-summary-box">
            <div className="marks-summary-value" style={{ color: 'var(--danger)' }}>{pendingCount}</div>
            <div className="marks-summary-label">Pending</div>
          </div>
        </div>

        <div className="drawer-table-wrapper">
          <table className="drawer-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Obtained Marks</th>
                <th>Pct</th>
                <th>Grade</th>
                <th>P/F</th>
              </tr>
            </thead>
            <tbody>
              {studentList.map(student => {
                const mark = markRec?.marks[student.id];

                return (
                  <tr key={student.id}>
                    <td style={{ fontWeight: 600 }}>{student.roll_number}</td>
                    <td>{student.name} {student.surname}</td>
                    <td style={{ fontWeight: 600 }}>
                      {mark ? `${mark.obtainedMarks} / ${exam.maxMarks}` : '—'}
                    </td>
                    <td>{mark ? `${mark.percentage}%` : '—'}</td>
                    <td style={{ fontWeight: 700 }}>{mark ? mark.grade : '—'}</td>
                    <td>
                      {mark ? (
                        <span className={`badge badge-${mark.passed ? 'success' : 'danger'}`}>
                          {mark.passed ? 'Pass' : 'Fail'}
                        </span>
                      ) : (
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Analytics Tab
  const renderAnalyticsTab = (exam: Exam) => {
    const markRec = marksRecords[exam.id];

    if (!markRec || Object.keys(markRec.marks).length === 0) {
      return (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 24px' }}>
          <TrendingDown size={32} style={{ marginBottom: '12px', color: 'var(--text-muted)' }} />
          <h3>No Analytics Available</h3>
          <p style={{ fontSize: '12px', marginTop: '6px' }}>Student marks have not been submitted or finalized yet for this exam.</p>
        </div>
      );
    }

    const marksArray = Object.values(markRec.marks);
    const submittedCount = marksArray.length;
    
    // Performance Math
    const scores = marksArray.map(m => m.obtainedMarks);
    const percentages = marksArray.map(m => m.percentage);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    
    const sumPercentage = percentages.reduce((a, b) => a + b, 0);
    const classAvgPct = Math.round(sumPercentage / submittedCount);
    
    const passedCount = marksArray.filter(m => m.passed).length;
    const passPercentage = Math.round((passedCount / submittedCount) * 100);

    // Top performers (sort descending by score)
    const topPerformers = [...marksArray]
      .sort((a, b) => b.obtainedMarks - a.obtainedMarks)
      .slice(0, 3)
      .map((m, idx) => {
        const studentObj = STUDENTS.find(s => s.id === m.studentId);
        return {
          rank: idx + 1,
          name: studentObj ? `${studentObj.name} ${studentObj.surname}` : 'Student',
          score: `${m.obtainedMarks}/${exam.maxMarks}`,
          grade: m.grade
        };
      });

    // Score distribution data mapping
    // Ranges: 0-39% (F), 40-59% (C/D), 60-79% (B/B+), 80-100% (A/A+)
    let distF = 0;
    let distCD = 0;
    let distBB = 0;
    let distAA = 0;

    percentages.forEach(pct => {
      if (pct < 40) distF++;
      else if (pct < 60) distCD++;
      else if (pct < 80) distBB++;
      else distAA++;
    });

    const chartData = [
      { name: '0-39% (F)', Count: distF },
      { name: '40-59% (C/D)', Count: distCD },
      { name: '60-79% (B/B+)', Count: distBB },
      { name: '80-100% (A/A+)', Count: distAA }
    ];

    return (
      <div className="analytics-section">
        {/* KPI metrics row */}
        <div className="analytics-stats-grid">
          <div className="analytics-stat-card">
            <div className="analytics-stat-value primary">{classAvgPct}%</div>
            <div className="analytics-stat-label">Class Average</div>
          </div>
          <div className="analytics-stat-card">
            <div className="analytics-stat-value success">{highest} / {exam.maxMarks}</div>
            <div className="analytics-stat-label">Highest Score</div>
          </div>
          <div className="analytics-stat-card">
            <div className="analytics-stat-value danger">{lowest} / {exam.maxMarks}</div>
            <div className="analytics-stat-label">Lowest Score</div>
          </div>
          <div className="analytics-stat-card">
            <div className="analytics-stat-value success">{passPercentage}%</div>
            <div className="analytics-stat-label">Pass Rate</div>
          </div>
        </div>

        {/* Top Performers Row */}
        <div>
          <div className="top-performers-title">Top 3 Class Performers</div>
          <div className="top-performers-grid">
            {topPerformers.map(p => (
              <div className="top-performer-card" key={p.rank}>
                <div className="top-performer-rank">Rank {p.rank}</div>
                <Award size={20} color="var(--primary)" style={{ marginTop: '10px' }} />
                <div className="top-performer-name">{p.name}</div>
                <div className="top-performer-score">{p.score}</div>
                <div className="top-performer-grade">Grade: {p.grade}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recharts chart */}
        <div>
          <div className="top-performers-title" style={{ marginBottom: '14px' }}>Marks Distribution Range</div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                />
                <Bar dataKey="Count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // --- Render Row for Exam Tables ---
  const renderRow = (exam: Exam) => {
    const classObj = CLASSES.find(c => c.id === exam.classId);
    const secObj = SECTIONS.find(s => s.id === exam.sectionId);
    const subObj = SUBJECTS.find(s => s.id === exam.subjectId);

    // Compute Marks Completion %
    const studentList = STUDENTS.filter(
      s => s.class_id === exam.classId && s.grade_id === exam.sectionId && s.status === 'ACTIVE'
    );
    const markRec = marksRecords[exam.id];
    const submitCount = markRec ? Object.keys(markRec.marks).length : 0;
    const completionPct = studentList.length > 0
      ? Math.round((submitCount / studentList.length) * 100)
      : 0;

    return (
      <tr key={exam.id} onClick={() => handleExamRowClick(exam)} style={{ cursor: 'pointer' }}>
        <td><div style={{ fontWeight: 600 }}>{exam.name}</div></td>
        <td>
          <span className="badge badge-primary">{exam.examType}</span>
        </td>
        <td>{classObj?.name || 'Class'}</td>
        <td>Section {secObj?.name || 'A'}</td>
        <td>{subObj?.name || 'General'}</td>
        <td>{exam.examDate}</td>
        <td style={{ textAlign: 'center' }}>{exam.maxMarks}</td>
        <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{exam.passingMarks}</td>
        <td>
          <span className={`badge badge-${exam.status === 'Completed' ? 'success' : exam.status === 'Published' ? 'info' : exam.status === 'Draft' ? 'warning' : 'danger'}`}>
            {exam.status}
          </span>
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="attendance-progress-bar-bg" style={{ flexGrow: 1, width: '60px', height: '6px' }}>
              <div
                className={`attendance-progress-bar-fill ${completionPct === 100 ? 'staff' : 'student'}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700 }}>{completionPct}%</span>
          </div>
        </td>
        <td>
          <div className="table-actions">
            {currentRole === 'admin' && (
              <>
                {(exam.status === 'Draft' || exam.status === 'Published') && (
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePublish(exam, e);
                    }}
                    title={exam.status === 'Draft' ? 'Publish Exam' : 'Archive Exam'}
                  >
                    <CheckCircle size={14} color={exam.status === 'Draft' ? 'var(--success)' : 'var(--text-secondary)'} />
                  </button>
                )}
                <button className="btn-icon" onClick={(e) => handleOpenEdit(exam, e)}>
                  <Edit2 size={14} />
                </button>
                <button className="btn-icon btn-icon-danger" onClick={(e) => handleOpenDelete(exam, e)}>
                  <Trash2 size={14} />
                </button>
              </>
            )}
            {currentRole === 'teacher' && (!markRec || markRec.isDraft) && (
              <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={(e) => { e.stopPropagation(); handleExamRowClick(exam); }}>
                Post Marks
              </button>
            )}
            {((currentRole === 'teacher' && markRec && !markRec.isDraft) || currentRole === 'student' || currentRole === 'parent') && (
              <button className="btn btn-icon" onClick={(e) => { e.stopPropagation(); handleExamRowClick(exam); }}>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // --- Render Portals for Students & Parents ---
  const renderStudentPortalView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h1>My Academic Grades & Results</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Term exams achievements and subject-wise score cards.</p>
        </div>

        {/* Student KPIs */}
        {studentMetrics && (
          <div className="exams-kpi-grid">
            <div className="exams-kpi-card">
              <div className="exams-kpi-icon primary">
                <FileText size={20} />
              </div>
              <div className="exams-kpi-info">
                <span className="exams-kpi-value">{studentMetrics.taken}</span>
                <span className="exams-kpi-label">Exams Completed</span>
              </div>
            </div>
            <div className="exams-kpi-card">
              <div className="exams-kpi-icon success">
                <Award size={20} />
              </div>
              <div className="exams-kpi-info">
                <span className="exams-kpi-value">{studentMetrics.passed}</span>
                <span className="exams-kpi-label">Passing Exams</span>
              </div>
            </div>
            <div className="exams-kpi-card">
              <div className="exams-kpi-icon info">
                <Percent size={20} />
              </div>
              <div className="exams-kpi-info">
                <span className="exams-kpi-value">{studentMetrics.avgPercentage}%</span>
                <span className="exams-kpi-label">Average Score</span>
              </div>
            </div>
            <div className="exams-kpi-card">
              <div className="exams-kpi-icon warning">
                <TrendingUp size={20} />
              </div>
              <div className="exams-kpi-info">
                <span className="exams-kpi-value">{studentMetrics.passRate}%</span>
                <span className="exams-kpi-label">Pass Percentage</span>
              </div>
            </div>
          </div>
        )}

        <div className="portal-card">
          <div className="portal-student-title">Subject-Wise Evaluation Grades</div>
          {examsForRole.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
              No completed exam results published for your section yet.
            </div>
          ) : (
            <div className="portal-marks-grid">
              {examsForRole.map(exam => {
                const mark = marksRecords[exam.id]?.marks[currentUserId];
                const subObj = SUBJECTS.find(sub => sub.id === exam.subjectId);
                if (!mark) return null;

                return (
                  <div className="portal-mark-card" key={exam.id}>
                    <div className="portal-mark-header">
                      <div>
                        <div className="portal-mark-subject">{subObj?.name || 'General'}</div>
                        <div className="portal-mark-exam-name">{exam.name}</div>
                      </div>
                      <div className={`portal-mark-grade-badge ${mark.passed ? 'pass' : 'fail'}`}>
                        {mark.grade}
                      </div>
                    </div>

                    <div className="portal-mark-scores-row">
                      <div className="portal-mark-score-box">
                        <span className="portal-mark-score-value">{mark.obtainedMarks} / {exam.maxMarks}</span>
                        <span className="portal-mark-score-label">Score Dues</span>
                      </div>
                      <div className="portal-mark-score-box">
                        <span className="portal-mark-score-value">{mark.percentage}%</span>
                        <span className="portal-mark-score-label">Percentage</span>
                      </div>
                    </div>

                    <div className="portal-mark-footer">
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Exam Date: {exam.examDate}
                      </span>
                      <span className={`portal-mark-status-badge ${mark.passed ? 'passed' : 'failed'}`}>
                        {mark.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    {mark.remarks && (
                      <div style={{ marginTop: '4px', fontSize: '11.5px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', color: 'var(--text-secondary)' }}>
                        <strong>Remarks:</strong> {mark.remarks}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderParentPortalView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1>Ward Evaluation Grades Portal</h1>
            <p style={{ color: 'var(--text-secondary)' }}>View examination results and performance reports for your children.</p>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              className="form-select"
              style={{ minWidth: '180px' }}
              value={selectedChildId}
              onChange={e => setSelectedChildId(e.target.value)}
            >
              {parentChildren.map(c => (
                <option key={c.id} value={c.id}>
                  Child: {c.name} {c.surname}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parent KPIs */}
        {parentMetrics && selectedChild && (
          <div className="exams-kpi-grid">
            <div className="exams-kpi-card">
              <div className="exams-kpi-icon primary">
                <FileText size={20} />
              </div>
              <div className="exams-kpi-info">
                <span className="exams-kpi-value">{parentMetrics.taken}</span>
                <span className="exams-kpi-label">Completed Exams</span>
              </div>
            </div>
            <div className="exams-kpi-card">
              <div className="exams-kpi-icon success">
                <Award size={20} />
              </div>
              <div className="exams-kpi-info">
                <span className="exams-kpi-value">{parentMetrics.passed}</span>
                <span className="exams-kpi-label">Passing Exams</span>
              </div>
            </div>
            <div className="exams-kpi-card">
              <div className="exams-kpi-icon info">
                <Percent size={20} />
              </div>
              <div className="exams-kpi-info">
                <span className="exams-kpi-value">{parentMetrics.avgPercentage}%</span>
                <span className="exams-kpi-label">Wards Avg score</span>
              </div>
            </div>
            <div className="exams-kpi-card">
              <div className="exams-kpi-icon warning">
                <TrendingUp size={20} />
              </div>
              <div className="exams-kpi-info">
                <span className="exams-kpi-value">{parentMetrics.passRate}%</span>
                <span className="exams-kpi-label">Pass Percentage</span>
              </div>
            </div>
          </div>
        )}

        <div className="portal-card">
          <div className="portal-student-title">
            Academic Reports: {selectedChild ? `${selectedChild.name} ${selectedChild.surname}` : 'Select Child'}
          </div>
          {!selectedChild ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
              Select a child from the dropdown to check grades.
            </div>
          ) : examsForRole.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
              No completed exam results published for your child's section yet.
            </div>
          ) : (
            <div className="portal-marks-grid">
              {examsForRole.map(exam => {
                const mark = marksRecords[exam.id]?.marks[selectedChild.id];
                const subObj = SUBJECTS.find(sub => sub.id === exam.subjectId);
                if (!mark) return null;

                return (
                  <div className="portal-mark-card" key={exam.id}>
                    <div className="portal-mark-header">
                      <div>
                        <div className="portal-mark-subject">{subObj?.name || 'General'}</div>
                        <div className="portal-mark-exam-name">{exam.name}</div>
                      </div>
                      <div className={`portal-mark-grade-badge ${mark.passed ? 'pass' : 'fail'}`}>
                        {mark.grade}
                      </div>
                    </div>

                    <div className="portal-mark-scores-row">
                      <div className="portal-mark-score-box">
                        <span className="portal-mark-score-value">{mark.obtainedMarks} / {exam.maxMarks}</span>
                        <span className="portal-mark-score-label">Obtained</span>
                      </div>
                      <div className="portal-mark-score-box">
                        <span className="portal-mark-score-value">{mark.percentage}%</span>
                        <span className="portal-mark-score-label">Percentage</span>
                      </div>
                    </div>

                    <div className="portal-mark-footer">
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Exam Date: {exam.examDate}
                      </span>
                      <span className={`portal-mark-status-badge ${mark.passed ? 'passed' : 'failed'}`}>
                        {mark.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    {mark.remarks && (
                      <div style={{ marginTop: '4px', fontSize: '11.5px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', color: 'var(--text-secondary)' }}>
                        <strong>Remarks:</strong> {mark.remarks}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Master Rendering Route ---
  if (currentRole === 'student') return renderStudentPortalView();
  if (currentRole === 'parent') return renderParentPortalView();

  // Admin & Teacher Layout
  const tableColumns = [
    { header: 'Exam Name', accessor: 'name' },
    { header: 'Exam Type', accessor: 'examType' },
    { header: 'Class', accessor: 'classId' },
    { header: 'Section', accessor: 'sectionId' },
    { header: 'Subject', accessor: 'subjectId' },
    { header: 'Exam Date', accessor: 'examDate' },
    { header: 'Max Marks', accessor: 'maxMarks', className: 'hidden md:table-cell' },
    { header: 'Passing Marks', accessor: 'passingMarks', className: 'hidden md:table-cell' },
    { header: 'Status', accessor: 'status' },
    { header: 'Marks Completion %', accessor: 'completion' },
    { header: 'Actions', accessor: 'actions' }
  ];

  return (
    <div className="exams-container">
      {/* Upper header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Exam & Grades Administration</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create examination structures, manage schedules, and record marks sheet evaluations.</p>
        </div>
        {currentRole === 'admin' && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} />
            <span>Add Exam</span>
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="exams-kpi-grid">
        <div className="exams-kpi-card">
          <div className="exams-kpi-icon primary">
            <FileText size={20} />
          </div>
          <div className="exams-kpi-info">
            <span className="exams-kpi-value">{kpiMetrics.total}</span>
            <span className="exams-kpi-label">Total Exams</span>
          </div>
        </div>

        <div className="exams-kpi-card">
          <div className="exams-kpi-icon info">
            <Calendar size={20} />
          </div>
          <div className="exams-kpi-info">
            <span className="exams-kpi-value">{kpiMetrics.upcoming}</span>
            <span className="exams-kpi-label">Upcoming Exams</span>
          </div>
        </div>

        <div className="exams-kpi-card">
          <div className="exams-kpi-icon primary">
            <CheckCircle size={20} />
          </div>
          <div className="exams-kpi-info">
            <span className="exams-kpi-value">{kpiMetrics.published}</span>
            <span className="exams-kpi-label">Published Exams</span>
          </div>
        </div>

        <div className="exams-kpi-card">
          <div className="exams-kpi-icon warning">
            <Clock size={20} />
          </div>
          <div className="exams-kpi-info">
            <span className="exams-kpi-value">{kpiMetrics.pendingSubmission}</span>
            <span className="exams-kpi-label">Pending Marks Submission</span>
          </div>
        </div>

        <div className="exams-kpi-card">
          <div className="exams-kpi-icon success">
            <UserCheck size={20} />
          </div>
          <div className="exams-kpi-info">
            <span className="exams-kpi-value">{kpiMetrics.resultsPublished}</span>
            <span className="exams-kpi-label">Results Published</span>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="exams-filters-card">
        <div className="exams-search-row">
          <div className="exams-search-box">
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="search-input"
              style={{ paddingLeft: 40, width: '100%' }}
              placeholder="Search exams or subjects..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="exams-dropdowns-row">
          {/* Year Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="overview-item-label" style={{ fontSize: '10px' }}>Academic Year</label>
            <select className="form-select" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={yearFilter} onChange={e => { setYearFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">All Years</option>
              {uniqueAcademicYears.map(y => <option key={y} value={y}>{y === 'ay-2026' ? '2026-27' : '2025-26'}</option>)}
            </select>
          </div>

          {/* Class Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="overview-item-label" style={{ fontSize: '10px' }}>Class</label>
            <select className="form-select" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={classFilter} onChange={e => { setClassFilter(e.target.value); setSectionFilter('All'); setCurrentPage(1); }}>
              <option value="All">All Classes</option>
              {classOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Section Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="overview-item-label" style={{ fontSize: '10px' }}>Section</label>
            <select className="form-select" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={sectionFilter} onChange={e => { setSectionFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">All Sections</option>
              {sectionOptions.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="overview-item-label" style={{ fontSize: '10px' }}>Subject</label>
            <select className="form-select" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={subjectFilter} onChange={e => { setSubjectFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">All Subjects</option>
              {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Type Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="overview-item-label" style={{ fontSize: '10px' }}>Exam Type</label>
            <select className="form-select" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">All Types</option>
              <option value="Unit Test">Unit Test</option>
              <option value="Monthly Test">Monthly Test</option>
              <option value="Quarterly Exam">Quarterly Exam</option>
              <option value="Half Yearly Exam">Half Yearly Exam</option>
              <option value="Pre-Final Exam">Pre-Final Exam</option>
              <option value="Annual Exam">Annual Exam</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="overview-item-label" style={{ fontSize: '10px' }}>Status</label>
            <select className="form-select" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="table-card">
        <div className="custom-table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                {tableColumns.map((col, idx) => (
                  <th key={idx} className={col.className}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedExams.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                    No examinations match the selected filter configuration.
                  </td>
                </tr>
              ) : (
                paginatedExams.map(exam => renderRow(exam))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredExams.length)} of {filteredExams.length}
            </span>
            <div className="pagination-buttons">
              <button
                className="btn btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT / DELETE MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className={`modal-content ${modalType === 'delete' ? 'confirm' : ''}`}>
            <div className="modal-header">
              <h2>
                {modalType === 'create' ? 'Register New Exam' : modalType === 'edit' ? 'Modify Exam Structure' : 'Remove Examination'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: '24px' }}>
                  Are you sure you want to delete the exam <strong>{selectedExam?.name}</strong>? All student marks evaluations recorded under this structure will be cascadingly deleted. This operation is irreversible.
                </p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" disabled={saving} onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" disabled={saving} onClick={handleDeleteSubmit}>
                    {saving ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit}>
                <div className="form-grid">
                  {/* Academic Year */}
                  <div className="form-group">
                    <label className="form-label">Academic Year</label>
                    <select className="form-select" value={formYear} onChange={e => setFormYear(e.target.value)} required>
                      <option value="ay-2026">2026-27 (Active)</option>
                      <option value="ay-2025">2025-26 (Inactive)</option>
                    </select>
                  </div>

                  {/* Exam Name */}
                  <div className="form-group">
                    <label className="form-label">Exam Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formName}
                      placeholder="e.g. Midterm Physics"
                      required
                      onChange={e => setFormName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  {/* Exam Type */}
                  <div className="form-group">
                    <label className="form-label">Exam Type</label>
                    <select className="form-select" value={formType} onChange={e => setFormType(e.target.value as Exam['examType'])} required>
                      <option value="Unit Test">Unit Test</option>
                      <option value="Monthly Test">Monthly Test</option>
                      <option value="Quarterly Exam">Quarterly Exam</option>
                      <option value="Half Yearly Exam">Half Yearly Exam</option>
                      <option value="Pre-Final Exam">Pre-Final Exam</option>
                      <option value="Annual Exam">Annual Exam</option>
                    </select>
                  </div>

                  {/* Class */}
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select className="form-select" value={formClass} onChange={e => setFormClass(e.target.value)} required>
                      {CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  {/* Section */}
                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <select className="form-select" value={formSection} onChange={e => setFormSection(e.target.value)} required>
                      {SECTIONS.filter(s => s.class_id === formClass).map(s => (
                        <option key={s.id} value={s.id}>Section {s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <select className="form-select" value={formSubject} onChange={e => setFormSubject(e.target.value)} required>
                      {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  {/* Exam Date */}
                  <div className="form-group">
                    <label className="form-label">Exam Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formDate}
                      required
                      onChange={e => setFormDate(e.target.value)}
                    />
                  </div>

                  {/* Status */}
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={formStatus} onChange={e => setFormStatus(e.target.value as Exam['status'])} required>
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Completed">Completed</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  {/* Max Marks */}
                  <div className="form-group">
                    <label className="form-label">Maximum Marks</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={formMaxMarks}
                      required
                      onChange={e => setFormMaxMarks(Number(e.target.value))}
                    />
                  </div>

                  {/* Passing Marks */}
                  <div className="form-group">
                    <label className="form-label">Passing Marks</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={formPassMarks}
                      required
                      onChange={e => setFormPassMarks(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Syllabus / Description</label>
                  <textarea
                    className="form-input"
                    style={{ height: '70px', resize: 'none' }}
                    value={formDesc}
                    placeholder="Provide evaluation descriptors..."
                    onChange={e => setFormDesc(e.target.value)}
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Exam'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* SIDE DRAWER ELEMENT */}
      {drawerOpen && drawerExam && (
        <div className="exams-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="exams-drawer" onClick={e => e.stopPropagation()}>
            <div className="exams-drawer-header">
              <div className="exams-drawer-title-group">
                <span className="exams-drawer-title">{drawerExam.name}</span>
                <span className="exams-drawer-subtitle">
                  {CLASSES.find(c => c.id === drawerExam.classId)?.name || 'Class'} — Section {SECTIONS.find(s => s.id === drawerExam.sectionId)?.name || 'A'}
                </span>
              </div>
              <button className="modal-close" onClick={() => setDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="exams-drawer-tabs">
              <button
                className={`exams-drawer-tab ${drawerActiveTab === 'overview' ? 'active' : ''}`}
                onClick={() => setDrawerActiveTab('overview')}
              >
                Overview
              </button>
              
              <button
                className={`exams-drawer-tab ${drawerActiveTab === 'teachers' ? 'active' : ''}`}
                onClick={() => setDrawerActiveTab('teachers')}
              >
                Teachers
              </button>
              
              <button
                className={`exams-drawer-tab ${drawerActiveTab === 'marks' ? 'active' : ''}`}
                onClick={() => setDrawerActiveTab('marks')}
              >
                Marks Sheet
              </button>
              
              <button
                className={`exams-drawer-tab ${drawerActiveTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setDrawerActiveTab('analytics')}
              >
                Performance Analytics
              </button>
            </div>

            {/* Tab Render Bodies */}
            <div className="exams-drawer-body">
              {drawerActiveTab === 'overview' && renderOverviewTab(drawerExam)}
              {drawerActiveTab === 'teachers' && renderTeachersTab(drawerExam)}
              {drawerActiveTab === 'marks' && renderMarksTab(drawerExam)}
              {drawerActiveTab === 'analytics' && renderAnalyticsTab(drawerExam)}
            </div>

            <div className="exams-drawer-footer">
              <button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
