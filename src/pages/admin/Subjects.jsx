import React, { useState } from 'react'
import { SUBJECTS as initialSubjects, genId } from '../../data/mockData'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const Subjects = () => {
  const [subjects, setSubjects] = useState(initialSubjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create')
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpenCreate  = () => { setModalType('create'); setSelectedSubject(null); setName(''); setShowModal(true) }
  const handleOpenEdit    = (s) => { setModalType('edit'); setSelectedSubject(s); setName(s.name); setShowModal(true) }
  const handleOpenDelete  = (s) => { setModalType('delete'); setSelectedSubject(s); setShowModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    if (modalType === 'create') {
      setSubjects(prev => [...prev, { id: genId('sub'), name }])
    } else if (modalType === 'edit' && selectedSubject) {
      setSubjects(prev => prev.map(s => s.id === selectedSubject.id ? { ...s, name } : s))
    }
    setSaving(false); setShowModal(false)
  }

  const handleDelete = async () => {
    setSaving(true); await new Promise(r => setTimeout(r, 300))
    setSubjects(prev => prev.filter(s => s.id !== selectedSubject.id))
    setSaving(false); setShowModal(false)
  }

  const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const indexOfLastItem  = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems     = filteredSubjects.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages       = Math.ceil(filteredSubjects.length / itemsPerPage)

  const columns = [
    { header: 'Subject Name', accessor: 'name' },
    { header: 'Actions',      accessor: 'actions' },
  ]

  const renderRow = (subj) => (
    <tr key={subj.id}>
      <td><div style={{ fontWeight: 600 }}>{subj.name}</div></td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => handleOpenEdit(subj)}><Edit2 size={14} /></button>
          <button className="btn-icon btn-icon-danger" onClick={() => handleOpenDelete(subj)}><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Subjects</h1><p style={{ color: 'var(--text-secondary)' }}>Manage core curriculum subjects and courses.</p></div>
        <button className="btn btn-primary" onClick={handleOpenCreate}><Plus size={18} /><span>Add Subject</span></button>
      </div>
      <div className="table-card">
        <div className="table-header-container">
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="search-input" style={{ paddingLeft: 40 }} placeholder="Search subjects…" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} />
          </div>
        </div>
        <Table columns={columns} renderRow={renderRow} data={currentItems} />
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSubjects.length)} of {filteredSubjects.length}</span>
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
              <h2>{modalType === 'create' ? 'Add New Subject' : modalType === 'edit' ? 'Edit Subject' : 'Delete Subject'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: '24px' }}>Delete subject <strong>{selectedSubject?.name}</strong>? This cannot be undone.</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Subject Name</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mathematics, English Literature" required />
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

export default Subjects
