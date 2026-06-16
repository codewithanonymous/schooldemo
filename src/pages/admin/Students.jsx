import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { createSchoolUser } from '../../lib/adminUserService'
import { useAuth } from '../../context/AuthContext'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
const emptyForm = () => ({
  username: '', password: '', name: '', surname: '',
  email: '', phone: '', address: '',
  blood_type: 'A+', sex: 'MALE', birthday: '',
  parent_id: '', class_id: '', grade_id: ''
})

const Students = () => {
  const { schoolId } = useAuth()
  const [students, setStudents]   = useState([])
  const [parents, setParents]     = useState([])
  const [classes, setClasses]     = useState([])
  const [grades, setGrades]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 8

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create')
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState(null)

  // -------------------------------------------------------------------------
  const fetchStudents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, username, name, surname, email, phone, address, blood_type, sex, birthday, class_id, created_at')
        .eq('school_id', schoolId)
        .order('surname')
      if (error) throw error
      setStudents(data ?? [])
    } catch (err) {
      console.error('[Students] fetch:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelated = async () => {
    const [{ data: pd }, { data: cd }, { data: gd }] = await Promise.all([
      supabase.from('parents').select('id, name, surname').eq('school_id', schoolId).order('surname'),
      supabase.from('classes').select('id, name').eq('school_id', schoolId).order('name'),
      supabase.from('grades').select('id, level').eq('school_id', schoolId).order('level')
    ])
    setParents(pd ?? [])
    setClasses(cd ?? [])
    setGrades(gd ?? [])
  }

  useEffect(() => { fetchStudents(); fetchRelated() }, [])

  // -------------------------------------------------------------------------
  const openCreate = () => {
    setModalType('create')
    setSelected(null)
    const defaults = emptyForm()
    if (parents.length) defaults.parent_id = parents[0].id
    if (classes.length) defaults.class_id  = classes[0].id
    if (grades.length)  defaults.grade_id  = grades[0].id
    setForm(defaults)
    setFormError(null)
    setShowModal(true)
  }

  const openEdit = (s) => {
    setModalType('edit')
    setSelected(s)
    setForm({
      username:   s.username ?? '',
      password:   '',
      name:       s.name ?? '',
      surname:    s.surname ?? '',
      email:      s.email ?? '',
      phone:      s.phone ?? '',
      address:    s.address ?? '',
      blood_type: s.blood_type ?? 'A+',
      sex:        s.sex ?? 'MALE',
      birthday:   s.birthday ?? '',
      parent_id:  s.parent_id ?? '',
      class_id:   s.class_id ?? '',
      grade_id:   s.grade_id ?? ''
    })
    setFormError(null)
    setShowModal(true)
  }

  const openDelete = (s) => { setModalType('delete'); setSelected(s); setShowModal(true) }

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  // -------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      if (modalType === 'create') {
        // 1. Secure server-side user creation via Edge Function
        const result = await createSchoolUser({
          email:     form.email || `${form.username}@school.local`,
          password:  form.password,
          role:      'student',
          name:      form.name,
          surname:   form.surname,
          username:  form.username,
          school_id: schoolId
        })
        const userId = result?.user_id
        if (!userId) throw new Error('User creation did not return an ID.')

        // 2. Insert students row (set_user_profile doesn't insert student — needs class_id)
        const { error: sError } = await supabase.from('students').insert({
          id:         userId,
          school_id:  schoolId,
          username:   form.username,
          name:       form.name,
          surname:    form.surname,
          email:      form.email || null,
          phone:      form.phone || null,
          address:    form.address || null,
          blood_type: form.blood_type || null,
          sex:        form.sex,
          birthday:   form.birthday || null,
          class_id:   Number(form.class_id)
        })
        if (sError) throw sError

        // 3. Link parent
        if (form.parent_id) {
          const { error: spError } = await supabase.from('student_parents').insert({
            student_id:   userId,
            parent_id:    form.parent_id,
            is_primary:   true,
            relationship: 'parent'
          })
          if (spError) throw spError
        }

      } else if (modalType === 'edit' && selected) {
        const { error } = await supabase
          .from('students')
          .update({
            username:   form.username,
            name:       form.name,
            surname:    form.surname,
            email:      form.email || null,
            phone:      form.phone || null,
            address:    form.address || null,
            blood_type: form.blood_type || null,
            sex:        form.sex,
            birthday:   form.birthday || null,
            class_id:   Number(form.class_id)
          })
          .eq('id', selected.id)
          .eq('school_id', schoolId)
        if (error) throw error
      }

      setShowModal(false)
      fetchStudents()
    } catch (err) {
      console.error('[Students] save:', err.message)
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const { error } = await supabase.from('students').delete().eq('id', selected.id)
      if (error) throw error
      setShowModal(false)
      fetchStudents()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  const filtered  = students.filter(s =>
    `${s.name} ${s.surname} ${s.username} ${s.email ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const pageStart  = (currentPage - 1) * ITEMS_PER_PAGE
  const pageItems  = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE)

  const columns = [
    { header: 'Name',     accessor: 'name' },
    { header: 'Username', accessor: 'username', className: 'hidden md:table-cell' },
    { header: 'Gender',   accessor: 'sex',      className: 'hidden md:table-cell' },
    { header: 'Phone',    accessor: 'phone',    className: 'hidden lg:table-cell' },
    { header: 'Actions',  accessor: 'actions' }
  ]

  const renderRow = (s) => (
    <tr key={s.id}>
      <td>
        <div className="table-avatar-cell">
          <div className="table-avatar">{s.name[0]}{s.surname?.[0] ?? ''}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{s.name} {s.surname}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.email ?? 'No email'}</div>
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell">{s.username}</td>
      <td className="hidden md:table-cell">
        <span className={`badge ${s.sex === 'MALE' ? 'badge-primary' : 'badge-danger'}`}>{s.sex}</span>
      </td>
      <td className="hidden lg:table-cell">{s.phone ?? '—'}</td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => openEdit(s)} aria-label="Edit student"><Edit2 size={14} /></button>
          <button className="btn-icon btn-icon-danger" onClick={() => openDelete(s)} aria-label="Delete student"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Students</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage student enrollments, details, and class assignments.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /><span>Add Student</span></button>
      </div>

      <div className="table-card">
        <div className="table-header-container">
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="search-input" style={{ paddingLeft: 40 }} placeholder="Search students…"
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} />
          </div>
        </div>

        {loading && students.length === 0
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          : <>
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
            </>
        }
      </div>

      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className={`modal-content ${modalType === 'delete' ? 'confirm' : ''}`}>
            <div className="modal-header">
              <h2>{modalType === 'create' ? 'Add Student' : modalType === 'edit' ? 'Edit Student' : 'Delete Student'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close"><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ background: 'var(--danger-bg,#fee2e2)', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                {formError}
              </div>
            )}

            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: 24 }}>Delete student <strong>{selected?.name} {selected?.surname}</strong>? This cannot be undone.</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger"    onClick={handleDelete}              disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Username *</label><input className="form-input" value={form.username} onChange={f('username')} required /></div>
                  {modalType === 'create' && (
                    <div className="form-group"><label className="form-label">Password *</label><input type="password" className="form-input" value={form.password} onChange={f('password')} required minLength={8} /></div>
                  )}
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
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Class *</label>
                    <select className="form-select" value={form.class_id} onChange={f('class_id')} required>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Grade *</label>
                    <select className="form-select" value={form.grade_id} onChange={f('grade_id')} required>
                      {grades.map(g => <option key={g.id} value={g.id}>Grade {g.level}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Parent *</label>
                  <select className="form-select" value={form.parent_id} onChange={f('parent_id')} required>
                    {parents.map(p => <option key={p.id} value={p.id}>{p.name} {p.surname}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Birthday</label><input type="date" className="form-input" value={form.birthday} onChange={f('birthday')} /></div>
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

export default Students
