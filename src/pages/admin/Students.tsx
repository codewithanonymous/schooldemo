import React, { useState, useEffect, useMemo } from 'react';
import { genId } from '../../data/mockData';
import { 
  CLASSES, 
  SECTIONS, 
  STUDENTS as initialStudents, 
  STUDENT_LEDGER,
  saveAcademicState,
  recalculateStudentLedger
} from '../../data/academicMockData';
import { 
  PARENTS, 
  STUDENT_DETAILS_MAP 
} from '../../data/studentDetailsMockData';
import { Student, Parent, StudentFullDetails } from '../../types/student';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Eye, 
  Calendar, 
  DollarSign, 
  User, 
  BookOpen, 
  AlertCircle, 
  Clock, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Edit,
  Save,
  FileText
} from 'lucide-react';
import './Students.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyForm = () => ({
  username: '', 
  password: '', 
  name: '', 
  surname: '',
  email: '' as string | null, 
  phone: '' as string | null, 
  address: '',
  blood_type: 'A+', 
  sex: 'MALE' as 'MALE' | 'FEMALE', 
  birthday: '',
  parent_id: PARENTS[0]?.id ?? '', 
  class_id: CLASSES[0]?.id ?? '', 
  grade_id: (SECTIONS.filter(s => s.class_id === CLASSES[0]?.id)[0]?.id ?? '') as string | undefined
});

const Students: React.FC = () => {
  // --- Standard States ---
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // --- Navigation & Pagination ---
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 6;

  // --- Filtering States (Preserved in sessionStorage) ---
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return sessionStorage.getItem('erp_student_filter_class') || 'All';
  });
  const [selectedSection, setSelectedSection] = useState<string>(() => {
    return sessionStorage.getItem('erp_student_filter_section') || 'All';
  });
  const [searchRoll, setSearchRoll] = useState<string>(() => {
    return sessionStorage.getItem('erp_student_filter_roll') || '';
  });
  const [searchName, setSearchName] = useState<string>(() => {
    return sessionStorage.getItem('erp_student_filter_name') || '';
  });

  // --- Details Drawer & Tab States ---
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'academic' | 'financial'>('academic');
  
  // --- Inline Credentials Edit States ---
  const [isEditingCreds, setIsEditingCreds] = useState<boolean>(false);
  const [credUsername, setCredUsername] = useState<string>('');
  const [credEmail, setCredEmail] = useState<string>('');

  // --- Original Modal CRUD States ---
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete'>('create');
  const [selected, setSelected] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState<boolean>(false);

  // --- UPI Receipt Zoom State ---
  const [zoomReceiptUrl, setZoomReceiptUrl] = useState<string | null>(null);

  // --- Simulate Initial Page Load with Shimmer Skeletons ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // --- Save filters to sessionStorage on change ---
  useEffect(() => {
    sessionStorage.setItem('erp_student_filter_class', selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    sessionStorage.setItem('erp_student_filter_section', selectedSection);
  }, [selectedSection]);

  useEffect(() => {
    sessionStorage.setItem('erp_student_filter_roll', searchRoll);
  }, [searchRoll]);

  useEffect(() => {
    sessionStorage.setItem('erp_student_filter_name', searchName);
  }, [searchName]);

  // --- Reactive Sections Dropdown Helper ---
  const availableSections = useMemo(() => {
    if (selectedClass === 'All') {
      return SECTIONS;
    }
    return SECTIONS.filter(s => s.class_id === selectedClass);
  }, [selectedClass]);

  // Reset section filter if it's no longer available under the selected class
  useEffect(() => {
    if (selectedSection !== 'All' && !availableSections.some(sec => sec.id === selectedSection)) {
      setSelectedSection('All');
    }
  }, [selectedClass, availableSections, selectedSection]);

  // --- Reset All Filters Helper ---
  const handleClearFilters = () => {
    setSelectedClass('All');
    setSelectedSection('All');
    setSearchRoll('');
    setSearchName('');
    setCurrentPage(1);
  };

  // --- Simulate Reload Helper ---
  const handleReload = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  // --- Trigger Simulated Database Error (for Demonstration) ---
  const handleTriggerError = () => {
    setError('Database Connection Interrupted. Unable to fetch student ledger from Supabase replica.');
  };

  // --- Combined Filtering Logic ---
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Class match
      if (selectedClass !== 'All') {
        if (s.class_id !== selectedClass) return false;
      }

      // Section match
      if (selectedSection !== 'All') {
        if (s.grade_id !== selectedSection) return false;
      }

      // Roll Number match
      if (searchRoll.trim() !== '') {
        if (!s.roll_number.toLowerCase().includes(searchRoll.toLowerCase())) {
          return false;
        }
      }

      // Name search (checks name, surname, or username)
      if (searchName.trim() !== '') {
        const query = searchName.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(query);
        const matchesSurname = s.surname.toLowerCase().includes(query);
        const matchesUsername = s.username.toLowerCase().includes(query);
        if (!matchesName && !matchesSurname && !matchesUsername) {
          return false;
        }
      }

      return true;
    });
  }, [students, selectedClass, selectedSection, searchRoll, searchName]);

  // --- Pagination Slice ---
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = useMemo(() => {
    return filteredStudents.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  }, [filteredStudents, pageStart, ITEMS_PER_PAGE]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedSection, searchRoll, searchName]);

  // --- Drawer Open Handler ---
  const handleRowClick = (student: Student, e: React.MouseEvent) => {
    // Prevent drawer trigger if they click action buttons
    const target = e.target as HTMLElement;
    if (target.closest('.table-actions') || target.closest('button')) {
      return;
    }
    
    setSelectedStudent(student);
    setCredUsername(student.username);
    setCredEmail(student.email ?? '');
    setIsEditingCreds(false);
    setActiveTab('academic');
    setDrawerOpen(true);
  };

  // --- Inline Credentials Save Handler ---
  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    // Update in local students list state
    setStudents(prev => prev.map(s => {
      if (s.id === selectedStudent.id) {
        const updated = { ...s, username: credUsername, email: credEmail };
        // Sync selectedStudent state too
        setSelectedStudent(updated);
        return updated;
      }
      return s;
    }));

    setIsEditingCreds(false);
  };

  // --- Parent Info Lookup Helper ---
  const parentDetails = useMemo<Parent | null>(() => {
    if (!selectedStudent) return null;
    const parent = PARENTS.find(p => p.id === selectedStudent.parent_id);
    return (parent as Parent) || null;
  }, [selectedStudent]);

  // --- Academic & Financial Details Lookup Helper ---
  const fullDetails = useMemo<StudentFullDetails | null>(() => {
    if (!selectedStudent) return null;
    const baseDetails = STUDENT_DETAILS_MAP[selectedStudent.id];
    const ledger = STUDENT_LEDGER[selectedStudent.id];
    if (!baseDetails && !ledger) return null;

    return {
      studentId: selectedStudent.id,
      attendance: baseDetails?.attendance || [],
      marks: baseDetails?.marks || [],
      feeSummary: ledger ? {
        totalFee: ledger.totalFee,
        paidAmount: ledger.paidAmount,
        pendingAmount: ledger.pendingAmount,
        overdueAmount: ledger.overdueAmount
      } : (baseDetails?.feeSummary || { totalFee: 0, paidAmount: 0, pendingAmount: 0, overdueAmount: 0 }),
      payments: ledger?.payments || baseDetails?.payments || []
    };
  }, [selectedStudent, STUDENT_LEDGER]);

  // --- Attendance metrics helper ---
  const attendanceMetrics = useMemo(() => {
    if (!fullDetails || !fullDetails.attendance.length) {
      return { total: 0, present: 0, absent: 0, percentage: '0%' };
    }
    const att = fullDetails.attendance;
    const total = att.length;
    const present = att.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const absent = att.filter(r => r.status === 'ABSENT').length;
    const percentage = ((present / total) * 100).toFixed(1) + '%';
    return { total, present, absent, percentage };
  }, [fullDetails]);

  // --- Marks summary helper ---
  const marksSummary = useMemo(() => {
    if (!fullDetails || !fullDetails.marks.length) {
      return { totalMarks: 0, avgPercentage: '0%', rank: 'N/A' };
    }
    const marks = fullDetails.marks.filter(m => m.exam === 'Final Exam');
    if (!marks.length) return { totalMarks: 0, avgPercentage: '0%', rank: 'N/A' };
    
    const totalMarks = marks.reduce((sum, m) => sum + m.marksObtained, 0);
    const maxPossible = marks.reduce((sum, m) => sum + m.maxMarks, 0);
    const avgPercentage = ((totalMarks / maxPossible) * 100).toFixed(1) + '%';
    
    // Deterministic mock class rank
    const studentIdx = students.findIndex(s => s.id === selectedStudent?.id);
    const rank = `${(studentIdx % 3) + 1} / ${students.length}`;

    return { totalMarks, avgPercentage, rank };
  }, [fullDetails, selectedStudent, students]);

  // --- original CRUD CRUD handlers ---
  const openCreate = () => { 
    setModalType('create'); 
    setSelected(null); 
    setForm(emptyForm()); 
    setShowModal(true); 
  };

  const openEdit = (s: Student) => {
    setModalType('edit'); 
    setSelected(s);
    setForm({ 
      ...s, 
      password: '', 
      parent_id: s.parent_id ?? '', 
      class_id: s.class_id ?? '', 
      grade_id: s.grade_id ?? '' 
    });
    setShowModal(true);
  };

  const openDelete = (s: Student) => { 
    setModalType('delete'); 
    setSelected(s); 
    setShowModal(true); 
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'class_id') {
        const classSections = SECTIONS.filter(s => s.class_id === value);
        next.grade_id = classSections[0]?.id ?? '';
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    
    if (modalType === 'create') {
      const nextIndex = initialStudents.length + 1;
      const admNum = "ADM2026" + String(nextIndex).padStart(3, "0");
      const dobFormatted = form.birthday ? form.birthday.split('-').reverse().join('') : '01012015';
      const fName = form.name ? form.name.split(' ')[0] : 'Student';
      const autoPassword = fName + dobFormatted;

      const newStudent: Student = { 
        ...form, 
        id: genId('std'), 
        sex: form.sex as 'MALE' | 'FEMALE',
        roll_number: String(nextIndex).padStart(2, "0"),
        admission_number: admNum,
        username: admNum,
        password: autoPassword,
        admission_date: new Date().toISOString().split('T')[0],
        status: 'ACTIVE'
      };
      initialStudents.push(newStudent);
      saveAcademicState();
      recalculateStudentLedger(newStudent.id);
      setStudents([...initialStudents]);
      
      // Auto populate student details details so drawer can open for it
      STUDENT_DETAILS_MAP[newStudent.id] = {
        studentId: newStudent.id,
        attendance: [],
        marks: [],
        feeSummary: { totalFee: 48000, paidAmount: 0, pendingAmount: 48000, overdueAmount: 0 },
        payments: []
      };
    } else if (modalType === 'edit' && selected) {
      const idx = initialStudents.findIndex(s => s.id === selected.id);
      if (idx !== -1) {
        initialStudents[idx] = { ...initialStudents[idx], ...form };
        saveAcademicState();
        recalculateStudentLedger(selected.id);
        setStudents([...initialStudents]);
      }
    }
    setSaving(false); 
    setShowModal(false);
  };

  const handleDelete = async () => {
    setSaving(true); 
    await new Promise(r => setTimeout(r, 300));
    const idx = initialStudents.findIndex(s => s.id === selected?.id);
    if (idx !== -1) {
      initialStudents.splice(idx, 1);
      saveAcademicState();
    }
    setStudents([...initialStudents]);
    setSaving(false); 
    setShowModal(false);
  };

  // --- Table Column Mapping ---
  const columns = [
    { header: 'Roll No', accessor: 'roll_number' },
    { header: 'Admission No', accessor: 'admission_number', className: 'hidden md:table-cell' },
    { header: 'Student Name', accessor: 'name' },
    { header: 'Class', accessor: 'class_id' },
    { header: 'Section', accessor: 'grade_id' },
    { header: 'Gender', accessor: 'sex', className: 'hidden md:table-cell' },
    { header: 'Parent Phone', accessor: 'parent_phone', className: 'hidden lg:table-cell' },
    { header: 'Status', accessor: 'status' },
    { header: 'Actions', accessor: 'actions' },
  ];

  // --- Custom Table Row Renderer ---
  const renderRow = (s: Student) => {
    const cls = CLASSES.find(c => c.id === s.class_id);
    const sec = SECTIONS.find(sec => sec.id === s.grade_id);
    const parent = PARENTS.find(p => p.id === s.parent_id);

    return (
      <tr 
        key={s.id} 
        className="erp-row-clickable"
        onClick={(e) => handleRowClick(s, e)}
      >
        <td>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.roll_number}</span>
        </td>
        <td className="hidden md:table-cell">
          <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{s.admission_number}</span>
        </td>
        <td>
          <div className="table-avatar-cell">
            <div className="table-avatar">{s.name[0]}{s.surname?.[0] ?? ''}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{s.name} {s.surname}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.email ?? 'No email'}</div>
            </div>
          </div>
        </td>
        <td>
          <span className="badge badge-primary" style={{ fontWeight: 600 }}>
            {cls ? cls.name : '—'}
          </span>
        </td>
        <td>
          <span className="badge badge-secondary" style={{ fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
            {sec ? `Sec ${sec.name}` : '—'}
          </span>
        </td>
        <td className="hidden md:table-cell">
          <span className={`badge ${s.sex === 'MALE' ? 'badge-primary' : 'badge-danger'}`} style={{ fontSize: 11 }}>
            {s.sex}
          </span>
        </td>
        <td className="hidden lg:table-cell">
          {parent ? parent.phone : '—'}
        </td>
        <td>
          <span className={`status-pill ${s.status.toLowerCase()}`}>
            {s.status}
          </span>
        </td>
        <td>
          <div className="table-actions">
            <button 
              className="btn-icon" 
              onClick={() => openEdit(s)} 
              title="Edit Profile"
            >
              <Edit2 size={13} />
            </button>
            <button 
              className="btn-icon btn-icon-danger" 
              onClick={() => openDelete(s)} 
              title="Delete Enrollment"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Student Management ERP</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Administer student directory profiles, academic performances, and fee financials.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={handleReload} title="Refresh replica dataset">
            <RefreshCw size={16} /> <span>Refresh</span>
          </button>
          <button className="btn btn-secondary" style={{ borderColor: 'var(--danger-light)', color: 'var(--danger)' }} onClick={handleTriggerError} title="Simulate DB disconnection">
            <AlertCircle size={16} /> <span>Demo Error</span>
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} /> <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Advanced Filtering Card */}
      <div className="filters-grid">
        {/* Class Filter */}
        <div className="filter-group">
          <label className="filter-label">Class</label>
          <select 
            className="filter-select" 
            value={selectedClass} 
            onChange={(e) => { setSelectedClass(e.target.value); setCurrentPage(1); }}
          >
            <option value="All">All Classes</option>
            {CLASSES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Section Filter (reactive) */}
        <div className="filter-group">
          <label className="filter-label">Section</label>
          <select 
            className="filter-select" 
            value={selectedSection} 
            onChange={(e) => { setSelectedSection(e.target.value); setCurrentPage(1); }}
          >
            <option value="All">All Sections</option>
            {availableSections.map(sec => (
              <option key={sec.id} value={sec.id}>Section {sec.name}</option>
            ))}
          </select>
        </div>

        {/* Roll Number Search */}
        <div className="filter-group">
          <label className="filter-label">Roll Number</label>
          <input 
            className="filter-input" 
            placeholder="e.g. R-101" 
            value={searchRoll} 
            onChange={(e) => { setSearchRoll(e.target.value); setCurrentPage(1); }} 
          />
        </div>

        {/* Name / Username Search */}
        <div className="filter-group">
          <label className="filter-label">Name Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="filter-input" 
              style={{ paddingLeft: 34, width: '100%' }} 
              placeholder="Search by name or username..." 
              value={searchName} 
              onChange={(e) => { setSearchName(e.target.value); setCurrentPage(1); }} 
            />
          </div>
        </div>

        {/* Actions Group */}
        <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Database Error State Banner */}
      {error && (
        <div style={{ display: 'flex', gap: 16, backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: 16, alignItems: 'center' }}>
          <AlertCircle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--danger)' }}>Database Offline / Query Failure</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{error}</div>
          </div>
          <button className="btn btn-secondary" style={{ borderColor: 'var(--danger)', color: 'var(--text-primary)' }} onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Main Student Directory Table Card */}
      <div className="table-card">
        {loading ? (
          /* Premium Shimmer Loading State */
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className="skeleton-avatar" />
                  <div className="skeleton-line" style={{ width: '15%' }} />
                  <div className="skeleton-line" style={{ width: '25%' }} />
                  <div className="skeleton-line" style={{ width: '10%' }} />
                  <div className="skeleton-line" style={{ width: '15%' }} />
                  <div className="skeleton-line" style={{ width: '15%' }} />
                  <div className="skeleton-line" style={{ width: '10%' }} />
                </div>
              ))}
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          /* Enhanced Empty State */
          <div className="erp-empty-state">
            <div className="erp-empty-icon">
              <Search size={40} />
            </div>
            <div>
              <h2>No Students Found</h2>
              <p style={{ marginTop: 6, fontSize: 14 }}>
                We couldn't find any student matching your filtering preferences.
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleClearFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          /* Data Table */
          <div className="erp-table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.accessor} className={col.className}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => renderRow(item))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {!loading && filteredStudents.length > 0 && (
          <div className="pagination">
            <span className="pagination-info">
              Showing <strong>{pageStart + 1}</strong> – <strong>{Math.min(pageStart + ITEMS_PER_PAGE, filteredStudents.length)}</strong> of <strong>{filteredStudents.length}</strong> students
            </span>
            {totalPages > 1 && (
              <div className="pagination-buttons">
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px' }}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px' }}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Side Slide-Over Drawer for Student Profile */}
      <div 
        className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`} 
        onClick={() => setDrawerOpen(false)}
      />
      <div className={`drawer-panel ${drawerOpen ? 'open' : ''}`}>
        {selectedStudent && (
          <>
            {/* Drawer Header */}
            <div className="drawer-header">
              <div className="drawer-title-area">
                <div className="drawer-avatar">
                  {selectedStudent.name[0]}{selectedStudent.surname?.[0] ?? ''}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                    {selectedStudent.name} {selectedStudent.surname}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span className="status-pill active" style={{ fontSize: 10 }}>
                      {CLASSES.find(c => c.id === selectedStudent.class_id)?.name ?? '—'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Roll No: {selectedStudent.roll_number}
                    </span>
                  </div>
                </div>
              </div>
              <button className="drawer-close-btn" onClick={() => setDrawerOpen(false)}>
                <X size={24} />
              </button>
            </div>

            {/* Tab Links */}
            <div className="drawer-tabs">
              <button 
                className={`drawer-tab ${activeTab === 'academic' ? 'active' : ''}`}
                onClick={() => setActiveTab('academic')}
              >
                Academic Records
              </button>
              <button 
                className={`drawer-tab ${activeTab === 'financial' ? 'active' : ''}`}
                onClick={() => setActiveTab('financial')}
              >
                Financial & Fees
              </button>
            </div>

            {/* Drawer Body content */}
            <div className="drawer-body">
              {activeTab === 'academic' ? (
                /* --- ACADEMIC TAB --- */
                <>
                  {/* General Info Card */}
                  <div className="erp-card">
                    <div className="erp-card-title">
                      <User size={16} /> <span>Student Information</span>
                    </div>
                    <div className="erp-info-grid">
                      <div className="erp-info-item">
                        <span className="erp-info-label">Full Name</span>
                        <span className="erp-info-value">{selectedStudent.name} {selectedStudent.surname}</span>
                      </div>
                      <div className="erp-info-item">
                        <span className="erp-info-label">Admission Number</span>
                        <span className="erp-info-value" style={{ fontFamily: 'monospace' }}>{selectedStudent.admission_number}</span>
                      </div>
                      <div className="erp-info-item">
                        <span className="erp-info-label">Roll Number</span>
                        <span className="erp-info-value">{selectedStudent.roll_number}</span>
                      </div>
                      <div className="erp-info-item">
                        <span className="erp-info-label">Class & Section</span>
                        <span className="erp-info-value">Class {CLASSES.find(c => c.id === selectedStudent.class_id)?.name ?? '—'}</span>
                      </div>
                      <div className="erp-info-item">
                        <span className="erp-info-label">Gender</span>
                        <span className="erp-info-value">{selectedStudent.sex}</span>
                      </div>
                      <div className="erp-info-item">
                        <span className="erp-info-label">Blood Group</span>
                        <span className="erp-info-value">{selectedStudent.blood_type}</span>
                      </div>
                      <div className="erp-info-item">
                        <span className="erp-info-label">Date of Birth</span>
                        <span className="erp-info-value">{selectedStudent.birthday || '—'}</span>
                      </div>
                      <div className="erp-info-item">
                        <span className="erp-info-label">Admission Date</span>
                        <span className="erp-info-value">{selectedStudent.admission_date}</span>
                      </div>
                      <div className="erp-info-item">
                        <span className="erp-info-label">Current Status</span>
                        <span className="erp-info-value">
                          <span className={`status-pill ${selectedStudent.status.toLowerCase()}`} style={{ fontSize: 10 }}>
                            {selectedStudent.status}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Parent Information Card */}
                  <div className="erp-card">
                    <div className="erp-card-title">
                      <Shield size={16} /> <span>Parent / Guardian Information</span>
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
                          <span className="erp-info-label">Nominated Guardian</span>
                          <span className="erp-info-value">{parentDetails.guardian_name}</span>
                        </div>
                        <div className="erp-info-item">
                          <span className="erp-info-label">Primary Phone</span>
                          <span className="erp-info-value">{parentDetails.phone}</span>
                        </div>
                        <div className="erp-info-item">
                          <span className="erp-info-label">Secondary Phone</span>
                          <span className="erp-info-value">{parentDetails.secondary_phone}</span>
                        </div>
                        <div className="erp-info-item" style={{ gridColumn: 'span 2' }}>
                          <span className="erp-info-label">Residential Address</span>
                          <span className="erp-info-value" style={{ fontWeight: 500 }}>{parentDetails.address}</span>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No parent record mapped.</p>
                    )}
                  </div>

                  {/* Editable User Credentials */}
                  <div className="erp-card">
                    <div className="erp-card-title" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={16} /> <span>User Security Credentials</span>
                      </div>
                      {!isEditingCreds && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: 11, borderRadius: 4 }}
                          onClick={() => setIsEditingCreds(true)}
                        >
                          <Edit size={12} /> <span>Edit</span>
                        </button>
                      )}
                    </div>
                    {isEditingCreds ? (
                      <form onSubmit={handleSaveCredentials} className="credentials-edit-form">
                        <div className="form-grid" style={{ marginBottom: 0 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>Username *</label>
                            <input 
                              className="form-input" 
                              style={{ padding: 8, fontSize: 13 }}
                              value={credUsername} 
                              onChange={(e) => setCredUsername(e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>Email *</label>
                            <input 
                              type="email"
                              className="form-input" 
                              style={{ padding: 8, fontSize: 13 }}
                              value={credEmail} 
                              onChange={(e) => setCredEmail(e.target.value)} 
                              required 
                            />
                          </div>
                        </div>
                        <div className="credentials-actions">
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: 12 }}
                            onClick={() => {
                              setIsEditingCreds(false);
                              setCredUsername(selectedStudent.username);
                              setCredEmail(selectedStudent.email ?? '');
                            }}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: 12 }}
                          >
                            <Save size={14} /> <span>Save Changes</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="erp-info-grid">
                        <div className="erp-info-item">
                          <span className="erp-info-label">System Username</span>
                          <span className="erp-info-value" style={{ color: 'var(--primary)' }}>{selectedStudent.username}</span>
                        </div>
                        <div className="erp-info-item">
                          <span className="erp-info-label">System Email</span>
                          <span className="erp-info-value">{selectedStudent.email ?? 'Not Provided'}</span>
                        </div>
                        <div className="erp-info-item">
                          <span className="erp-info-label">SaaS Security Role</span>
                          <span className="erp-info-value" style={{ textTransform: 'capitalize' }}>student</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attendance Summary */}
                  <div className="erp-card">
                    <div className="erp-card-title">
                      <Calendar size={16} /> <span>Attendance Summary</span>
                    </div>
                    <div className="stats-mini-grid" style={{ marginBottom: 16 }}>
                      <div className="stat-mini-card">
                        <div className="stat-mini-label">Present Days</div>
                        <div className="stat-mini-value success">{attendanceMetrics.present}</div>
                      </div>
                      <div className="stat-mini-card">
                        <div className="stat-mini-label">Absent Days</div>
                        <div className="stat-mini-value danger">{attendanceMetrics.absent}</div>
                      </div>
                      <div className="stat-mini-card">
                        <div className="stat-mini-label">Attendance Rate</div>
                        <div className="stat-mini-value warning">{attendanceMetrics.percentage}</div>
                      </div>
                    </div>

                    <div className="drawer-table-wrapper">
                      <table className="drawer-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fullDetails && fullDetails.attendance.length > 0 ? (
                            fullDetails.attendance.map((att) => (
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
                                <td style={{ color: 'var(--text-secondary)' }}>{att.remarks}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                                No attendance records loaded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Academic Marks */}
                  <div className="erp-card">
                    <div className="erp-card-title">
                      <BookOpen size={16} /> <span>Academic Report Card</span>
                    </div>

                    <div className="stats-mini-grid" style={{ marginBottom: 16 }}>
                      <div className="stat-mini-card">
                        <div className="stat-mini-label">Term Total (Finals)</div>
                        <div className="stat-mini-value success" style={{ fontSize: 16 }}>
                          {marksSummary.totalMarks} / 800
                        </div>
                      </div>
                      <div className="stat-mini-card">
                        <div className="stat-mini-label">Average Score</div>
                        <div className="stat-mini-value success" style={{ fontSize: 16 }}>{marksSummary.avgPercentage}</div>
                      </div>
                      <div className="stat-mini-card">
                        <div className="stat-mini-label">Class Rank (Est.)</div>
                        <div className="stat-mini-value warning" style={{ fontSize: 16 }}>{marksSummary.rank}</div>
                      </div>
                    </div>

                    <div className="drawer-table-wrapper">
                      <table className="drawer-table">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Exam Component</th>
                            <th>Score</th>
                            <th>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fullDetails && fullDetails.marks.length > 0 ? (
                            fullDetails.marks.map((mrk) => (
                              <tr key={mrk.id}>
                                <td style={{ fontWeight: 600 }}>{mrk.subject}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{mrk.exam}</td>
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
                          ) : (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                                No marks records loaded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                /* --- FINANCIAL TAB --- */
                <>
                  {/* Fee Summary Cards */}
                  <div className="erp-card">
                    <div className="erp-card-title">
                      <DollarSign size={16} /> <span>Annual Fee Balance Sheet</span>
                    </div>
                    {fullDetails ? (
                      <>
                        <div className="stats-mini-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                          <div className="stat-mini-card" style={{ padding: 16 }}>
                            <div className="stat-mini-label">Total Fee Due</div>
                            <div className="stat-mini-value" style={{ color: 'var(--text-primary)', fontSize: 20 }}>
                              ₹{fullDetails.feeSummary.totalFee.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="stat-mini-card" style={{ padding: 16 }}>
                            <div className="stat-mini-label">Paid Amount</div>
                            <div className="stat-mini-value success" style={{ fontSize: 20 }}>
                              ₹{fullDetails.feeSummary.paidAmount.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>

                        <div className="stats-mini-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                          <div className="stat-mini-card" style={{ padding: 16 }}>
                            <div className="stat-mini-label">Pending Balance</div>
                            <div className="stat-mini-value warning" style={{ fontSize: 20 }}>
                              ₹{fullDetails.feeSummary.pendingAmount.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="stat-mini-card" style={{ padding: 16 }}>
                            <div className="stat-mini-label">Overdue Arrears</div>
                            <div className="stat-mini-value danger" style={{ fontSize: 20 }}>
                              ₹{fullDetails.feeSummary.overdueAmount.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>

                        {fullDetails.feeSummary.pendingAmount > 0 && (
                          <div className="financial-status-bar" style={{ marginTop: 16, padding: 8, backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px solid var(--warning-light)', borderRadius: 6 }}>
                            <Clock size={14} style={{ color: 'var(--warning)' }} />
                            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                              Remaining term balance of ₹{fullDetails.feeSummary.pendingAmount} must be settled before terminal examinations.
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No ledger entries found.</p>
                    )}
                  </div>

                  {/* Payment History Receipts Table */}
                  <div className="erp-card">
                    <div className="erp-card-title">
                      <FileText size={16} /> <span>Official Fee Receipts</span>
                    </div>

                    <div className="drawer-table-wrapper">
                      <table className="drawer-table">
                        <thead>
                          <tr>
                            <th>Receipt No</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Trans ID</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fullDetails && fullDetails.payments.length > 0 ? (
                            fullDetails.payments.map((pay) => (
                              <tr key={pay.receiptNumber}>
                                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{pay.receiptNumber}</td>
                                <td>{pay.date}</td>
                                <td style={{ fontWeight: 600 }}>₹{pay.amount.toLocaleString('en-IN')}</td>
                                <td>{pay.paymentMethod}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{pay.transactionId}</td>
                                <td>
                                  <span className="status-pill active" style={{ fontSize: 9, padding: '1px 6px' }}>
                                    {pay.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                                No transaction receipts found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* UPI Proof Attachment Section */}
                  <div className="erp-card">
                    <div className="erp-card-title">
                      <span>UPI Proof Attachment</span>
                    </div>
                    {fullDetails && fullDetails.payments.some(p => p.upiProofUrl) ? (
                      <div className="upi-proof-card">
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          Click the digital receipt below to view full-resolution Supabase storage file.
                        </p>
                        <div 
                          className="upi-thumbnail-container"
                          onClick={() => setZoomReceiptUrl('/upi_receipt.png')}
                        >
                          <img src="/upi_receipt.png" alt="UPI Receipt Thumbnail" className="upi-thumbnail" />
                          <div className="upi-thumbnail-overlay">
                            <Eye size={20} style={{ color: '#fff' }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>upi_receipt_screenshot.png (122 KB)</span>
                      </div>
                    ) : (
                      <div className="upi-proof-card" style={{ padding: '32px 16px' }}>
                        <Eye size={28} style={{ color: 'var(--text-muted)' }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>No Digital Proof Uploaded</div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            This student settled fees via Credit Card or Net Banking. No mobile receipt verification is required.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* UPI Receipt Zoom Modal */}
      {zoomReceiptUrl && (
        <div className="zoom-modal-overlay" onClick={() => setZoomReceiptUrl(null)}>
          <div className="zoom-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="zoom-modal-close-btn" onClick={() => setZoomReceiptUrl(null)}>
              <X size={18} />
            </button>
            <img src={zoomReceiptUrl} alt="UPI Payment Verification Receipt" className="zoom-modal-img" />
            <div style={{ backgroundColor: 'var(--bg-sidebar)', padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
              Transaction ID: TXN987654321 • Validated by Central Board on 2026-05-15
            </div>
          </div>
        </div>
      )}

      {/* original Create/Edit/Delete Modals (Maintains full backwards compatibility) */}
      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className={`modal-content ${modalType === 'delete' ? 'confirm' : ''}`}>
            <div className="modal-header">
              <h2>{modalType === 'create' ? 'Add Student' : modalType === 'edit' ? 'Edit Student' : 'Delete Student'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            
            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: 24 }}>Delete student <strong>{selected?.name} {selected?.surname}</strong>? This cannot be undone.</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Username *</label>
                    <input className="form-input" value={form.username} onChange={f('username')} required />
                  </div>
                  {modalType === 'create' && (
                    <div className="form-group">
                      <label className="form-label">Password *</label>
                      <input type="password" className="form-input" value={form.password} onChange={f('password')} required minLength={8} />
                    </div>
                  )}
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className="form-input" value={form.name} onChange={f('name')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className="form-input" value={form.surname} onChange={f('surname')} required />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email ?? ''} onChange={f('email')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone ?? ''} onChange={f('phone')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" value={form.address} onChange={f('address')} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={form.sex} onChange={f('sex')}>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Type</label>
                    <select className="form-select" value={form.blood_type} onChange={f('blood_type')}>
                      {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Class *</label>
                    <select className="form-select" value={form.class_id} onChange={f('class_id')} required>
                      {CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section *</label>
                    <select className="form-select" value={form.grade_id} onChange={f('grade_id')} required>
                      {SECTIONS.filter(s => s.class_id === form.class_id).map(sec => (
                        <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Parent *</label>
                  <select className="form-select" value={form.parent_id} onChange={f('parent_id')} required>
                    {PARENTS.map(p => <option key={p.id} value={p.id}>{p.name} {p.surname}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Birthday</label>
                  <input type="date" className="form-input" value={form.birthday} onChange={f('birthday')} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
