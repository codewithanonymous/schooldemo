import React, { useState } from 'react'
import { PARENTS as initialParents, genId } from '../../data/mockData'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const emptyForm = () => ({ username: '', password: '', name: '', surname: '', email: '', phone: '', address: '' })

const Parents = () => {
  const [parents, setParents] = useState(initialParents)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create')
  const [selectedParent, setSelectedParent] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const handleOpenCreate = () => { setModalType('create'); setSelectedParent(null); setForm(emptyForm()); setShowModal(true) }
  const handleOpenEdit = (p) => { setModalType('edit'); setSelectedParent(p); setForm({ ...p, password: '' }); setShowModal(true) }
  const handleOpenDelete = (p) => { setModalType('delete'); setSelectedParent(p); setShowModal(true) }
  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    if (modalType === 'create') {
      setParents(prev => [...prev, { ...form, id: genId('par') }])
    } else if (modalType === 'edit' && selectedParent) {
      setParents(prev => prev.map(p => p.id === selectedParent.id ? { ...p, ...form } : p))
    }
    setSaving(false); setShowModal(false)
  }

  const handleDelete = async () => {
    setSaving(true); await new Promise(r => setTimeout(r, 300))
    setParents(prev => prev.filter(p => p.id !== selectedParent.id))
    setSaving(false); setShowModal(false)
  }

  const filteredParents = parents.filter(p =>
    `${p.name} ${p.surname} ${p.username} ${p.email ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const indexOfLastItem  = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems     = filteredParents.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages       = Math.ceil(filteredParents.length / itemsPerPage)

  const columns = [
    { header: 'Name',     accessor: 'name' },
    { header: 'Username', accessor: 'username', className: 'hidden md:table-cell' },
    { header: 'Phone',    accessor: 'phone',    className: 'hidden md:table-cell' },
    { header: 'Address',  accessor: 'address',  className: 'hidden lg:table-cell' },
    { header: 'Actions',  accessor: 'actions' },
  ]

  const renderRow = (parent) => (
    <tr key={parent.id}>
      <td>
        <div className="table-avatar-cell">
          <div className="table-avatar">{parent.name[0]}{parent.surname ? parent.surname[0] : ''}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{parent.name} {parent.surname}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{parent.email || 'No email'}</div>
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell">{parent.username}</td>
      <td className="hidden md:table-cell">{parent.phone}</td>
      <td className="hidden lg:table-cell" style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parent.address}</td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => handleOpenEdit(parent)}><Edit2 size={14} /></button>
          <button className="btn-icon btn-icon-danger" onClick={() => handleOpenDelete(parent)}><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Parents</h1><p style={{ color: 'var(--text-secondary)' }}>Manage parent contacts and link them to students.</p></div>
        <button className="btn btn-primary" onClick={handleOpenCreate}><Plus size={18} /><span>Add Parent</span></button>
      </div>
      <div className="table-card">
        <div className="table-header-container">
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="search-input" style={{ paddingLeft: 40 }} placeholder="Search parents…" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} />
          </div>
        </div>
        <Table columns={columns} renderRow={renderRow} data={currentItems} />
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredParents.length)} of {filteredParents.length}</span>
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
              <h2>{modalType === 'create' ? 'Add New Parent' : modalType === 'edit' ? 'Edit Parent' : 'Delete Parent'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: '24px' }}>Delete parent <strong>{selectedParent?.name} {selectedParent?.surname}</strong>? This cannot be undone.</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Username</label><input className="form-input" value={form.username} onChange={f('username')} required /></div>
                  {modalType === 'create' && <div className="form-group"><label className="form-label">Password</label><input type="password" className="form-input" value={form.password} onChange={f('password')} required /></div>}
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">First Name</label><input className="form-input" value={form.name} onChange={f('name')} required /></div>
                  <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={form.surname} onChange={f('surname')} required /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={f('email')} /></div>
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={f('phone')} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={f('address')} required /></div>
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

export default Parents
