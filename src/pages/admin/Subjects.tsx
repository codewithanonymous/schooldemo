import React, { useState, useMemo } from 'react';
import {
  SUBJECTS,
  SUBJECT_CLASS_MAPPINGS,
  CLASSES,
  SECTIONS,
  createSubject,
  updateSubject,
  deleteSubject,
  addSubjectMapping,
  removeSubjectMapping,
  Subject,
  SubjectClassMapping
} from '../../data/academicMockData';
import { Search, Plus, Edit2, Trash2, X, CheckCircle, BookOpen, Settings, Link } from 'lucide-react';


const DEPARTMENTS = [
  'Mathematics & Computer Science',
  'Sciences',
  'Languages & Humanities',
  'Physical Education',
  'General Education',
  'Arts & Culture',
  'Vocational Studies',
];

const emptyForm = (): Omit<Subject, 'id' | 'created_at'> => ({
  name: '',
  code: '',
  description: '',
  department: DEPARTMENTS[0],
  maxMarks: 100,
  passMarks: 35,
  status: 'ACTIVE',
});

const SubjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subjects' | 'mappings'>('subjects');

  // ─── Subjects State ───────────────────────────────────────────────────────
  const [subjectsList, setSubjectsList] = useState<Subject[]>(SUBJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // ─── CRUD Modal ───────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete'>('create');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // ─── Mapping State ────────────────────────────────────────────────────────
  const [mappingsList, setMappingsList] = useState<SubjectClassMapping[]>(SUBJECT_CLASS_MAPPINGS);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapClassId, setMapClassId] = useState(CLASSES[0]?.id ?? '');
  const [mapSectionId, setMapSectionId] = useState('');
  const [mapSubjectId, setMapSubjectId] = useState(SUBJECTS[0]?.id ?? '');
  const [savingMap, setSavingMap] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── Filtered Subjects ────────────────────────────────────────────────────
  const filteredSubjects = useMemo(() => {
    return subjectsList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = deptFilter === 'All' || s.department === deptFilter;
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [subjectsList, searchQuery, deptFilter, statusFilter]);

  const totalPages = Math.ceil(filteredSubjects.length / ITEMS_PER_PAGE);
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredSubjects.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  // ─── Modal Handlers ───────────────────────────────────────────────────────
  const openCreate = () => {
    setModalType('create');
    setSelectedSubject(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (s: Subject) => {
    setModalType('edit');
    setSelectedSubject(s);
    setForm({
      name: s.name,
      code: s.code,
      description: s.description,
      department: s.department,
      maxMarks: s.maxMarks,
      passMarks: s.passMarks,
      status: s.status,
    });
    setShowModal(true);
  };

  const openDelete = (s: Subject) => {
    setModalType('delete');
    setSelectedSubject(s);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));

    if (modalType === 'create') {
      const created = createSubject(form);
      setSubjectsList([...SUBJECTS]);
      triggerToast(`Subject "${created.name}" created successfully.`);
    } else if (modalType === 'edit' && selectedSubject) {
      updateSubject(selectedSubject.id, form);
      setSubjectsList([...SUBJECTS]);
      triggerToast(`Subject "${form.name}" updated successfully.`);
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!selectedSubject) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 350));
    deleteSubject(selectedSubject.id);
    setSubjectsList([...SUBJECTS]);
    setMappingsList([...SUBJECT_CLASS_MAPPINGS]);
    setSaving(false);
    setShowModal(false);
    triggerToast(`Subject "${selectedSubject.name}" deleted. Related mappings removed.`);
  };

  // ─── Mapping Handlers ─────────────────────────────────────────────────────
  const sectionsForMapClass = useMemo(() => {
    return SECTIONS.filter(s => s.class_id === mapClassId);
  }, [mapClassId]);

  const openAddMapping = () => {
    setMapClassId(CLASSES[0]?.id ?? '');
    setMapSectionId('');
    setMapSubjectId(SUBJECTS.filter(s => s.status === 'ACTIVE')[0]?.id ?? '');
    setShowMapModal(true);
  };

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMap(true);
    await new Promise(r => setTimeout(r, 350));

    // Check for duplicate
    const exists = SUBJECT_CLASS_MAPPINGS.some(m =>
      m.subject_id === mapSubjectId &&
      m.class_id === mapClassId &&
      m.section_id === mapSectionId
    );
    if (exists) {
      triggerToast('This mapping already exists.');
      setSavingMap(false);
      setShowMapModal(false);
      return;
    }

    addSubjectMapping({ subject_id: mapSubjectId, class_id: mapClassId, section_id: mapSectionId });
    setMappingsList([...SUBJECT_CLASS_MAPPINGS]);
    setSavingMap(false);
    setShowMapModal(false);
    const subj = SUBJECTS.find(s => s.id === mapSubjectId);
    const cls = CLASSES.find(c => c.id === mapClassId);
    triggerToast(`"${subj?.name}" mapped to ${cls?.name} successfully.`);
  };

  const handleRemoveMapping = (id: string) => {
    removeSubjectMapping(id);
    setMappingsList([...SUBJECT_CLASS_MAPPINGS]);
    triggerToast('Subject mapping removed.');
  };

  // ─── KPI Stats ────────────────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const total = subjectsList.length;
    const active = subjectsList.filter(s => s.status === 'ACTIVE').length;
    const inactive = subjectsList.filter(s => s.status === 'INACTIVE').length;
    const mappingCount = mappingsList.length;
    return { total, active, inactive, mappingCount };
  }, [subjectsList, mappingsList]);

  const getDeptColor = (dept: string) => {
    const colors: Record<string, string> = {
      'Mathematics & Computer Science': '#6366f1',
      'Sciences': '#10b981',
      'Languages & Humanities': '#f59e0b',
      'Physical Education': '#ef4444',
      'General Education': '#3b82f6',
      'Arts & Culture': '#a855f7',
      'Vocational Studies': '#14b8a6',
    };
    return colors[dept] || 'var(--primary)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Toast */}
      {toastMessage && (
        <div className="erp-toast">
          <CheckCircle size={16} /> <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Subject Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Define curriculum subjects, manage departments, and map subjects to class levels.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {activeTab === 'subjects' && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={18} /> <span>Add Subject</span>
            </button>
          )}
          {activeTab === 'mappings' && (
            <button className="btn btn-primary" onClick={openAddMapping}>
              <Link size={18} /> <span>Assign Subject to Class</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="stat-mini-card" style={{ flexDirection: 'row', gap: 14, padding: '16px 20px' }}>
          <BookOpen size={24} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div>
            <div className="stat-mini-label">Total Subjects</div>
            <div className="stat-mini-value primary">{kpiStats.total}</div>
          </div>
        </div>
        <div className="stat-mini-card" style={{ flexDirection: 'row', gap: 14, padding: '16px 20px' }}>
          <CheckCircle size={24} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <div>
            <div className="stat-mini-label">Active Subjects</div>
            <div className="stat-mini-value success">{kpiStats.active}</div>
          </div>
        </div>
        <div className="stat-mini-card" style={{ flexDirection: 'row', gap: 14, padding: '16px 20px' }}>
          <Settings size={24} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <div>
            <div className="stat-mini-label">Inactive</div>
            <div className="stat-mini-value warning">{kpiStats.inactive}</div>
          </div>
        </div>
        <div className="stat-mini-card" style={{ flexDirection: 'row', gap: 14, padding: '16px 20px' }}>
          <Link size={24} style={{ color: 'var(--info)', flexShrink: 0 }} />
          <div>
            <div className="stat-mini-label">Class Mappings</div>
            <div className="stat-mini-value info">{kpiStats.mappingCount}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="classes-tabs-container">
        <button
          className={`classes-tab ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          Subject Catalogue
        </button>
        <button
          className={`classes-tab ${activeTab === 'mappings' ? 'active' : ''}`}
          onClick={() => setActiveTab('mappings')}
        >
          Class-Subject Mapping
        </button>
      </div>

      {/* ── TAB 1: Subjects List ── */}
      {activeTab === 'subjects' && (
        <>
          {/* Filters */}
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Department</label>
              <select className="filter-select" value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setCurrentPage(1); }}>
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Status</label>
              <select className="filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                <option value="All">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="filter-group" style={{ gridColumn: 'span 2' }}>
              <label className="filter-label">Search Subjects</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="filter-input"
                  style={{ paddingLeft: 34, width: '100%' }}
                  placeholder="Search by name, code, or department..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>
          </div>

          {/* Subjects Table */}
          <div className="table-card">
            {pageItems.length === 0 ? (
              <div className="drawer-empty-state" style={{ padding: '60px 0' }}>
                <BookOpen size={40} />
                <h2>No Subjects Found</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                  Adjust your filters or add a new subject to get started.
                </p>
              </div>
            ) : (
              <div className="erp-table-wrapper">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Department</th>
                      <th>Max / Pass Marks</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(s => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.description || 'No description'}</div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: 12,
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: `${getDeptColor(s.department)}22`,
                            color: getDeptColor(s.department),
                            border: `1px solid ${getDeptColor(s.department)}44`
                          }}>
                            {s.code}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.department}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.maxMarks}</span>
                            <span style={{ color: 'var(--text-muted)' }}> / pass </span>
                            <span style={{ fontWeight: 600, color: 'var(--success)' }}>{s.passMarks}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${s.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn-icon" onClick={() => openEdit(s)} title="Edit Subject">
                              <Edit2 size={13} />
                            </button>
                            <button className="btn-icon btn-icon-danger" onClick={() => openDelete(s)} title="Delete Subject">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredSubjects.length > ITEMS_PER_PAGE && (
              <div className="pagination">
                <span className="pagination-info">
                  Showing <strong>{pageStart + 1}</strong> – <strong>{Math.min(pageStart + ITEMS_PER_PAGE, filteredSubjects.length)}</strong> of <strong>{filteredSubjects.length}</strong> subjects
                </span>
                <div className="pagination-buttons">
                  <button className="btn btn-secondary" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</button>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>Page {currentPage} of {totalPages}</span>
                  <button className="btn btn-secondary" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB 2: Class-Subject Mappings ── */}
      {activeTab === 'mappings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {CLASSES.map(cls => {
            const classMappings = mappingsList.filter(m => m.class_id === cls.id);
            return (
              <div key={cls.id} className="erp-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{cls.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{classMappings.length} subject(s) assigned</p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: 12 }}
                    onClick={() => {
                      setMapClassId(cls.id);
                      setMapSectionId('');
                      setMapSubjectId(SUBJECTS.filter(s => s.status === 'ACTIVE')[0]?.id ?? '');
                      setShowMapModal(true);
                    }}
                  >
                    <Plus size={13} /> <span>Add Subject</span>
                  </button>
                </div>
                {classMappings.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                    No subjects mapped. Use the button above to assign subjects to this class.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {classMappings.map(m => {
                      const subj = SUBJECTS.find(s => s.id === m.subject_id);
                      const sec = m.section_id ? SECTIONS.find(s => s.id === m.section_id) : null;
                      if (!subj) return null;
                      return (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 12px 6px 10px',
                            borderRadius: 20,
                            backgroundColor: `${getDeptColor(subj.department)}18`,
                            border: `1px solid ${getDeptColor(subj.department)}40`,
                            fontSize: 13,
                          }}
                        >
                          <span style={{ fontWeight: 700, color: getDeptColor(subj.department), fontFamily: 'monospace', fontSize: 11 }}>{subj.code}</span>
                          <span style={{ fontWeight: 600 }}>{subj.name}</span>
                          {sec && <span style={{ fontSize: 10, color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 10 }}>Section {sec.name}</span>}
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center', marginLeft: 2 }}
                            onClick={() => handleRemoveMapping(m.id)}
                            title="Remove mapping"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CRUD MODAL ── */}
      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2>
                {modalType === 'create' ? 'Add New Subject'
                  : modalType === 'edit' ? 'Edit Subject'
                    : 'Delete Subject'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
                  Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{selectedSubject?.name}</strong>?
                </p>
                <p style={{ marginBottom: 24, color: 'var(--danger)', fontSize: 12 }}>
                  This will also remove all class-subject mappings and teacher assignments for this subject. This action cannot be undone.
                </p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete Subject'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Subject Name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Advanced Mathematics" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject Code *</label>
                    <input className="form-input" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. MATH" maxLength={8} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Department</label>
                    <select className="form-input" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maximum Marks</label>
                    <input type="number" className="form-input" value={form.maxMarks} min={10} max={500}
                      onChange={e => setForm(p => ({ ...p, maxMarks: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pass Marks</label>
                    <input type="number" className="form-input" value={form.passMarks} min={1}
                      max={form.maxMarks}
                      onChange={e => setForm(p => ({ ...p, passMarks: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Description</label>
                    <input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief overview of the subject curriculum..." />
                  </div>
                </div>
                <div className="modal-footer" style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Subject'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── ADD MAPPING MODAL ── */}
      {showMapModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2>Assign Subject to Class</h2>
              <button className="modal-close" onClick={() => setShowMapModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddMapping}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-input" value={mapSubjectId} onChange={e => setMapSubjectId(e.target.value)} required>
                  {SUBJECTS.filter(s => s.status === 'ACTIVE').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Class Level</label>
                <select className="form-input" value={mapClassId} onChange={e => { setMapClassId(e.target.value); setMapSectionId(''); }}>
                  {CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Section (optional — leave empty for all sections)</label>
                <select className="form-input" value={mapSectionId} onChange={e => setMapSectionId(e.target.value)}>
                  <option value="">All Sections</option>
                  {sectionsForMapClass.map(s => (
                    <option key={s.id} value={s.id}>Section {s.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMapModal(false)} disabled={savingMap}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingMap}>{savingMap ? 'Saving...' : 'Assign Subject'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SubjectsPage;
