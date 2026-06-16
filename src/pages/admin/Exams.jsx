import React, { useState } from 'react'
import { EXAMS as initialExams, LESSONS, genId } from '../../data/mockData'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const Exams = () => {
  const [exams, setExams] = useState(initialExams)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create')
  const [selectedExam, setSelectedExam] = useState(null)
  const [title, setTitle]         = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime]     = useState('')
  const [lessonId, setLessonId]   = useState(LESSONS[0]?.id ?? '')
  const [saving, setSaving]       = useState(false)

  const handleOpenCreate = () => { setModalType('create'); setSelectedExam(null); setTitle(''); setStartTime(''); setEndTime(''); setLessonId(LESSONS[0]?.id ?? ''); setShowModal(true) }
  const handleOpenEdit = (exam) => { setModalType('edit'); setSelectedExam(exam); setTitle(exam.title); setStartTime(exam.start_time?.slice(0,16) ?? ''); setEndTime(exam.end_time?.slice(0,16) ?? ''); setLessonId(exam.lesson_id ?? ''); setShowModal(true) }
  const handleOpenDelete = (exam) => { setModalType('delete'); setSelectedExam(exam); setShowModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    const payload = { title, lesson_id: lessonId, start_time: new Date(startTime).toISOString(), end_time: new Date(endTime).toISOString() }
    if (modalType === 'create') {
      setExams(prev => [...prev, { ...payload, id: genId('ex') }])
    } else if (modalType === 'edit' && selectedExam) {
      setExams(prev => prev.map(ex => ex.id === selectedExam.id ? { ...ex, ...payload } : ex))
    }
    setSaving(false); setShowModal(false)
  }

  const handleDelete = async () => {
    setSaving(true); await new Promise(r => setTimeout(r, 300))
    setExams(prev => prev.filter(ex => ex.id !== selectedExam.id))
    setSaving(false); setShowModal(false)
  }

  const getLessonName = (id) => { const l = LESSONS.find(l => l.id === id); return l ? l.name : '—' }

  const filteredExams = exams.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
  const indexOfLastItem  = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems     = filteredExams.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages       = Math.ceil(filteredExams.length / itemsPerPage)

  const columns = [
    { header: 'Exam Title',  accessor: 'title' },
    { header: 'Lesson',      accessor: 'lesson_id', className: 'hidden md:table-cell' },
    { header: 'Start Time',  accessor: 'start_time' },
    { header: 'End Time',    accessor: 'end_time',   className: 'hidden md:table-cell' },
    { header: 'Actions',     accessor: 'actions' },
  ]

  const fmt = (iso) => { try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) } catch { return iso } }

  const renderRow = (exam) => (
    <tr key={exam.id}>
      <td><div style={{ fontWeight: 600 }}>{exam.title}</div></td>
      <td className="hidden md:table-cell">{getLessonName(exam.lesson_id)}</td>
      <td>{fmt(exam.start_time)}</td>
      <td className="hidden md:table-cell">{fmt(exam.end_time)}</td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => handleOpenEdit(exam)}><Edit2 size={14} /></button>
          <button className="btn-icon btn-icon-danger" onClick={() => handleOpenDelete(exam)}><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Exams</h1><p style={{ color: 'var(--text-secondary)' }}>Manage exam dates, subjects and timings.</p></div>
        <button className="btn btn-primary" onClick={handleOpenCreate}><Plus size={18} /><span>Add Exam</span></button>
      </div>
      <div className="table-card">
        <div className="table-header-container">
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="search-input" style={{ paddingLeft: 40 }} placeholder="Search exams…" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} />
          </div>
        </div>
        <Table columns={columns} renderRow={renderRow} data={currentItems} />
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredExams.length)} of {filteredExams.length}</span>
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
              <h2>{modalType === 'create' ? 'Add New Exam' : modalType === 'edit' ? 'Edit Exam' : 'Delete Exam'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: '24px' }}>Delete exam <strong>{selectedExam?.title}</strong>? This cannot be undone.</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label className="form-label">Exam Title</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Midterm Mathematics" required /></div>
                <div className="form-group"><label className="form-label">Lesson</label>
                  <select className="form-select" value={lessonId} onChange={e => setLessonId(e.target.value)} required>
                    {LESSONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Start Date &amp; Time</label><input type="datetime-local" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">End Date &amp; Time</label><input type="datetime-local" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} required /></div>
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

export default Exams
