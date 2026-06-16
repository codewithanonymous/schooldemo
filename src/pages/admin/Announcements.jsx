import React, { useState } from 'react'
import { ANNOUNCEMENTS as initialAnnouncements, CLASSES, genId } from '../../data/mockData'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate]             = useState('')
  const [classId, setClassId]       = useState('')
  const [saving, setSaving]         = useState(false)

  const handleOpenCreate = () => { setModalType('create'); setSelectedAnnouncement(null); setTitle(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setClassId(''); setShowModal(true) }
  const handleOpenEdit = (ann) => { setModalType('edit'); setSelectedAnnouncement(ann); setTitle(ann.title); setDescription(ann.description); setDate(ann.date?.split('T')[0] ?? ''); setClassId(ann.class_id ?? ''); setShowModal(true) }
  const handleOpenDelete = (ann) => { setModalType('delete'); setSelectedAnnouncement(ann); setShowModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    const payload = { title, description, date, class_id: classId || null }
    if (modalType === 'create') {
      setAnnouncements(prev => [{ ...payload, id: genId('ann') }, ...prev])
    } else if (modalType === 'edit' && selectedAnnouncement) {
      setAnnouncements(prev => prev.map(a => a.id === selectedAnnouncement.id ? { ...a, ...payload } : a))
    }
    setSaving(false); setShowModal(false)
  }

  const handleDelete = async () => {
    setSaving(true); await new Promise(r => setTimeout(r, 300))
    setAnnouncements(prev => prev.filter(a => a.id !== selectedAnnouncement.id))
    setSaving(false); setShowModal(false)
  }

  const getClassName = (id) => { if (!id) return 'All Classes'; const cls = CLASSES.find(c => c.id === id); return cls ? cls.name : 'Unknown' }

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.description.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const indexOfLastItem  = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems     = filteredAnnouncements.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages       = Math.ceil(filteredAnnouncements.length / itemsPerPage)

  const columns = [
    { header: 'Title',        accessor: 'title' },
    { header: 'Description',  accessor: 'description', className: 'hidden md:table-cell' },
    { header: 'Date',         accessor: 'date' },
    { header: 'Target Class', accessor: 'class_id',    className: 'hidden md:table-cell' },
    { header: 'Actions',      accessor: 'actions' },
  ]

  const renderRow = (ann) => (
    <tr key={ann.id}>
      <td><div style={{ fontWeight: 600 }}>{ann.title}</div></td>
      <td className="hidden md:table-cell" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ann.description}</td>
      <td>{new Intl.DateTimeFormat('en-GB').format(new Date(ann.date))}</td>
      <td className="hidden md:table-cell">
        <span className={`badge ${ann.class_id ? 'badge-primary' : 'badge-success'}`}>{getClassName(ann.class_id)}</span>
      </td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => handleOpenEdit(ann)}><Edit2 size={14} /></button>
          <button className="btn-icon btn-icon-danger" onClick={() => handleOpenDelete(ann)}><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Announcements</h1><p style={{ color: 'var(--text-secondary)' }}>Publish global or class-specific announcements and reminders.</p></div>
        <button className="btn btn-primary" onClick={handleOpenCreate}><Plus size={18} /><span>Add Announcement</span></button>
      </div>
      <div className="table-card">
        <div className="table-header-container">
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="search-input" style={{ paddingLeft: 40 }} placeholder="Search announcements…" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} />
          </div>
        </div>
        <Table columns={columns} renderRow={renderRow} data={currentItems} />
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAnnouncements.length)} of {filteredAnnouncements.length}</span>
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
              <h2>{modalType === 'create' ? 'Add Announcement' : modalType === 'edit' ? 'Edit Announcement' : 'Delete Announcement'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: '24px' }}>Delete <strong>{selectedAnnouncement?.title}</strong>? This cannot be undone.</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. School holiday announcement" required /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Write detailed announcement description here..." required /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Target Class</label>
                    <select className="form-select" value={classId} onChange={e => setClassId(e.target.value)}>
                      <option value="">All Classes</option>
                      {CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

export default AnnouncementsPage
