import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const Exams = () => {
  const [exams, setExams] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create')
  const [selectedExam, setSelectedExam] = useState(null)

  // Form Fields
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [lessonId, setLessonId] = useState('')

  const fetchExams = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, start_time, end_time, lesson_id')
        .order('start_time', { ascending: false })

      if (error) throw error
      setExams(data || [])
    } catch (err) {
      console.error("Error fetching exams:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedData = async () => {
    try {
      const { data: lessonData } = await supabase.from('lessons').select('id, name').order('name')
      setLessons(lessonData || [])
      if (lessonData?.length > 0) setLessonId(lessonData[0].id)
    } catch (err) {
      console.error("Error fetching related data:", err)
    }
  }

  useEffect(() => {
    fetchExams()
    fetchRelatedData()
  }, [])

  const handleOpenCreate = () => {
    setModalType('create')
    setSelectedExam(null)
    setTitle('')
    setStartTime('')
    setEndTime('')
    if (lessons.length > 0) setLessonId(lessons[0].id)
    setShowModal(true)
  }

  const handleOpenEdit = (exam) => {
    setModalType('edit')
    setSelectedExam(exam)
    setTitle(exam.title || '')
    setStartTime(exam.start_time ? exam.start_time.slice(0, 16) : '')
    setEndTime(exam.end_time ? exam.end_time.slice(0, 16) : '')
    setLessonId(exam.lesson_id || '')
    setShowModal(true)
  }

  const handleOpenDelete = (exam) => {
    setModalType('delete')
    setSelectedExam(exam)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (modalType === 'create') {
        const { error } = await supabase
          .from('exams')
          .insert({
            title,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            lesson_id: parseInt(lessonId)
          })

        if (error) throw error
      } else if (modalType === 'edit' && selectedExam) {
        const { error } = await supabase
          .from('exams')
          .update({
            title,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            lesson_id: parseInt(lessonId)
          })
          .eq('id', selectedExam.id)

        if (error) throw error
      }

      setShowModal(false)
      fetchExams()
    } catch (err) {
      console.error("Error saving exam:", err)
      alert(err.message || "An error occurred while saving.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedExam) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', selectedExam.id)

      if (error) throw error
      setShowModal(false)
      fetchExams()
    } catch (err) {
      console.error("Error deleting exam:", err)
      alert(err.message || "An error occurred during deletion.")
    } finally {
      setLoading(false)
    }
  }

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredExams.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage)

  const columns = [
    { header: "Exam Title", accessor: "title" },
    { header: "Lesson", accessor: "lesson_id", className: "hidden md:table-cell" },
    { header: "Start Time", accessor: "start_time" },
    { header: "End Time", accessor: "end_time", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "actions" }
  ]

  const getLessonName = (id) => {
    const lesson = lessons.find(l => l.id === id)
    return lesson ? lesson.name : '—'
  }

  const renderRow = (exam) => (
    <tr key={exam.id}>
      <td><div style={{ fontWeight: 600 }}>{exam.title}</div></td>
      <td className="hidden md:table-cell">{getLessonName(exam.lesson_id)}</td>
      <td>{new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(exam.start_time))}</td>
      <td className="hidden md:table-cell">{new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(exam.end_time))}</td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => handleOpenEdit(exam)}>
            <Edit2 size={14} />
          </button>
          <button className="btn-icon btn-icon-danger" onClick={() => handleOpenDelete(exam)}>
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Exams</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage exam dates, subjects and timings.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>Add Exam</span>
        </button>
      </div>

      <div className="table-card">
        <div className="table-header-container">
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="search-input"
              style={{ paddingLeft: '40px' }}
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {loading && exams.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <Table columns={columns} renderRow={renderRow} data={currentItems} />
            
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredExams.length)} of {filteredExams.length} entries
                </span>
                <div className="pagination-buttons">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className={`modal-content ${modalType === 'delete' ? 'confirm' : ''}`}>
            <div className="modal-header">
              <h2>
                {modalType === 'create' && 'Add New Exam'}
                {modalType === 'edit' && 'Edit Exam'}
                {modalType === 'delete' && 'Delete Exam'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: '24px' }}>
                  Are you sure you want to delete exam <strong>{selectedExam?.title}</strong>? This action cannot be undone.
                </p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={loading}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Exam Title</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="e.g. Midterm Mathematics"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Lesson</label>
                  <select className="form-select" value={lessonId} onChange={(e) => setLessonId(e.target.value)} required>
                    {lessons.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Start Date & Time</label>
                    <input 
                      type="datetime-local" 
                      className="form-input" 
                      value={startTime} 
                      onChange={(e) => setStartTime(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date & Time</label>
                    <input 
                      type="datetime-local" 
                      className="form-input" 
                      value={endTime} 
                      onChange={(e) => setEndTime(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={loading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </button>
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
