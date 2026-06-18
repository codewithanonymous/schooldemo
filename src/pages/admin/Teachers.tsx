import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SUBJECTS,
  CLASSES,
  SECTIONS,
  getTeacherAssignmentSummary,
  getTeacherAssignments,
  replaceTeacherAssignments,
  removeTeacherAssignment,
  assignTeacher,
  AssignmentRow,
  ResolvedAssignment
} from '../../data/academicMockData';
import { genId } from '../../data/mockData';
import { STAFF as initialStaff, STAFF_DETAILS_MAP, saveStaffState } from '../../data/staffDetailsMockData';
import { StaffMember, StaffFullDetails, StaffAttendanceRecord } from '../../types/staff';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  DollarSign,
  Calendar,
  Briefcase,
  UserCheck,
  MapPin,
  Mail,
  Phone,
  CalendarCheck,
  TrendingUp,
  CheckCircle,
  HelpCircle,
  ClipboardList,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import './Teachers.css';

// ─── Constants ──────────────────────────────────────────────────────────────
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const DESIGNATIONS = [
  'Head of Department (HOD)',
  'Senior Secondary Teacher',
  'Secondary Grade Teacher',
  'Primary Grade Teacher',
  'Physical Education Trainer',
  'Assistant Teacher',
  'Senior Language Specialist',
  'Language Specialist',
  'Chief Accountant',
  'Senior Librarian',
  'IT Systems Administrator',
  'Registrar'
];
const DEPARTMENTS = [
  'Mathematics & Computer Science',
  'Sciences',
  'Languages & Humanities',
  'Physical Education',
  'General Education',
  'Finance & Accounts',
  'Library Services',
  'Information Technology',
  'Admissions & Registry'
];

// ─── Empty Form Factory ──────────────────────────────────────────────────────
const emptyForm = (mode: 'teachers' | 'staff' = 'teachers') => ({
  username: '',
  password: '',
  name: '',
  surname: '',
  email: '',
  phone: '',
  address: '',
  blood_type: 'A+',
  sex: 'MALE' as 'MALE' | 'FEMALE',
  birthday: '',
  designation: mode === 'teachers' ? DESIGNATIONS[2] : DESIGNATIONS[10],
  department: mode === 'teachers' ? DEPARTMENTS[4] : DEPARTMENTS[7],
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE',
  joining_date: new Date().toISOString().split('T')[0],
  monthlySalary: 25000,
});

// ─── Empty Assignment Row ────────────────────────────────────────────────────
const emptyRow = (): AssignmentRow => ({ class_id: '', section_id: '', subject_ids: [] });

// ─── Component ──────────────────────────────────────────────────────────────
interface TeachersProps {
  mode?: 'teachers' | 'staff';
}

const Teachers: React.FC<TeachersProps> = ({ mode = 'teachers' }) => {
  // --- Core List State ---
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 8;

  // --- Drawer State ---
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'payroll' | 'attendance' | 'leaves' | 'performance'>('overview');
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [attendanceMonth, setAttendanceMonth] = useState<string>('June 2026');

  // --- Quick Actions ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- CRUD Modal State ---
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete'>('create');
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm(mode));
  const [saving, setSaving] = useState<boolean>(false);

  // --- Assignment Builder State (inside create/edit modal) ---
  const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([emptyRow()]);

  // --- Drawer Inline Assignment State ---
  const [drawerResolvedAssignments, setDrawerResolvedAssignments] = useState<ResolvedAssignment[]>([]);
  const [drawerAddRow, setDrawerAddRow] = useState<AssignmentRow>(emptyRow());
  const [addingDrawerAssignment, setAddingDrawerAssignment] = useState<boolean>(false);

  // ─── Toast Helper ────────────────────────────────────────────────────────
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── Load drawer assignments when selectedStaff changes ──────────────────
  useEffect(() => {
    if (selectedStaff) {
      setDrawerResolvedAssignments(getTeacherAssignments(selectedStaff.id));
    }
  }, [selectedStaff, staff]);

  // ─── Sections available for a class ──────────────────────────────────────
  const sectionsForClass = useCallback((classId: string) => {
    return SECTIONS.filter(s => s.class_id === classId);
  }, []);

  // ─── Active subjects (only ACTIVE status) ────────────────────────────────
  const activeSubjects = useMemo(() => SUBJECTS.filter(s => s.status === 'ACTIVE'), []);

  // ─── Assignment Row Helpers ───────────────────────────────────────────────
  const updateRow = (idx: number, field: keyof AssignmentRow, value: string | string[]) => {
    setAssignmentRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === 'class_id') return { ...r, class_id: value as string, section_id: '', subject_ids: [] };
      if (field === 'section_id') return { ...r, section_id: value as string };
      if (field === 'subject_ids') return { ...r, subject_ids: value as string[] };
      return r;
    }));
  };

  const toggleRowSubject = (idx: number, subId: string) => {
    setAssignmentRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const ids = r.subject_ids.includes(subId)
        ? r.subject_ids.filter(s => s !== subId)
        : [...r.subject_ids, subId];
      return { ...r, subject_ids: ids };
    }));
  };

  const removeRow = (idx: number) => {
    setAssignmentRows(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── CRUD Handlers ────────────────────────────────────────────────────────
  const openCreate = () => {
    setModalType('create');
    setSelected(null);
    setForm(emptyForm(mode));
    setAssignmentRows([emptyRow()]);
    setShowModal(true);
  };

  const openEditFromTable = (t: StaffMember, e: React.MouseEvent) => {
    e.stopPropagation();
    openEdit(t);
  };

  const openEdit = (t: StaffMember) => {
    setModalType('edit');
    setSelected(t);
    setForm({
      username: t.username ?? '',
      password: '',
      name: t.name ?? '',
      surname: t.surname ?? '',
      email: t.email ?? '',
      phone: t.phone ?? '',
      address: t.address ?? '',
      blood_type: t.blood_type ?? 'A+',
      sex: t.sex ?? 'MALE',
      birthday: t.birthday ?? '',
      designation: t.designation ?? DESIGNATIONS[2],
      department: t.department ?? DEPARTMENTS[4],
      status: t.status ?? 'ACTIVE',
      joining_date: t.joining_date ?? new Date().toISOString().split('T')[0],
      monthlySalary: t.monthlySalary ?? 25000,
    });

    // Load existing assignments into rows (group by class+section)
    const existing = getTeacherAssignments(t.id);
    if (existing.length > 0) {
      const rowMap = new Map<string, AssignmentRow>();
      existing.forEach(a => {
        const key = `${a.class_id}::${a.section_id}`;
        if (!rowMap.has(key)) {
          rowMap.set(key, { class_id: a.class_id, section_id: a.section_id, subject_ids: [] });
        }
        rowMap.get(key)!.subject_ids.push(a.subject_id);
      });
      setAssignmentRows(Array.from(rowMap.values()));
    } else {
      setAssignmentRows([emptyRow()]);
    }

    setShowModal(true);
  };

  const openDelete = (t: StaffMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('delete');
    setSelected(t);
    setShowModal(true);
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 450));

    const validRows = assignmentRows.filter(r => r.class_id && r.section_id && r.subject_ids.length > 0);

    if (modalType === 'create') {
      const prefix = mode === 'teachers' ? 'tch' : 'stf-nt';
      const newId = genId(prefix);

      // Derive subject_ids from assignment rows for backward compat
      const subjectIds = [...new Set(validRows.flatMap(r => r.subject_ids))];

      // Auto generate employee ID and password matching the requested formatting
      const nextIndex = initialStaff.length + 1;
      const empId = `EMP2026${String(nextIndex).padStart(3, '0')}`;
      const dobFormatted = form.birthday ? form.birthday.split('-').reverse().join('') : '01011985';
      const fName = form.name ? form.name.split(' ')[0] : 'Teacher';
      const autoPassword = fName + dobFormatted;

      const newStaff: StaffMember = {
        id: newId,
        username: form.username || empId,
        password: form.password || autoPassword,
        employee_id: empId,
        name: form.name,
        surname: form.surname,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address,
        blood_type: form.blood_type,
        sex: form.sex,
        birthday: form.birthday,
        designation: form.designation,
        department: form.department,
        role: form.designation.includes('HOD') || form.designation.includes('Chief') ? 'Advisory Staff' : mode === 'teachers' ? 'Academic Staff' : 'Administrative Staff',
        joining_date: form.joining_date,
        status: form.status,
        teacher_subjects: subjectIds.map(sid => ({ subject_id: sid })),
        monthlySalary: Number(form.monthlySalary || 0)
      };

      // Create TEACHER_ASSIGNMENTS
      if (mode === 'teachers') {
        replaceTeacherAssignments(newId, validRows);
      }

      const subjectNames = subjectIds.map(sid => SUBJECTS.find(s => s.id === sid)?.name || 'General');

      STAFF_DETAILS_MAP[newId] = {
        staffId: newId,
        attendance: [{
          id: `att-stf-${newId}-today`,
          date: new Date().toISOString().split('T')[0],
          checkIn: '08:15', checkOut: '15:45',
          status: 'PRESENT', remarks: 'Joined ERP ledger'
        }],
        leaveSummary: { totalBalance: 24, used: 0, remaining: 24 },
        leaveHistory: [],
        performance: {
          assignedClasses: [...new Set(validRows.map(r => CLASSES.find(c => c.id === r.class_id)?.name ?? r.class_id))],
          assignedSubjects: subjectNames,
          totalStudents: 30,
          notes: 'New staff enrollment. Profile setup complete.'
        }
      };

      initialStaff.unshift(newStaff);
      saveStaffState();
      setStaff([...initialStaff]);
      triggerToast(`${newStaff.name} ${newStaff.surname} created with ${validRows.length} assignment(s).`);

    } else if (modalType === 'edit' && selected) {
      const idx = initialStaff.findIndex(t => t.id === selected.id);
      const subjectIds = [...new Set(validRows.flatMap(r => r.subject_ids))];

      if (idx !== -1) {
        initialStaff[idx] = {
          ...initialStaff[idx],
          ...form,
          email: form.email || null,
          phone: form.phone || null,
          role: form.designation.includes('HOD') || form.designation.includes('Chief') ? 'Advisory Staff' : mode === 'teachers' ? 'Academic Staff' : 'Administrative Staff',
          teacher_subjects: subjectIds.map(sid => ({ subject_id: sid })),
          monthlySalary: Number(form.monthlySalary || 0)
        };

        // Atomically replace assignments
        if (mode === 'teachers') {
          replaceTeacherAssignments(selected.id, validRows);
        }

        saveStaffState();
        setStaff([...initialStaff]);
      }

      if (selectedStaff && selectedStaff.id === selected.id) {
        setSelectedStaff(prev => prev ? {
          ...prev, ...form,
          email: form.email || null,
          phone: form.phone || null,
          teacher_subjects: subjectIds.map(sid => ({ subject_id: sid })),
          monthlySalary: Number(form.monthlySalary || 0)
        } : null);
        setDrawerResolvedAssignments(getTeacherAssignments(selected.id));
      }

      triggerToast('Staff profile and assignments updated successfully.');
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 350));
    const idx = initialStaff.findIndex(t => t.id === selected.id);
    if (idx !== -1) {
      initialStaff.splice(idx, 1);
      delete STAFF_DETAILS_MAP[selected.id];
      replaceTeacherAssignments(selected.id, []); // cascade delete assignments
      saveStaffState();
    }
    setStaff([...initialStaff]);
    if (selectedStaff?.id === selected.id) { setDrawerOpen(false); setSelectedStaff(null); }
    setSaving(false);
    setShowModal(false);
    triggerToast('Staff record and all assignments deleted.');
  };

  // ─── Row Click + Drawer ───────────────────────────────────────────────────
  const handleRowClick = (t: StaffMember, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.table-actions') || target.closest('button')) return;
    setSelectedStaff(t);
    setDrawerLoading(true);
    setActiveTab('overview');
    setDrawerOpen(true);
    setTimeout(() => setDrawerLoading(false), 500);
  };

  // ─── Drawer: Add assignment inline ────────────────────────────────────────
  const handleDrawerAddAssignment = async () => {
    if (!selectedStaff || !drawerAddRow.class_id || !drawerAddRow.section_id || drawerAddRow.subject_ids.length === 0) {
      triggerToast('Please select a Class, Section, and at least one Subject.');
      return;
    }
    setAddingDrawerAssignment(true);
    for (const subId of drawerAddRow.subject_ids) {
      // Skip duplicates
      const exists = drawerResolvedAssignments.some(
        a => a.class_id === drawerAddRow.class_id && a.section_id === drawerAddRow.section_id && a.subject_id === subId
      );
      if (!exists) assignTeacher(selectedStaff.id, drawerAddRow.class_id, drawerAddRow.section_id, subId);
    }
    // Sync teacher_subjects[]
    const idx = initialStaff.findIndex(s => s.id === selectedStaff.id);
    if (idx !== -1) {
      const allSubIds = [...new Set(getTeacherAssignments(selectedStaff.id).map(a => a.subject_id))];
      initialStaff[idx].teacher_subjects = allSubIds.map(sid => ({ subject_id: sid }));
      saveStaffState();
      setStaff([...initialStaff]);
    }
    setDrawerResolvedAssignments(getTeacherAssignments(selectedStaff.id));
    setDrawerAddRow(emptyRow());
    setAddingDrawerAssignment(false);
    triggerToast('Assignment added successfully.');
  };

  const handleDrawerRemoveAssignment = (assignmentId: string) => {
    removeTeacherAssignment(assignmentId);
    if (selectedStaff) {
      // Sync teacher_subjects[]
      const idx = initialStaff.findIndex(s => s.id === selectedStaff.id);
      if (idx !== -1) {
        const allSubIds = [...new Set(getTeacherAssignments(selectedStaff.id).map(a => a.subject_id))];
        initialStaff[idx].teacher_subjects = allSubIds.map(sid => ({ subject_id: sid }));
        saveStaffState();
        setStaff([...initialStaff]);
      }
      setDrawerResolvedAssignments(getTeacherAssignments(selectedStaff.id));
    }
    triggerToast('Assignment removed.');
  };

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filteredStaff = useMemo(() => {
    return staff.filter(t => {
      const isTeacher = t.id.startsWith('tch') || t.id.startsWith('usr-teacher');
      if (mode === 'teachers' && !isTeacher) return false;
      if (mode === 'staff' && isTeacher) return false;
      const nameMatch = `${t.name} ${t.surname} ${t.username} ${t.email ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      const statusMatch = statusFilter === 'All' || t.status === statusFilter;
      const deptMatch = deptFilter === 'All' || t.department === deptFilter;
      return nameMatch && statusMatch && deptMatch;
    });
  }, [staff, searchQuery, statusFilter, deptFilter, mode]);

  const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE);
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = useMemo(() => filteredStaff.slice(pageStart, pageStart + ITEMS_PER_PAGE), [filteredStaff, pageStart]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, deptFilter, mode]);

  // ─── Details lookup ───────────────────────────────────────────────────────
  const details = useMemo<StaffFullDetails | null>(() => {
    if (!selectedStaff) return null;
    return STAFF_DETAILS_MAP[selectedStaff.id] || null;
  }, [selectedStaff, staff]);

  // ─── Attendance Tab ───────────────────────────────────────────────────────
  const attendanceMonths = ['June 2026', 'May 2026', 'April 2026'];

  const filteredAttendance = useMemo<StaffAttendanceRecord[]>(() => {
    if (!details) return [];
    const monthPrefix = attendanceMonth === 'June 2026' ? '2026-06'
      : attendanceMonth === 'May 2026' ? '2026-05' : '2026-04';
    return details.attendance.filter(r => r.date.startsWith(monthPrefix));
  }, [details, attendanceMonth]);

  const monthlyAttendanceMetrics = useMemo(() => {
    const records = filteredAttendance;
    const workingDays = records.length;
    if (workingDays === 0) return { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, percentage: 0 };
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const halfDay = records.filter(r => r.status === 'HALF_DAY').length;
    const leave = records.filter(r => r.status === 'LEAVE').length;
    const attendedDays = present + late + halfDay;
    const percentage = Math.round((attendedDays / Math.max(1, workingDays - leave)) * 100);
    return { present, absent, late, halfDay, leave, workingDays, percentage };
  }, [filteredAttendance]);

  const overallAttendanceMetrics = useMemo(() => {
    if (!details || details.attendance.length === 0) return { present: 0, absent: 0, leave: 0, workingDays: 0, percentage: 0 };
    const records = details.attendance;
    const workingDays = records.length;
    const present = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const leave = records.filter(r => r.status === 'LEAVE').length;
    const percentage = Math.round((present / Math.max(1, workingDays - leave)) * 100);
    return { present, absent, leave, workingDays, percentage };
  }, [details]);

  // ─── Quick Actions ────────────────────────────────────────────────────────
  const handleQuickAction = (action: string) => {
    if (!selectedStaff || !details) return;
    if (action === 'edit') {
      openEdit(selectedStaff);
    } else if (action === 'attendance') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (!details.attendance.some(a => a.date === todayStr)) {
        details.attendance.unshift({ id: `att-stf-${selectedStaff.id}-${todayStr}`, date: todayStr, checkIn: '08:15', checkOut: '15:45', status: 'PRESENT', remarks: 'Marked PRESENT by Administrator' });
        saveStaffState();
        triggerToast(`Recorded PRESENT for ${selectedStaff.name} today.`);
      } else {
        triggerToast(`Attendance already recorded for today.`);
      }
    } else if (action === 'leave') {
      const pendingCount = details.leaveHistory.filter(l => l.status === 'PENDING').length;
      if (pendingCount > 0) {
        details.leaveHistory = details.leaveHistory.map(l => l.status === 'PENDING' ? { ...l, status: 'APPROVED', approvedBy: 'Admin User' } : l);
        const approvedCount = details.leaveHistory.filter(l => l.status === 'APPROVED').reduce((sum, l) => sum + l.days, 0);
        details.leaveSummary.used = approvedCount;
        details.leaveSummary.remaining = Math.max(0, details.leaveSummary.totalBalance - approvedCount);
        saveStaffState();
        triggerToast(`Approved ${pendingCount} leave request(s).`);
      } else {
        triggerToast('No pending leave requests.');
      }
    }
  };

  // ─── Table Row Renderer ───────────────────────────────────────────────────
  const renderRow = (t: StaffMember) => {
    const summary = mode === 'teachers' ? getTeacherAssignmentSummary(t.id) : null;
    return (
      <tr key={t.id} className="erp-row-clickable" onClick={(e) => handleRowClick(t, e)}>
        {mode === 'staff' ? (
          <>
            {/* Employee ID */}
            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>EMP-{t.id.slice(-6).toUpperCase()}</td>

            {/* Staff Name */}
            <td style={{ fontWeight: 700 }}>{t.name} {t.surname}</td>

            {/* Role / Designation */}
            <td>{t.designation}</td>

            {/* Phone Number */}
            <td>{t.phone || '—'}</td>

            {/* Monthly Salary */}
            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{(t.monthlySalary || 0).toLocaleString()}</td>

            {/* Status */}
            <td>
              <span className={`status-pill ${t.status.toLowerCase()}`}>{t.status.replace('_', ' ')}</span>
            </td>
          </>
        ) : (
          <>
            {/* Employee Details */}
            <td>
              <div className="table-avatar-cell">
                <div className="table-avatar">{t.name[0]}{t.surname?.[0] ?? ''}</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.name} {t.surname}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    ID: EMP-{t.id.slice(-6).toUpperCase()}
                  </div>
                </div>
              </div>
            </td>

            {/* Designation & Department */}
            <td>
              <div style={{ fontWeight: 600 }}>{t.designation}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.department}</div>
            </td>

            {/* Subjects Assigned (teachers only) */}
            <td className="hidden md:table-cell">
              {summary && summary.subjectNames.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {summary.subjectNames.slice(0, 3).map(s => (
                    <span key={s} style={{
                      fontSize: '10px', padding: '2px 7px', borderRadius: 10,
                      backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--primary)', fontWeight: 600
                    }}>{s}</span>
                  ))}
                  {summary.subjectNames.length > 3 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{summary.subjectNames.length - 3}</span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Not assigned</span>
              )}
            </td>

            {/* Classes / Sections (teachers only) */}
            <td className="hidden lg:table-cell">
              {summary && summary.classNames.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {summary.classNames.slice(0, 2).map(c => {
                    const secs = summary.assignments.filter(a => a.className === c).map(a => a.sectionCode);
                    const uniqSecs = [...new Set(secs)];
                    return (
                      <div key={c} style={{ fontSize: '11px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / {uniqSecs.join(', ')}</span>
                      </div>
                    );
                  })}
                  {summary.classNames.length > 2 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{summary.classNames.length - 2} more</span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
              )}
            </td>

            {/* Status */}
            <td className="hidden md:table-cell">
              <span className={`status-pill ${t.status.toLowerCase()}`}>{t.status.replace('_', ' ')}</span>
            </td>

            {/* Date Joined */}
            <td className="hidden lg:table-cell">
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t.joining_date}</div>
            </td>
          </>
        )}

        {/* Actions */}
        <td>
          <div className="table-actions">
            <button className="btn-icon" onClick={(e) => openEditFromTable(t, e)} title="Edit Profile">
              <Edit2 size={13} />
            </button>
            <button className="btn-icon btn-icon-danger" onClick={(e) => openDelete(t, e)} title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, backgroundColor: 'var(--primary)', color: '#fff',
          padding: '12px 20px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-premium)',
          zIndex: 1100, fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.25s ease'
        }}>
          <CheckCircle size={16} /> <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>{mode === 'teachers' ? 'Teachers Directory ERP' : 'Staff Directory ERP'}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {mode === 'teachers'
              ? 'Manage academic staff, subject assignments, class allocations and profiles.'
              : 'Administer school non-teaching staff, payroll structure, and leaves.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> <span>{mode === 'teachers' ? 'Add Teacher' : 'Add Staff Member'}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="filters-grid">
        <div className="filter-group">
          <label className="filter-label">Department</label>
          <select className="filter-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="All">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Employment Status</label>
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>
        </div>
        <div className="filter-group" style={{ gridColumn: 'span 2' }}>
          <label className="filter-label">Search Directory</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="filter-input" style={{ paddingLeft: 34, width: '100%' }}
              placeholder="Search by name, email, username..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        {filteredStaff.length === 0 ? (
          <div className="drawer-empty-state" style={{ padding: '48px 0' }}>
            <HelpCircle size={40} />
            <h2>No Staff Members Found</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="erp-table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  {mode === 'staff' ? (
                    <>
                      <th>Employee ID</th>
                      <th>Staff Name</th>
                      <th>Role</th>
                      <th>Phone Number</th>
                      <th>Monthly Salary</th>
                      <th>Status</th>
                    </>
                  ) : (
                    <>
                      <th>Employee Details</th>
                      <th>Designation & Department</th>
                      <th className="hidden md:table-cell">Subjects</th>
                      <th className="hidden lg:table-cell">Classes / Sections</th>
                      <th className="hidden md:table-cell">Status</th>
                      <th className="hidden lg:table-cell">Date Joined</th>
                    </>
                  )}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(item => renderRow(item))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredStaff.length > 0 && (
          <div className="pagination">
            <span className="pagination-info">
              Showing <strong>{pageStart + 1}</strong> – <strong>{Math.min(pageStart + ITEMS_PER_PAGE, filteredStaff.length)}</strong> of <strong>{filteredStaff.length}</strong>
            </span>
            {totalPages > 1 && (
              <div className="pagination-buttons">
                <button className="btn btn-secondary" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</button>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</span>
                <button className="btn btn-secondary" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ SIDE DRAWER ═════════════════════════════════════════════════════ */}
      <div className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`drawer-panel ${drawerOpen ? 'open' : ''}`}>
        {selectedStaff && details && (
          <>
            {/* Drawer Header */}
            <div className="drawer-header">
              <div className="drawer-title-area">
                <div className="drawer-avatar">{selectedStaff.name[0]}{selectedStaff.surname?.[0] ?? ''}</div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{selectedStaff.name} {selectedStaff.surname}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span className={`status-pill ${selectedStaff.status.toLowerCase()}`} style={{ fontSize: '10px' }}>
                      {selectedStaff.status.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      EMP-{selectedStaff.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <button className="drawer-close-btn" onClick={() => setDrawerOpen(false)}><X size={20} /></button>
            </div>

            {/* Drawer Tabs */}
            {mode === 'teachers' && (
              <div className="drawer-tabs">
                <button className={`drawer-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                <button className={`drawer-tab ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>
                  Assignments {drawerResolvedAssignments.length > 0 && <span style={{ marginLeft: 4, backgroundColor: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>{drawerResolvedAssignments.length}</span>}
                </button>
                <button className={`drawer-tab ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>Attendance</button>
                <button className={`drawer-tab ${activeTab === 'leaves' ? 'active' : ''}`} onClick={() => setActiveTab('leaves')}>Leaves</button>
                <button className={`drawer-tab ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>Performance</button>
              </div>
            )}

            {/* Drawer Body */}
            <div className="drawer-body">
              {drawerLoading ? (
                <div className="drawer-skeleton">
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div className="skeleton-avatar" style={{ width: 64, height: 64 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexGrow: 1 }}>
                      <div className="skeleton-text-lg" />
                      <div className="skeleton-text-md" />
                    </div>
                  </div>
                  <div className="skeleton-block" />
                  <div className="skeleton-block" style={{ height: 160 }} />
                </div>
              ) : mode === 'staff' ? (
                /* Simplified Staff View: Personal, Role, Attendance Summary, Leave Summary, Monthly Salary */
                <>
                  {/* Attendance Summary */}
                  <div className="stats-mini-grid">
                    <div className="stat-mini-card">
                      <span className="stat-mini-label">Present Days</span>
                      <span className="stat-mini-value success">{overallAttendanceMetrics.present}</span>
                    </div>
                    <div className="stat-mini-card">
                      <span className="stat-mini-label">Absent Days</span>
                      <span className="stat-mini-value danger">{overallAttendanceMetrics.absent}</span>
                    </div>
                    <div className="stat-mini-card">
                      <span className="stat-mini-label">Leave Days</span>
                      <span className="stat-mini-value warning">{overallAttendanceMetrics.leave}</span>
                    </div>
                    <div className="stat-mini-card">
                      <span className="stat-mini-label">Working Days</span>
                      <span className="stat-mini-value info">{overallAttendanceMetrics.workingDays}</span>
                    </div>
                    <div className="stat-mini-card">
                      <span className="stat-mini-label">Attendance %</span>
                      <span className="stat-mini-value primary">{overallAttendanceMetrics.percentage}%</span>
                    </div>
                  </div>

                  {/* Monthly Salary */}
                  <div className="erp-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div className="erp-card-title"><DollarSign size={14} /> <span>Monthly Salary</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
                          ₹{(selectedStaff.monthlySalary || 0).toLocaleString()}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fixed monthly salary expense</span>
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleQuickAction('edit')}>
                        <Edit2 size={12} style={{ marginRight: 4 }} /> Edit Salary
                      </button>
                    </div>
                  </div>

                  {/* Role Information */}
                  <div className="erp-card">
                    <div className="erp-card-title"><Briefcase size={14} /> <span>Role Information</span></div>
                    <div className="erp-info-grid">
                      <div className="erp-info-item"><span className="erp-info-label">Employee ID</span><span className="erp-info-value" style={{ fontFamily: 'monospace' }}>EMP-{selectedStaff.id.slice(-6).toUpperCase()}</span></div>
                      <div className="erp-info-item"><span className="erp-info-label">Role Classification</span><span className="erp-info-value">{selectedStaff.role}</span></div>
                      <div className="erp-info-item"><span className="erp-info-label">Department</span><span className="erp-info-value">{selectedStaff.department}</span></div>
                      <div className="erp-info-item"><span className="erp-info-label">Designation</span><span className="erp-info-value">{selectedStaff.designation}</span></div>
                      <div className="erp-info-item"><span className="erp-info-label">Joining Date</span><span className="erp-info-value">{selectedStaff.joining_date}</span></div>
                      <div className="erp-info-item"><span className="erp-info-label">Status</span><span className="erp-info-value"><span className={`status-pill ${selectedStaff.status.toLowerCase()}`} style={{ fontSize: '10px' }}>{selectedStaff.status.replace('_', ' ')}</span></span></div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="erp-card">
                    <div className="erp-card-title"><Mail size={14} /> <span>Personal Information</span></div>
                    <div className="erp-info-grid">
                      <div className="erp-info-item"><span className="erp-info-label">Full Name</span><span className="erp-info-value">{selectedStaff.name} {selectedStaff.surname}</span></div>
                      <div className="erp-info-item"><span className="erp-info-label">Gender</span><span className="erp-info-value">{selectedStaff.sex}</span></div>
                      <div className="erp-info-item"><span className="erp-info-label">Blood Group</span><span className="erp-info-value">{selectedStaff.blood_type}</span></div>
                      <div className="erp-info-item"><span className="erp-info-label">Birthday</span><span className="erp-info-value">{selectedStaff.birthday || '—'}</span></div>
                      <div className="erp-info-item"><span className="erp-info-label">Email</span><span className="erp-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} style={{ color: 'var(--text-muted)' }} /> {selectedStaff.email ?? 'Not mapped'}</span></div>
                      <div className="erp-info-item"><span className="erp-info-label">Phone</span><span className="erp-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} style={{ color: 'var(--text-muted)' }} /> {selectedStaff.phone ?? '—'}</span></div>
                      <div className="erp-info-item" style={{ gridColumn: 'span 2' }}><span className="erp-info-label">Address</span><span className="erp-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> {selectedStaff.address || '—'}</span></div>
                    </div>
                  </div>

                  {/* Leave Summary */}
                  <div className="erp-card">
                    <div className="erp-card-title"><ClipboardList size={14} /> <span>Leave Summary</span></div>
                    <div className="leave-balance-container" style={{ margin: 0, padding: 0, border: 'none', background: 'none', gap: 12, display: 'flex' }}>
                      <div className="leave-balance-card" style={{ borderLeft: '3px solid var(--primary)', padding: '10px 14px', flex: 1 }}>
                        <div className="stat-mini-label">Annual Balance</div>
                        <div className="stat-mini-value primary" style={{ fontSize: '16px' }}>{details.leaveSummary.totalBalance} Days</div>
                      </div>
                      <div className="leave-balance-card" style={{ borderLeft: '3px solid var(--success)', padding: '10px 14px', flex: 1 }}>
                        <div className="stat-mini-label">Used</div>
                        <div className="stat-mini-value success" style={{ fontSize: '16px' }}>{details.leaveSummary.used} Days</div>
                      </div>
                      <div className="leave-balance-card" style={{ borderLeft: '3px solid var(--warning)', padding: '10px 14px', flex: 1 }}>
                        <div className="stat-mini-label">Remaining</div>
                        <div className="stat-mini-value warning" style={{ fontSize: '16px' }}>{details.leaveSummary.remaining} Days</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions Panel */}
                  <div className="quick-actions-panel" style={{ marginTop: 20 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.5px' }}>
                      Admin HR Quick Actions
                    </div>
                    <div className="quick-actions-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <button className="quick-action-btn" onClick={() => handleQuickAction('edit')}><Edit2 size={16} /> <span>Edit Profile</span></button>
                      <button className="quick-action-btn" onClick={() => handleQuickAction('attendance')}><Calendar size={16} /> <span>Record Attendance</span></button>
                      <button className="quick-action-btn" onClick={() => handleQuickAction('leave')}><UserCheck size={16} /> <span>Approve Leaves</span></button>
                    </div>
                  </div>
                </>
              ) : (
                /* Teaching Staff View (Overview / Assignments / Attendance / Leaves / Performance) */
                <>
                  {/* OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <>
                      <div className="stats-mini-grid">
                        <div className="stat-mini-card">
                          <span className="stat-mini-label">Present Days</span>
                          <span className="stat-mini-value success">{overallAttendanceMetrics.present}</span>
                        </div>
                        <div className="stat-mini-card">
                          <span className="stat-mini-label">Absent Days</span>
                          <span className="stat-mini-value danger">{overallAttendanceMetrics.absent}</span>
                        </div>
                        <div className="stat-mini-card">
                          <span className="stat-mini-label">Leave Days</span>
                          <span className="stat-mini-value warning">{overallAttendanceMetrics.leave}</span>
                        </div>
                        <div className="stat-mini-card">
                          <span className="stat-mini-label">Working Days</span>
                          <span className="stat-mini-value info">{overallAttendanceMetrics.workingDays}</span>
                        </div>
                        <div className="stat-mini-card">
                          <span className="stat-mini-label">Attendance %</span>
                          <span className="stat-mini-value primary">{overallAttendanceMetrics.percentage}%</span>
                        </div>
                      </div>

                      {/* Monthly Salary */}
                      <div className="erp-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                        <div className="erp-card-title"><DollarSign size={14} /> <span>Monthly Salary</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                          <div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
                              ₹{(selectedStaff.monthlySalary || 0).toLocaleString()}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fixed monthly salary expense</span>
                          </div>
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleQuickAction('edit')}>
                            <Edit2 size={12} style={{ marginRight: 4 }} /> Edit Salary
                          </button>
                        </div>
                      </div>

                      <div className="erp-card">
                        <div className="erp-card-title"><Briefcase size={14} /> <span>Staff Profile Overview</span></div>
                        <div className="erp-info-grid">
                          <div className="erp-info-item"><span className="erp-info-label">Full Name</span><span className="erp-info-value">{selectedStaff.name} {selectedStaff.surname}</span></div>
                          <div className="erp-info-item"><span className="erp-info-label">Employee ID</span><span className="erp-info-value" style={{ fontFamily: 'monospace' }}>EMP-{selectedStaff.id.slice(-6).toUpperCase()}</span></div>
                          <div className="erp-info-item"><span className="erp-info-label">Designation</span><span className="erp-info-value">{selectedStaff.designation}</span></div>
                          <div className="erp-info-item"><span className="erp-info-label">Department</span><span className="erp-info-value">{selectedStaff.department}</span></div>
                          <div className="erp-info-item"><span className="erp-info-label">Role Classification</span><span className="erp-info-value">{selectedStaff.role}</span></div>
                          <div className="erp-info-item"><span className="erp-info-label">Joining Date</span><span className="erp-info-value">{selectedStaff.joining_date}</span></div>
                          <div className="erp-info-item"><span className="erp-info-label">Status</span><span className="erp-info-value"><span className={`status-pill ${selectedStaff.status.toLowerCase()}`} style={{ fontSize: '10px' }}>{selectedStaff.status.replace('_', ' ')}</span></span></div>
                          <div className="erp-info-item"><span className="erp-info-label">Blood Group</span><span className="erp-info-value">{selectedStaff.blood_type}</span></div>
                        </div>
                      </div>

                      <div className="erp-card">
                        <div className="erp-card-title"><Mail size={14} /> <span>Contact Information</span></div>
                        <div className="erp-info-grid">
                          <div className="erp-info-item"><span className="erp-info-label">Email</span><span className="erp-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} style={{ color: 'var(--text-muted)' }} /> {selectedStaff.email ?? 'Not mapped'}</span></div>
                          <div className="erp-info-item"><span className="erp-info-label">Phone</span><span className="erp-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} style={{ color: 'var(--text-muted)' }} /> {selectedStaff.phone ?? '—'}</span></div>
                          <div className="erp-info-item" style={{ gridColumn: 'span 2' }}><span className="erp-info-label">Address</span><span className="erp-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> {selectedStaff.address || '—'}</span></div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ASSIGNMENTS TAB */}
                  {activeTab === 'assignments' && (
                    <>
                      {/* KPI Summary */}
                      {(() => {
                        const summary = getTeacherAssignmentSummary(selectedStaff.id);
                        return (
                          <div className="stats-mini-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            <div className="stat-mini-card">
                              <span className="stat-mini-label">Subjects</span>
                              <span className="stat-mini-value primary">{summary.subjectNames.length}</span>
                            </div>
                            <div className="stat-mini-card">
                              <span className="stat-mini-label">Classes</span>
                              <span className="stat-mini-value info">{summary.classNames.length}</span>
                            </div>
                            <div className="stat-mini-card">
                              <span className="stat-mini-label">Sections</span>
                              <span className="stat-mini-value warning">{summary.sectionCodes.length}</span>
                            </div>
                            <div className="stat-mini-card">
                              <span className="stat-mini-label">Students</span>
                              <span className="stat-mini-value success">{summary.studentsCount}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Assignments Table */}
                      <div className="erp-card">
                        <div className="erp-card-title"><GraduationCap size={14} /> <span>Current Teaching Assignments</span></div>
                        {drawerResolvedAssignments.length === 0 ? (
                          <div className="drawer-empty-state">
                            <BookOpen size={32} />
                            <p>No assignments yet. Add one below.</p>
                          </div>
                        ) : (
                          <div className="drawer-table-wrapper">
                            <table className="drawer-table">
                              <thead>
                                <tr>
                                  <th>Class</th>
                                  <th>Section</th>
                                  <th>Subject</th>
                                  <th>Code</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {drawerResolvedAssignments.map(a => (
                                  <tr key={a.id}>
                                    <td style={{ fontWeight: 600 }}>{a.className}</td>
                                    <td>
                                      <span style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                                        {a.sectionCode}
                                      </span>
                                    </td>
                                    <td>{a.subjectName}</td>
                                    <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{a.subjectCode}</span></td>
                                    <td>
                                      <button
                                        className="btn-icon btn-icon-danger"
                                        onClick={() => handleDrawerRemoveAssignment(a.id)}
                                        title="Remove assignment"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Add Assignment Inline Form */}
                      <div className="erp-card">
                        <div className="erp-card-title"><Plus size={14} /> <span>Add New Assignment</span></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {/* Class */}
                          <div className="form-group">
                            <label className="form-label">Class</label>
                            <select className="form-select" value={drawerAddRow.class_id}
                              onChange={e => setDrawerAddRow(r => ({ ...r, class_id: e.target.value, section_id: '', subject_ids: [] }))}>
                              <option value="">Select Class</option>
                              {CLASSES.filter(c => c.status === 'ACTIVE').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          {/* Section */}
                          <div className="form-group">
                            <label className="form-label">Section</label>
                            <select className="form-select" value={drawerAddRow.section_id}
                              onChange={e => setDrawerAddRow(r => ({ ...r, section_id: e.target.value }))}
                              disabled={!drawerAddRow.class_id}>
                              <option value="">Select Section</option>
                              {sectionsForClass(drawerAddRow.class_id).map(s => (
                                <option key={s.id} value={s.id}>{s.code}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {/* Subjects */}
                        <div className="form-group" style={{ marginTop: 8 }}>
                          <label className="form-label">Subjects (select all that apply)</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                            {activeSubjects.map(s => (
                              <label key={s.id} style={{
                                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                                fontSize: '12px', padding: '4px 10px', borderRadius: 10,
                                border: `1.5px solid ${drawerAddRow.subject_ids.includes(s.id) ? 'var(--primary)' : 'var(--border-color)'}`,
                                backgroundColor: drawerAddRow.subject_ids.includes(s.id) ? 'rgba(99,102,241,0.08)' : 'transparent',
                                transition: 'all 0.15s'
                              }}>
                                <input type="checkbox"
                                  checked={drawerAddRow.subject_ids.includes(s.id)}
                                  onChange={() => {
                                    const ids = drawerAddRow.subject_ids.includes(s.id)
                                      ? drawerAddRow.subject_ids.filter(x => x !== s.id)
                                      : [...drawerAddRow.subject_ids, s.id];
                                    setDrawerAddRow(r => ({ ...r, subject_ids: ids }));
                                  }}
                                  style={{ accentColor: 'var(--primary)' }} />
                                {s.name}
                              </label>
                            ))}
                          </div>
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                          onClick={handleDrawerAddAssignment}
                          disabled={addingDrawerAssignment}
                        >
                          <Plus size={15} /> {addingDrawerAssignment ? 'Adding…' : 'Add Assignment'}
                        </button>
                      </div>
                    </>
                  )}

                  {/* ATTENDANCE TAB */}
                  {activeTab === 'attendance' && (
                    <>
                      <div className="attendance-header-actions">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CalendarCheck size={16} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>Punches for {attendanceMonth}</span>
                        </div>
                        <select className="month-selector" value={attendanceMonth} onChange={(e) => setAttendanceMonth(e.target.value)}>
                          {attendanceMonths.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="stats-mini-grid">
                        <div className="stat-mini-card"><span className="stat-mini-label">Present</span><span className="stat-mini-value success">{monthlyAttendanceMetrics.present}</span></div>
                        <div className="stat-mini-card"><span className="stat-mini-label">Late</span><span className="stat-mini-value warning">{monthlyAttendanceMetrics.late}</span></div>
                        <div className="stat-mini-card"><span className="stat-mini-label">Half Day</span><span className="stat-mini-value info">{monthlyAttendanceMetrics.halfDay}</span></div>
                        <div className="stat-mini-card"><span className="stat-mini-label">Leaves</span><span className="stat-mini-value warning">{monthlyAttendanceMetrics.leave}</span></div>
                        <div className="stat-mini-card"><span className="stat-mini-label">Punch Rate</span><span className="stat-mini-value primary">{monthlyAttendanceMetrics.percentage}%</span></div>
                      </div>
                      <div className="erp-card">
                        <div className="drawer-table-wrapper">
                          {filteredAttendance.length === 0 ? (
                            <div className="drawer-empty-state"><HelpCircle size={32} /><p>No records for this month.</p></div>
                          ) : (
                            <table className="drawer-table">
                              <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Remarks</th></tr></thead>
                              <tbody>
                                {filteredAttendance.map((a, idx) => (
                                  <tr key={idx}>
                                    <td style={{ fontWeight: 600 }}>{a.date}</td>
                                    <td>{a.checkIn ?? '—'}</td>
                                    <td>{a.checkOut ?? '—'}</td>
                                    <td><span className={`drawer-table-badge ${a.status.toLowerCase()}`}>{a.status.replace('_', ' ')}</span></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{a.remarks}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* LEAVES TAB */}
                  {activeTab === 'leaves' && (
                    <>
                      <div className="leave-balance-container">
                        <div className="leave-balance-card" style={{ borderLeft: '3px solid var(--primary)' }}>
                          <div className="stat-mini-label">Annual Leave Balance</div>
                          <div className="stat-mini-value primary">{details.leaveSummary.totalBalance} Days</div>
                        </div>
                        <div className="leave-balance-card" style={{ borderLeft: '3px solid var(--success)' }}>
                          <div className="stat-mini-label">Leaves Used</div>
                          <div className="stat-mini-value success">{details.leaveSummary.used} Days</div>
                        </div>
                        <div className="leave-balance-card" style={{ borderLeft: '3px solid var(--warning)' }}>
                          <div className="stat-mini-label">Remaining</div>
                          <div className="stat-mini-value warning">{details.leaveSummary.remaining} Days</div>
                        </div>
                      </div>
                      <div className="erp-card">
                        <div className="erp-card-title"><ClipboardList size={14} /> <span>Leave Request Ledger</span></div>
                        <div className="drawer-table-wrapper">
                          {details.leaveHistory.length === 0 ? (
                            <div className="drawer-empty-state"><HelpCircle size={32} /><p>No leave requests found.</p></div>
                          ) : (
                            <table className="drawer-table">
                              <thead><tr><th>Leave Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th><th>Approved By</th></tr></thead>
                              <tbody>
                                {details.leaveHistory.map((l, idx) => (
                                  <tr key={idx}>
                                    <td style={{ fontWeight: 600 }}>{l.leaveType}</td>
                                    <td>{l.startDate}</td>
                                    <td>{l.endDate}</td>
                                    <td style={{ fontWeight: 600 }}>{l.days} Day(s)</td>
                                    <td><span className={`drawer-table-badge ${l.status.toLowerCase()}`}>{l.status}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{l.approvedBy}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* PERFORMANCE TAB */}
                  {activeTab === 'performance' && (() => {
                    const summary = getTeacherAssignmentSummary(selectedStaff.id);
                    return (
                      <>
                        <div className="stats-mini-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                          <div className="stat-mini-card">
                            <span className="stat-mini-label">Assigned Classes</span>
                            <span className="stat-mini-value primary" style={{ fontSize: 12 }}>
                              {summary ? (summary.classNames.join(', ') || 'None') : (details.performance.assignedClasses.join(', ') || 'None')}
                            </span>
                          </div>
                          <div className="stat-mini-card">
                            <span className="stat-mini-label">Assigned Subjects</span>
                            <span className="stat-mini-value info" style={{ fontSize: '12px', lineHeight: '1.2', marginTop: 6 }}>
                              {summary ? (summary.subjectNames.join(', ') || 'None') : (details.performance.assignedSubjects.join(', ') || 'None')}
                            </span>
                          </div>
                          <div className="stat-mini-card">
                            <span className="stat-mini-label">Student Reach</span>
                            <span className="stat-mini-value success">
                              {summary ? summary.studentsCount : details.performance.totalStudents} Students
                            </span>
                          </div>
                        </div>
                        <div className="erp-card">
                          <div className="erp-card-title"><TrendingUp size={14} /> <span>Admin Evaluation Notes</span></div>
                          <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6', backgroundColor: 'rgba(99,102,241,0.05)', borderLeft: '3px solid var(--primary)', padding: '12px 16px', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                            {details.performance.notes}
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  {/* Quick Actions Panel */}
                  <div className="quick-actions-panel" style={{ marginTop: 20 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.5px' }}>
                      Admin HR Quick Actions
                    </div>
                    <div className="quick-actions-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <button className="quick-action-btn" onClick={() => handleQuickAction('edit')}><Edit2 size={16} /> <span>Edit Profile</span></button>
                      <button className="quick-action-btn" onClick={() => handleQuickAction('attendance')}><Calendar size={16} /> <span>Record Attendance</span></button>
                      <button className="quick-action-btn" onClick={() => handleQuickAction('leave')}><UserCheck size={16} /> <span>Approve Leaves</span></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>



      {/* ═══ CREATE / EDIT / DELETE MODAL ════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className={`modal-content ${modalType === 'delete' ? 'confirm' : ''}`}
            style={modalType !== 'delete' ? { maxWidth: 780, width: '95vw' } : {}}>
            <div className="modal-header">
              <h2>
                {modalType === 'create' ? (mode === 'teachers' ? 'Add Teacher' : 'Add Staff Member')
                  : modalType === 'edit' ? 'Edit Profile'
                  : 'Delete Staff Record'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: 24 }}>Delete <strong>{selected?.name} {selected?.surname}</strong>? This removes all payroll history and teaching assignments.</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* ─── Section 1: Personal Details ─── */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border-color)' }}>
                    Personal Information
                  </div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Username *</label><input className="form-input" value={form.username} onChange={f('username')} required /></div>
                    {modalType === 'create' && <div className="form-group"><label className="form-label">Password *</label><input type="password" className="form-input" value={form.password} onChange={f('password')} required minLength={8} /></div>}
                  </div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">First Name *</label><input className="form-input" value={form.name} onChange={f('name')} required /></div>
                    <div className="form-group"><label className="form-label">Last Name *</label><input className="form-input" value={form.surname} onChange={f('surname')} required /></div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={f('email')} /></div>
                    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={f('phone')} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={f('address')} /></div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Gender</label><select className="form-select" value={form.sex} onChange={f('sex')}><option value="MALE">Male</option><option value="FEMALE">Female</option></select></div>
                    <div className="form-group"><label className="form-label">Blood Type</label><select className="form-select" value={form.blood_type} onChange={f('blood_type')}>{BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}</select></div>
                  </div>
                  <div className="form-group"><label className="form-label">Birthday</label><input type="date" className="form-input" value={form.birthday} onChange={f('birthday')} /></div>
                </div>

                {/* ─── Section 2: HR Details ─── */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border-color)' }}>
                    HR Details
                  </div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Designation</label><select className="form-select" value={form.designation} onChange={f('designation')}>{DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">Department</label><select className="form-select" value={form.department} onChange={f('department')}>{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Joining Date</label><input type="date" className="form-input" value={form.joining_date} onChange={f('joining_date')} required /></div>
                    <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={f('status')}><option value="ACTIVE">Active</option><option value="ON_LEAVE">On Leave</option><option value="INACTIVE">Inactive</option></select></div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Monthly Salary (₹) *</label>
                      <input type="number" className="form-input" value={form.monthlySalary} onChange={f('monthlySalary')} required min={0} />
                    </div>
                  </div>
                </div>

                {/* ─── Section 3: Academic Assignments (teachers only) ─── */}
                {mode === 'teachers' && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border-color)' }}>
                      Academic Assignments — Class × Section × Subjects
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 12 }}>
                      Each row defines one class-section combination. Select all subjects the teacher will teach in that section.
                    </p>

                    {assignmentRows.map((row, idx) => (
                      <div key={idx} style={{
                        border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                        padding: 14, marginBottom: 10, position: 'relative',
                        backgroundColor: 'var(--bg-subtle, rgba(99,102,241,0.02))'
                      }}>
                        <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                          Row {idx + 1}
                        </div>
                        <div className="form-grid" style={{ marginBottom: 8 }}>
                          {/* Class dropdown */}
                          <div className="form-group">
                            <label className="form-label">Class</label>
                            <select className="form-select" value={row.class_id}
                              onChange={e => updateRow(idx, 'class_id', e.target.value)}>
                              <option value="">Select Class</option>
                              {CLASSES.filter(c => c.status === 'ACTIVE').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          {/* Section dropdown */}
                          <div className="form-group">
                            <label className="form-label">Section</label>
                            <select className="form-select" value={row.section_id}
                              onChange={e => updateRow(idx, 'section_id', e.target.value)}
                              disabled={!row.class_id}>
                              <option value="">Select Section</option>
                              {sectionsForClass(row.class_id).map(s => (
                                <option key={s.id} value={s.id}>{s.code} ({s.name})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Subject multi-checkboxes */}
                        <div className="form-group">
                          <label className="form-label">Subjects Taught in this Section</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {activeSubjects.map(s => (
                              <label key={s.id} style={{
                                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                                fontSize: '12px', padding: '3px 10px', borderRadius: 10,
                                border: `1.5px solid ${row.subject_ids.includes(s.id) ? 'var(--primary)' : 'var(--border-color)'}`,
                                backgroundColor: row.subject_ids.includes(s.id) ? 'rgba(99,102,241,0.08)' : 'transparent',
                                transition: 'all 0.15s'
                              }}>
                                <input type="checkbox"
                                  checked={row.subject_ids.includes(s.id)}
                                  onChange={() => toggleRowSubject(idx, s.id)}
                                  style={{ accentColor: 'var(--primary)' }} />
                                {s.name}
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Remove row button */}
                        {assignmentRows.length > 1 && (
                          <button type="button"
                            onClick={() => removeRow(idx)}
                            style={{ marginTop: 8, fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Trash2 size={12} /> Remove this row
                          </button>
                        )}
                      </div>
                    ))}

                    <button type="button"
                      onClick={() => setAssignmentRows(prev => [...prev, emptyRow()])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                        color: 'var(--primary)', background: 'rgba(99,102,241,0.07)', border: '1.5px dashed var(--primary)',
                        borderRadius: 'var(--radius-sm)', padding: '7px 14px', cursor: 'pointer', width: '100%', justifyContent: 'center'
                      }}>
                      <Plus size={13} /> Add Another Class / Section Row
                    </button>
                  </div>
                )}

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

export default Teachers;
