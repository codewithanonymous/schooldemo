import React, { useState } from 'react'
import { CLASSES as initialClasses, TEACHERS, GRADES, genId } from '../../data/mockData'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const Classes = () => {
  const [classesList, setClassesList] = useState(initialClasses)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create')
  const [selectedClass, setSelectedClass] = useState(null)
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [supervisorId, setSupervisorId] = useState(TEACHERS[0]?.id ?? '')
  const [gradeId, setGradeId] = useState(GRADES[0]?.id ?? '')
  const [saving, setSaving] = useState(false)

  const handleOpenCreate = () => {
    setModalType('create'); setSelectedClass(null); setName(''); setCapacity('')
    setSupervisorId(TEACHERS[0]?.id ?? ''); setGradeId(GRADES[0]?.id ?? '')
    setShowModal(true)
  }
  const handleOpenEdit = (cls) => {
    setModalType('edit'); setSelectedClass(cls)
    setName(cls.name); setCapacity(cls.capacity); setSupervisorId(cls.supervisor_id || ''); setGradeId(cls.grade_id || '')
    setShowModal(true)
  }
  const handleOpenDelete = (cls) => { setModalType('delete'); setSelectedClass(cls); setShowModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    if (modalType === 'create') {
      setClassesList(prev => [...prev, { id: genId('cls'), name, capacity: parseInt(capacity), supervisor_id: supervisorId || null, grade_id: gradeId }])
    } else if (modalType === 'edit' && selectedClass) {
      setClassesList(prev => prev.map(c => c.id === selectedClass.id
        ? { ...c, name, capacity: parseInt(capacity), supervisor_id: supervisorId || null, grade_id: gradeId }
        : c
      ))
    }
    setSaving(false); setShowModal(false)
  }

  const handleDelete = async () => {
    setSaving(true); await new Promise(r => setTimeout(r, 300))
    setClassesList(prev => prev.filter(c => c.id !== selectedClass.id))
    setSaving(false); setShowModal(false)
  }

  const getTeacherName = (id) => { const t = TEACHERS.find(t => t.id === id); return t ? `${t.name} ${t.surname}` : 'None' }
  const getGradeLevel  = (id) => { const g = GRADES.find(g => g.id === id); return g ? `Grade ${g.level}` : '—' }

  const filteredClasses = classesList.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const indexOfLastItem  = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems     = filteredClasses.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages       = Math.ceil(filteredClasses.length / itemsPerPage)

  const columns = [
    { header: 'Class Name', accessor: 'name' },
    { header: 'Capacity',   accessor: 'capacity' },
    { header: 'Grade Level',  accessor: 'grade_id',      className: 'hidden md:table-cell' },
    { header: 'Supervisor',   accessor: 'supervisor_id',  className: 'hidden md:table-cell' },
    { header: 'Actions',    accessor: 'actions' },
  ]

  const renderRow = (cls) => (
    <tr key={cls.id}>
      <td><div style={{ fontWeight: 600 }}>{cls.name}</div></td>
      <td>{cls.capacity}</td>
      <td className="hidden md:table-cell"><span className="badge badge-primary">{getGradeLevel(cls.grade_id)}</span></td>
      <td className="hidden md:table-cell">{getTeacherName(cls.supervisor_id)}</td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => handleOpenEdit(cls)}><Edit2 size={14} /></button>
          <button className="btn-icon btn-icon-danger" onClick={() => handleOpenDelete(cls)}><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Classes</h1><p style={{ color: 'var(--text-secondary)' }}>Manage class assignments, capacities, and teacher supervisors.</p></div>
        <button className="btn btn-primary" onClick={handleOpenCreate}><Plus size={18} /><span>Add Class</span></button>
      </div>
      <div className="table-card">
        <div className="table-header-container">
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="search-input" style={{ paddingLeft: 40 }} placeholder="Search classes…" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} />
          </div>
        </div>
        <Table columns={columns} renderRow={renderRow} data={currentItems} />
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredClasses.length)} of {filteredClasses.length}</span>
            <div className="pagination-buttons">
              <button className="btn btn-secondary" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</button>
              <button className="btn btn-secondary" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className={`modal-content ${modalType === 'delete' ? 'confirm' : ''}`}>
            <div className="modal-header">
              <h2>{modalType === 'create' ? 'Add New Class' : modalType === 'edit' ? 'Edit Class' : 'Delete Class'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: '24px' }}>Delete class <strong>{selectedClass?.name}</strong>? This cannot be undone.</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label className="form-label">Class Name</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 1A, 2B" required /></div>
                <div className="form-group"><label className="form-label">Capacity</label><input type="number" className="form-input" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g. 30" required /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Supervisor (Teacher)</label>
                    <select className="form-select" value={supervisorId} onChange={e => setSupervisorId(e.target.value)}>
                      <option value="">No Supervisor</option>
                      {TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name} {t.surname}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Grade</label>
                    <select className="form-select" value={gradeId} onChange={e => setGradeId(e.target.value)} required>
                      {GRADES.map(g => <option key={g.id} value={g.id}>Grade {g.level}</option>)}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Classes
