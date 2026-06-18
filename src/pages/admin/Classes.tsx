import React, { useState, useMemo } from 'react';
import { 
  CLASSES as initialClasses, 
  SECTIONS as initialSections, 
  TEACHER_ASSIGNMENTS as initialAssignments, 
  STUDENTS as initialStudents, 
  FEE_STRUCTURES as initialFees, 
  createClass, 
  updateClass, 
  deleteClass, 
  createSection, 
  updateSection, 
  deleteSection, 
  assignStudentToSection, 
  removeStudentFromSection, 
  assignTeacher, 
  removeTeacherAssignment, 
  createFeeStructure, 
  removeFeeStructure 
} from '../../data/academicMockData';
import { TEACHERS } from '../../data/mockData';
import { SUBJECTS } from '../../data/academicMockData';

import { AcademicClass, AcademicSection, TeacherAssignment, FeeItem } from '../../types/academic';
import { Student } from '../../types/student';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Search, 
  Users, 
  Briefcase, 
  CheckCircle, 
  FolderMinus,
  Settings,
  ArrowRightLeft
} from 'lucide-react';
import './Classes.css';

const Classes: React.FC = () => {
  // --- Central States ---
  const [classesList, setClassesList] = useState<AcademicClass[]>(initialClasses);
  const [sectionsList, setSectionsList] = useState<AcademicSection[]>(initialSections);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>(initialAssignments);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [feeStructures, setFeeStructures] = useState<FeeItem[]>(initialFees);

  // Active Tab: 'academic' | 'teachers' | 'fees'
  const [activeTab, setActiveTab] = useState<'academic' | 'teachers' | 'fees'>('academic');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Modals & Forms State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<
    'createClass' | 'editClass' | 'deleteClass' | 
    'createSection' | 'editSection' | 'deleteSection' |
    'assignStudent' | 'transferStudent' |
    'createFee' | 'deleteFee' | 'createAssignment'
  >('createClass');

  // Selected entities for updates
  const [selectedClass, setSelectedClass] = useState<AcademicClass | null>(null);
  const [selectedSection, setSelectedSection] = useState<AcademicSection | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFee, setSelectedFee] = useState<FeeItem | null>(null);

  // Form Fields
  const [className, setClassName] = useState<string>('');
  const [classCode, setClassCode] = useState<string>('');
  const [classDesc, setClassDesc] = useState<string>('');
  const [classYear, setClassYear] = useState<string>('ay-2026');
  const [classStatus, setClassStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const [sectionName, setSectionName] = useState<string>('');
  const [sectionCapacity, setSectionCapacity] = useState<number>(30);
  const [sectionSupervisor, setSectionSupervisor] = useState<string>('');

  const [assignStudentId, setAssignStudentId] = useState<string>('');
  const [transferClassId, setTransferClassId] = useState<string>('');
  const [transferSectionId, setTransferSectionId] = useState<string>('');

  const [feeName, setFeeName] = useState<string>('');
  const [feeAmount, setFeeAmount] = useState<number>(5000);
  const [feeClassId, setFeeClassId] = useState<string>('');

  const [asgTeacherId, setAsgTeacherId] = useState<string>('');
  const [asgClassId, setAsgClassId] = useState<string>('');
  const [asgSectionId, setAsgSectionId] = useState<string>('');
  const [asgSubjectId, setAsgSubjectId] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- Statistics ---
  const stats = useMemo(() => {
    const totalClasses = classesList.length;
    const totalSections = sectionsList.length;
    const totalStudents = students.filter(s => s.status === 'ACTIVE').length;
    const totalTeachers = TEACHERS.length;
    return { totalClasses, totalSections, totalStudents, totalTeachers };
  }, [classesList, sectionsList, students]);

  // --- Assigned Class/Section options helper ---
  const filteredSectionsForTransfer = useMemo(() => {
    return sectionsList.filter(s => s.class_id === transferClassId);
  }, [sectionsList, transferClassId]);

  const filteredSectionsForAssignment = useMemo(() => {
    return sectionsList.filter(s => s.class_id === asgClassId);
  }, [sectionsList, asgClassId]);

  // --- Students lists for assignment modal ---
  const unassignedStudents = useMemo(() => {
    return students.filter(s => !s.class_id || !s.grade_id);
  }, [students]);

  // Students in selected section
  const sectionStudents = useMemo(() => {
    if (!selectedSectionId) return [];
    return students.filter(s => s.grade_id === selectedSectionId);
  }, [students, selectedSectionId]);

  // --- Modal Open Handlers ---
  const openCreateClass = () => {
    setModalType('createClass');
    setClassName('');
    setClassCode('');
    setClassDesc('');
    setClassYear('ay-2026');
    setClassStatus('ACTIVE');
    setShowModal(true);
  };

  const openEditClass = (c: AcademicClass, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('editClass');
    setSelectedClass(c);
    setClassName(c.name);
    setClassCode(c.code);
    setClassDesc(c.description);
    setClassYear(c.academic_year_id);
    setClassStatus(c.status);
    setShowModal(true);
  };

  const openDeleteClass = (c: AcademicClass, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('deleteClass');
    setSelectedClass(c);
    setShowModal(true);
  };

  const openCreateSection = (cId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('createSection');
    asgClassId !== cId && setAsgClassId(cId); // Class context
    setSectionName('');
    setSectionCapacity(30);
    setSectionSupervisor(TEACHERS[0]?.id ?? '');
    setShowModal(true);
  };

  const openEditSection = (sec: AcademicSection, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('editSection');
    setSelectedSection(sec);
    setSectionName(sec.name);
    setSectionCapacity(sec.capacity);
    setSectionSupervisor(sec.supervisor_id ?? '');
    setShowModal(true);
  };

  const openDeleteSection = (sec: AcademicSection, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('deleteSection');
    setSelectedSection(sec);
    setShowModal(true);
  };

  const openAssignStudent = () => {
    if (unassignedStudents.length === 0) {
      triggerToast('All students are already assigned to sections.');
      return;
    }
    setModalType('assignStudent');
    setAssignStudentId(unassignedStudents[0]?.id ?? '');
    setShowModal(true);
  };

  const openTransferStudent = (s: Student) => {
    setModalType('transferStudent');
    setSelectedStudent(s);
    setTransferClassId(classesList[0]?.id ?? '');
    setTransferSectionId('');
    setShowModal(true);
  };

  const openCreateFee = () => {
    setModalType('createFee');
    setFeeName('');
    setFeeAmount(5000);
    setFeeClassId(classesList[0]?.id ?? '');
    setShowModal(true);
  };

  const openDeleteFee = (f: FeeItem) => {
    setModalType('deleteFee');
    setSelectedFee(f);
    setShowModal(true);
  };

  const openCreateAssignment = () => {
    setModalType('createAssignment');
    setAsgTeacherId(TEACHERS[0]?.id ?? '');
    setAsgClassId(classesList[0]?.id ?? '');
    setAsgSectionId('');
    setAsgSubjectId(SUBJECTS[0]?.id ?? '');
    setShowModal(true);
  };

  // --- CRUD Submission Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));

    if (modalType === 'createClass') {
      const newCls = createClass({
        name: className,
        code: classCode,
        academic_year_id: classYear,
        description: classDesc,
        status: classStatus
      });
      setClassesList(prev => [...prev, newCls]);
      triggerToast(`Class ${className} created.`);
    } else if (modalType === 'editClass' && selectedClass) {
      updateClass(selectedClass.id, {
        name: className,
        code: classCode,
        academic_year_id: classYear,
        description: classDesc,
        status: classStatus
      });
      setClassesList(prev => prev.map(c => c.id === selectedClass.id ? { 
        ...c, name: className, code: classCode, academic_year_id: classYear, description: classDesc, status: classStatus 
      } : c));
      triggerToast(`Class details updated.`);
    } else if (modalType === 'createSection') {
      const parentClass = classesList.find(c => c.id === asgClassId);
      const newSec = createSection({
        class_id: asgClassId,
        name: sectionName,
        code: parentClass ? `${parentClass.code}-${sectionName}` : sectionName,
        supervisor_id: sectionSupervisor || null,
        capacity: sectionCapacity
      });
      setSectionsList(prev => [...prev, newSec]);
      triggerToast(`Section ${sectionName} created.`);
    } else if (modalType === 'editSection' && selectedSection) {
      updateSection(selectedSection.id, {
        name: sectionName,
        supervisor_id: sectionSupervisor || null,
        capacity: sectionCapacity
      });
      setSectionsList(prev => prev.map(s => s.id === selectedSection.id ? { 
        ...s, name: sectionName, supervisor_id: sectionSupervisor || null, capacity: sectionCapacity 
      } : s));
      triggerToast(`Section details updated.`);
    } else if (modalType === 'assignStudent' && selectedSectionId) {
      const targetSection = sectionsList.find(s => s.id === selectedSectionId);
      if (targetSection) {
        assignStudentToSection(assignStudentId, targetSection.class_id, selectedSectionId);
        // Sync state
        setStudents(prev => prev.map(s => s.id === assignStudentId ? { 
          ...s, class_id: targetSection.class_id, grade_id: selectedSectionId 
        } : s));
        triggerToast('Student assigned successfully.');
      }
    } else if (modalType === 'transferStudent' && selectedStudent) {
      if (!transferSectionId) {
        triggerToast('Please select a valid section for transfer.');
        setSaving(false);
        return;
      }
      assignStudentToSection(selectedStudent.id, transferClassId, transferSectionId);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { 
        ...s, class_id: transferClassId, grade_id: transferSectionId 
      } : s));
      triggerToast(`Student ${selectedStudent.name} transferred.`);
    } else if (modalType === 'createFee') {
      const newFee = createFeeStructure({
        name: feeName,
        amount: feeAmount,
        class_id: feeClassId
      });
      setFeeStructures(prev => [...prev, newFee]);
      triggerToast(`Fee structure component added.`);
    } else if (modalType === 'createAssignment') {
      if (!asgSectionId) {
        triggerToast('Please select a target Section.');
        setSaving(false);
        return;
      }
      const newAsg = assignTeacher(asgTeacherId, asgClassId, asgSectionId, asgSubjectId);
      setAssignments(prev => [...prev, newAsg]);
      triggerToast('Teacher mapping assignment recorded.');
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));

    if (modalType === 'deleteClass' && selectedClass) {
      deleteClass(selectedClass.id);
      setClassesList(prev => prev.filter(c => c.id !== selectedClass.id));
      setSectionsList(prev => prev.filter(s => s.class_id !== selectedClass.id));
      triggerToast(`Class and sections archived/deleted.`);
    } else if (modalType === 'deleteSection' && selectedSection) {
      deleteSection(selectedSection.id);
      setSectionsList(prev => prev.filter(s => s.id !== selectedSection.id));
      setStudents(prev => prev.map(s => s.grade_id === selectedSection.id ? { ...s, class_id: '', grade_id: '' } : s));
      if (selectedSectionId === selectedSection.id) setSelectedSectionId(null);
      triggerToast(`Section removed.`);
    } else if (modalType === 'deleteFee' && selectedFee) {
      removeFeeStructure(selectedFee.id);
      setFeeStructures(prev => prev.filter(f => f.id !== selectedFee.id));
      triggerToast('Fee structure component deleted.');
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleRemoveStudent = (sId: string) => {
    removeStudentFromSection(sId);
    setStudents(prev => prev.map(s => s.id === sId ? { ...s, class_id: '', grade_id: '' } : s));
    triggerToast('Student removed from section.');
  };

  const handleRemoveAsg = (asgId: string) => {
    removeTeacherAssignment(asgId);
    setAssignments(prev => prev.filter(a => a.id !== asgId));
    triggerToast('Teacher assignment removed.');
  };

  // --- Section Details Expand ---
  const handleSectionClick = (secId: string) => {
    setSelectedSectionId(secId === selectedSectionId ? null : secId);
  };

  // --- Dynamic Search Filters ---
  const filteredClasses = useMemo(() => {
    return classesList.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classesList, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Overlay */}
      {toastMessage && (
        <div className="erp-toast">
          <CheckCircle size={16} /> <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Academic Classes & Structure</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Administer central classes hierarchy, assign sections, map teachers, and configure fee schedules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {activeTab === 'academic' && (
            <button className="btn btn-primary" onClick={openCreateClass}>
              <Plus size={18} /> <span>Create Class</span>
            </button>
          )}
          {activeTab === 'teachers' && (
            <button className="btn btn-primary" onClick={openCreateAssignment}>
              <Plus size={18} /> <span>Assign Teacher</span>
            </button>
          )}
          {activeTab === 'fees' && (
            <button className="btn btn-primary" onClick={openCreateFee}>
              <Plus size={18} /> <span>Create Fee Structure</span>
            </button>
          )}
        </div>
      </div>

      {/* Dashboard KPI cards */}
      <div className="classes-kpi-grid">
        <div className="class-kpi-card">
          <FolderMinus size={22} className="kpi-icon primary" />
          <div>
            <div className="kpi-label">Total Classes</div>
            <div className="kpi-val">{stats.totalClasses} Levels</div>
          </div>
        </div>
        <div className="class-kpi-card">
          <Settings size={22} className="kpi-icon info" />
          <div>
            <div className="kpi-label">Active Sections</div>
            <div className="kpi-val">{stats.totalSections} Groups</div>
          </div>
        </div>
        <div className="class-kpi-card">
          <Users size={22} className="kpi-icon success" />
          <div>
            <div className="kpi-label">Rostered Students</div>
            <div className="kpi-val">{stats.totalStudents} Registered</div>
          </div>
        </div>
        <div className="class-kpi-card">
          <Briefcase size={22} className="kpi-icon warning" />
          <div>
            <div className="kpi-label">Assigned Teachers</div>
            <div className="kpi-val">{stats.totalTeachers} Faculty</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="classes-tabs-container">
        <button 
          className={`classes-tab ${activeTab === 'academic' ? 'active' : ''}`}
          onClick={() => setActiveTab('academic')}
        >
          Classes & Sections
        </button>
        <button 
          className={`classes-tab ${activeTab === 'teachers' ? 'active' : ''}`}
          onClick={() => setActiveTab('teachers')}
        >
          Teacher Subject Mapping
        </button>
        <button 
          className={`classes-tab ${activeTab === 'fees' ? 'active' : ''}`}
          onClick={() => setActiveTab('fees')}
        >
          ERP Fee Configurations
        </button>
      </div>

      {/* TABS CONTAINER BODY */}

      {/* TAB 1: CLASSES AND SECTIONS HIERARCHY */}
      {activeTab === 'academic' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          
          {/* Search Bar */}
          <div className="classes-search-wrapper">
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="search-input" 
              style={{ paddingLeft: 42, width: '100%' }}
              placeholder="Search classes by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="classes-split-grid">
            {/* Left: Class Cards list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredClasses.length === 0 ? (
                <div className="classes-empty-view">
                  <FolderMinus size={40} />
                  <h3>No Classes Defined</h3>
                  <p>Create a class level to begin configuring your school structure.</p>
                </div>
              ) : (
                filteredClasses.map(c => {
                  const classSections = sectionsList.filter(s => s.class_id === c.id);
                  const isExpanded = expandedClass === c.id;
                  
                  // Total students in this class level
                  const classStudentsCount = students.filter(s => s.class_id === c.id).length;

                  return (
                    <div 
                      key={c.id} 
                      className={`cls-main-card ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => setExpandedClass(isExpanded ? null : c.id)}
                    >
                      <div className="cls-card-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h3 className="cls-card-title">{c.name}</h3>
                            <span className="cls-card-code">{c.code}</span>
                          </div>
                          <p className="cls-card-desc">{c.description || 'No description provided'}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={e => e.stopPropagation()}>
                          <button className="btn-icon" onClick={(e) => openEditClass(c, e)} title="Edit Class Details">
                            <Edit2 size={13} />
                          </button>
                          <button className="btn-icon btn-icon-danger" onClick={(e) => openDeleteClass(c, e)} title="Delete Class & Sections">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="cls-card-meta">
                        <span className="meta-badge"><Settings size={12} /> {classSections.length} Sections</span>
                        <span className="meta-badge"><Users size={12} /> {classStudentsCount} Students</span>
                        <span className="meta-badge active"><CheckCircle size={12} /> Active</span>
                      </div>

                      {/* Expanded Section List */}
                      {isExpanded && (
                        <div className="cls-sections-list" onClick={e => e.stopPropagation()}>
                          <div className="sections-list-header">
                            <h4>Assigned Sections ({classSections.length})</h4>
                            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }} onClick={(e) => openCreateSection(c.id, e)}>
                              <Plus size={12} /> <span>Add Section</span>
                            </button>
                          </div>
                          
                          {classSections.length === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No sections defined. Click Add Section to build.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {classSections.map(sec => {
                                const secStudentsCount = students.filter(s => s.grade_id === sec.id).length;
                                const isSelected = selectedSectionId === sec.id;
                                const supervisorName = TEACHERS.find(t => t.id === sec.supervisor_id);
                                const availableSeats = Math.max(0, sec.capacity - secStudentsCount);
                                const strengthPercent = Math.min(100, Math.round((secStudentsCount / sec.capacity) * 100));

                                return (
                                  <div 
                                    key={sec.id} 
                                    className={`cls-section-row ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleSectionClick(sec.id)}
                                  >
                                    <div className="section-row-info">
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="sec-letter-badge">{sec.name}</span>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: 13 }}>Section {sec.name} (Code: {sec.code})</div>
                                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Class Teacher: {supervisorName ? `${supervisorName.name} ${supervisorName.surname}` : 'Unassigned'}</div>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                        <div style={{ textAlign: 'right' }}>
                                          <div style={{ fontSize: 12, fontWeight: 600 }}>{secStudentsCount} / {sec.capacity} Seats</div>
                                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{availableSeats} Available</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                          <button className="btn-icon" onClick={(e) => openEditSection(sec, e)} title="Edit Section">
                                            <Edit2 size={12} />
                                          </button>
                                          <button className="btn-icon btn-icon-danger" onClick={(e) => openDeleteSection(sec, e)} title="Delete Section">
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Strength Progress Bar */}
                                    <div className="section-capacity-bar">
                                      <div className="bar-fill" style={{ width: `${strengthPercent}%`, backgroundColor: strengthPercent > 90 ? 'var(--danger)' : strengthPercent > 70 ? 'var(--warning)' : 'var(--success)' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Section Details & Student Assignment Roster */}
            <div className="classes-roster-side">
              {selectedSectionId ? (
                (() => {
                  const sec = sectionsList.find(s => s.id === selectedSectionId);
                  const parentCls = classesList.find(c => c?.id === sec?.class_id);
                  if (!sec || !parentCls) return null;

                  return (
                    <div className="erp-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Roster: {parentCls.name} - Section {sec.name}</h3>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            Class code: {sec.code} | Max capacity: {sec.capacity} students
                          </p>
                        </div>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={openAssignStudent}>
                          <Plus size={14} /> <span>Assign Student</span>
                        </button>
                      </div>

                      <div className="roster-students-list">
                        {sectionStudents.length === 0 ? (
                          <div className="classes-empty-view" style={{ padding: '30px 10px' }}>
                            <Users size={32} style={{ color: 'var(--text-muted)' }} />
                            <h4 style={{ marginTop: 10 }}>No Students Assigned</h4>
                            <p style={{ fontSize: 11 }}>Click "Assign Student" to map roster profiles.</p>
                          </div>
                        ) : (
                          <div className="drawer-table-wrapper">
                            <table className="drawer-table" style={{ fontSize: 12 }}>
                              <thead>
                                <tr>
                                  <th>Roll No</th>
                                  <th>Name</th>
                                  <th>Parent Phone</th>
                                  <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sectionStudents.map(s => (
                                  <tr key={s.id}>
                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.roll_number}</td>
                                    <td style={{ fontWeight: 600 }}>{s.name} {s.surname}</td>
                                    <td>{s.phone || '—'}</td>
                                    <td>
                                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                                        <button className="btn-icon" onClick={() => openTransferStudent(s)} title="Transfer Student to other section">
                                          <ArrowRightLeft size={11} />
                                        </button>
                                        <button className="btn-icon btn-icon-danger" onClick={() => handleRemoveStudent(s.id)} title="Remove Student from class">
                                          <X size={11} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="classes-empty-view" style={{ height: '100%', minHeight: 300, justifyContent: 'center' }}>
                  <Users size={40} />
                  <h3>Roster Details</h3>
                  <p>Click on any class level and select a Section to load the student assignment roster.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEACHER SUBJECT ASSIGNMENTS */}
      {activeTab === 'teachers' && (
        <div className="erp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>Assigned Faculty mappings</h3>
          </div>
          
          <div className="drawer-table-wrapper">
            <table className="drawer-table">
              <thead>
                <tr>
                  <th>Teacher Name</th>
                  <th>Class Level</th>
                  <th>Assigned Section</th>
                  <th>Subject</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(asg => {
                  const teacher = TEACHERS.find(t => t.id === asg.teacher_id);
                  const cls = classesList.find(c => c.id === asg.class_id);
                  const sec = sectionsList.find(s => s.id === asg.section_id);
                  const subject = SUBJECTS.find(s => s.id === asg.subject_id);

                  return (
                    <tr key={asg.id}>
                      <td style={{ fontWeight: 600 }}>{teacher ? `${teacher.name} ${teacher.surname}` : 'Unknown'}</td>
                      <td>{cls ? cls.name : 'Unknown Class'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{sec ? `Section ${sec.name}` : 'Unknown Section'}</td>
                      <td>
                        <span className="badge badge-primary">{subject ? subject.name : 'General'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button className="btn-icon btn-icon-danger" onClick={() => handleRemoveAsg(asg.id)} title="Delete Assignment">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FEE STRUCTURES */}
      {activeTab === 'fees' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {classesList.map(c => {
            const classFees = feeStructures.filter(f => f.class_id === c.id);
            const totalFeeSum = classFees.reduce((sum, f) => sum + f.amount, 0);
            const classStudents = students.filter(s => s.class_id === c.id);

            return (
              <div key={c.id} className="erp-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{c.name} Fee Structure</h3>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Inherited by {classStudents.length} students</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>₹{totalFeeSum.toLocaleString('en-IN')}</div>
                </div>

                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {classFees.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>No fee components configured for this class level.</p>
                  ) : (
                    classFees.map(f => (
                      <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: 4 }}>
                        <span>{f.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 600 }}>₹{f.amount.toLocaleString()}</span>
                          <button className="btn-icon btn-icon-danger" style={{ padding: 4 }} onClick={() => openDeleteFee(f)}>
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL POPUPS */}
      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>
                {modalType === 'createClass' ? 'Add New Class Level'
                  : modalType === 'editClass' ? 'Edit Class Level'
                  : modalType === 'deleteClass' ? 'Delete Class Level'
                  : modalType === 'createSection' ? 'Add Section'
                  : modalType === 'editSection' ? 'Edit Section'
                  : modalType === 'deleteSection' ? 'Delete Section'
                  : modalType === 'assignStudent' ? 'Assign Student to Roster'
                  : modalType === 'transferStudent' ? 'Transfer Student Roster'
                  : modalType === 'createFee' ? 'Create Fee Component'
                  : modalType === 'deleteFee' ? 'Remove Fee Component'
                  : 'Assign Faculty Subject'
                }
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {/* DELETE CLASS/SECTION/FEE FORM */}
            {['deleteClass', 'deleteSection', 'deleteFee'].includes(modalType) ? (
              <div>
                <p style={{ marginBottom: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
                  {modalType === 'deleteClass' && `Are you sure you want to delete class level ${selectedClass?.name}? This will cascade delete all associated sections and unassign students.`}
                  {modalType === 'deleteSection' && `Are you sure you want to remove section ${selectedSection?.code}? Assigned students will be set as unassigned.`}
                  {modalType === 'deleteFee' && `Are you sure you want to remove the ${selectedFee?.name} fee component? Affected students ledgers will recalculate immediately.`}
                </p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
            ) : (
              /* CREATE / EDIT SUBMISSIONS */
              <form onSubmit={handleSubmit}>
                {/* CREATE / EDIT CLASS FIELDS */}
                {['createClass', 'editClass'].includes(modalType) && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Class Name *</label>
                      <input className="form-input" value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. Class 10" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Class Code *</label>
                      <input className="form-input" value={classCode} onChange={e => setClassCode(e.target.value)} placeholder="e.g. C10" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Academic Year</label>
                      <select className="form-select" value={classYear} onChange={e => setClassYear(e.target.value)}>
                        <option value="ay-2026">2026-27 (ACTIVE)</option>
                        <option value="ay-2025">2025-26 (INACTIVE)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input className="form-input" value={classDesc} onChange={e => setClassDesc(e.target.value)} placeholder="e.g. Higher Secondary Tenth Grade" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={classStatus} onChange={e => setClassStatus(e.target.value as 'ACTIVE' | 'ARCHIVED')}>
                        <option value="ACTIVE">Active</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  </>
                )}

                {/* CREATE / EDIT SECTION FIELDS */}
                {['createSection', 'editSection'].includes(modalType) && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Section Name *</label>
                      <input className="form-input" value={sectionName} onChange={e => setSectionName(e.target.value)} placeholder="e.g. A" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Maximum Strength (Capacity) *</label>
                      <input type="number" className="form-input" value={sectionCapacity} onChange={e => setSectionCapacity(parseInt(e.target.value))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Class Supervisor (Teacher)</label>
                      <select className="form-select" value={sectionSupervisor} onChange={e => setSectionSupervisor(e.target.value)}>
                        <option value="">Select Supervisor</option>
                        {TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name} {t.surname}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* ASSIGN STUDENT FIELDS */}
                {modalType === 'assignStudent' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Select Unassigned Student *</label>
                      <select className="form-select" value={assignStudentId} onChange={e => setAssignStudentId(e.target.value)} required>
                        {unassignedStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.name} {s.surname} (Roll: {s.roll_number || '—'})</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* TRANSFER STUDENT FIELDS */}
                {modalType === 'transferStudent' && selectedStudent && (
                  <>
                    <div style={{ fontSize: 13, backgroundColor: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 6, marginBottom: 14 }}>
                      <strong>Transferring Student:</strong> {selectedStudent.name} {selectedStudent.surname} <br />
                      <strong>Current Class:</strong> {classesList.find(c => c.id === selectedStudent.class_id)?.name || 'Unassigned'} - Section {sectionsList.find(s => s.id === selectedStudent.grade_id)?.name || 'Unassigned'}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Target Class Level *</label>
                      <select className="form-select" value={transferClassId} onChange={e => { setTransferClassId(e.target.value); setTransferSectionId(''); }} required>
                        {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Target Section Group *</label>
                      <select className="form-select" value={transferSectionId} onChange={e => setTransferSectionId(e.target.value)} required>
                        <option value="">Select Section</option>
                        {filteredSectionsForTransfer.map(sec => (
                          <option key={sec.id} value={sec.id}>Section {sec.name} (Strength: {students.filter(s => s.grade_id === sec.id).length}/{sec.capacity})</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* CREATE FEE FIELDS */}
                {modalType === 'createFee' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Fee Item Name *</label>
                      <input className="form-input" value={feeName} onChange={e => setFeeName(e.target.value)} placeholder="e.g. Tuition Fee" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount (₹) *</label>
                      <input type="number" className="form-input" value={feeAmount} onChange={e => setFeeAmount(parseInt(e.target.value))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Class Level Assignment *</label>
                      <select className="form-select" value={feeClassId} onChange={e => setFeeClassId(e.target.value)} required>
                        {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* CREATE TEACHER ASSIGNMENT */}
                {modalType === 'createAssignment' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Select Teacher *</label>
                      <select className="form-select" value={asgTeacherId} onChange={e => setAsgTeacherId(e.target.value)} required>
                        {TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name} {t.surname}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Class Level *</label>
                      <select className="form-select" value={asgClassId} onChange={e => { setAsgClassId(e.target.value); setAsgSectionId(''); }} required>
                        {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section Group *</label>
                      <select className="form-select" value={asgSectionId} onChange={e => setAsgSectionId(e.target.value)} required>
                        <option value="">Select Section</option>
                        {filteredSectionsForAssignment.map(sec => (
                          <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subject Taught *</label>
                      <select className="form-select" value={asgSubjectId} onChange={e => setAsgSubjectId(e.target.value)} required>
                        {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </>
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

export default Classes;
