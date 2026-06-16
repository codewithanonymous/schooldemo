import React, { useState } from 'react'
import { TEACHERS as initialTeachers, SUBJECTS, genId } from '../../data/mockData'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
const emptyForm = () => ({
  username: '', password: '', name: '', surname: '',
  email: '', phone: '', address: '',
  blood_type: 'A+', sex: 'MALE', birthday: '',
  subject_ids: []
})

const Teachers = () => {
  const [teachers, setTeachers] = useState(initialTeachers)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 8

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create')
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(emptyForm())
  const [saving, setSaving]       = useState(false)

  const openCreate = () => { setModalType('create'); setSelected(null); setForm(emptyForm()); setShowModal(true) }

  const openEdit = (t) => {
    setModalType('edit')
    setSelected(t)
    setForm({
      username: t.username ?? '', password: '',
      name: t.name ?? '', surname: t.surname ?? '',
      email: t.email ?? '', phone: t.phone ?? '',
      address: t.address ?? '', blood_type: t.blood_type ?? 'A+',
      sex: t.sex ?? 'MALE', birthday: t.birthday ?? '',
      subject_ids: (t.teacher_subjects ?? []).map(ts => ts.subject_id)
    })
    setShowModal(true)
  }

  const openDelete = (t) => { setModalType('delete'); setSelected(t); setShowModal(true) }
  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const toggleSubject = (id) => {
    setForm(prev => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(id)
        ? prev.subject_ids.filter(s => s !== id)
        : [...prev.subject_ids, id]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))

    if (modalType === 'create') {
      const newTeacher = {
        id: genId('tch'), username: form.username, name: form.name,
        surname: form.surname, email: form.email, phone: form.phone,
        address: form.address, blood_type: form.blood_type, sex: form.sex,
        birthday: form.birthday,
        teacher_subjects: form.subject_ids.map(sid => ({ subject_id: sid }))
      }
      setTeachers(prev => [...prev, newTeacher])
    } else if (modalType === 'edit' && selected) {
      setTeachers(prev => prev.map(t => t.id === selected.id
        ? { ...t, ...form, teacher_subjects: form.subject_ids.map(sid => ({ subject_id: sid })) }
        : t
      ))
    }

    setSaving(false)
    setShowModal(false)
  }

  const handleDelete = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    setTeachers(prev => prev.filter(t => t.id !== selected.id))
    setSaving(false)
    setShowModal(false)
  }

  const filtered   = teachers.filter(t =>
    `${t.name} ${t.surname} ${t.username} ${t.email ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const pageStart  = (currentPage - 1) * ITEMS_PER_PAGE
  const pageItems  = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE)

  const columns = [
    { header: 'Name',     accessor: 'name' },
    { header: 'Username', accessor: 'username',  className: 'hidden md:table-cell' },
    { header: 'Gender',   accessor: 'sex',       className: 'hidden md:table-cell' },
    { header: 'Phone',    accessor: 'phone',     className: 'hidden lg:table-cell' },
    { header: 'Actions',  accessor: 'actions' },
  ]

  const renderRow = (t) => (
    <tr key={t.id}>
      <td>
        <div className="table-avatar-cell">
          <div className="table-avatar">{t.name[0]}{t.surname?.[0] ?? ''}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{t.name} {t.surname}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.email ?? 'No email'}</div>
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell">{t.username}</td>
      <td className="hidden md:table-cell">
        <span className={`badge ${t.sex === 'MALE' ? 'badge-primary' : 'badge-danger'}`}>{t.sex}</span>
      </td>
      <td className="hidden lg:table-cell">{t.phone ?? '—'}</td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => openEdit(t)}><Edit2 size={14} /></button>
          <button className="btn-icon btn-icon-danger" onClick={() => openDelete(t)}><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Teachers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage school teachers, accounts and profiles.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /><span>Add Teacher</span></button>
      </div>

      <div className="table-card">
        <div className="table-header-container">
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="search-input" style={{ paddingLeft: 40 }} placeholder="Search teachers…"
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} />
          </div>
        </div>
        <Table columns={columns} renderRow={renderRow} data={pageItems} />
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">Showing {pageStart + 1}–{Math.min(pageStart + ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</span>
            <div className="pagination-buttons">
              <button className="btn btn-secondary" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</button>
              <button className="btn btn-secondary" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className={`modal-content ${modalType === 'delete' ? 'confirm' : ''}`}>
            <div className="modal-header">
              <h2>{modalType === 'create' ? 'Add Teacher' : modalType === 'edit' ? 'Edit Teacher' : 'Delete Teacher'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: 24 }}>Delete <strong>{selected?.name} {selected?.surname}</strong>? This cannot be undone.</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
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
                  <div className="form-group"><label className="form-label">Gender</label>
                    <select className="form-select" value={form.sex} onChange={f('sex')}>
                      <option value="MALE">Male</option><option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Blood Type</label>
                    <select className="form-select" value={form.blood_type} onChange={f('blood_type')}>
                      {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Birthday</label><input type="date" className="form-input" value={form.birthday} onChange={f('birthday')} /></div>
                <div className="form-group">
                  <label className="form-label">Subjects</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {SUBJECTS.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.subject_ids.includes(s.id)} onChange={() => toggleSubject(s.id)} />
                        {s.name}
                      </label>
                    ))}
                  </div>
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
  )
}

export default Teachers
