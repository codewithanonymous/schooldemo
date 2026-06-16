import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const Subjects = () => {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create')
  const [selectedSubject, setSelectedSubject] = useState(null)

  // Form Fields
  const [name, setName] = useState('')

  const fetchSubjects = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')

      if (error) throw error
      setSubjects(data || [])
    } catch (err) {
      console.error("Error fetching subjects:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  const handleOpenCreate = () => {
    setModalType('create')
    setSelectedSubject(null)
    setName('')
    setShowModal(true)
  }

  const handleOpenEdit = (subj) => {
    setModalType('edit')
    setSelectedSubject(subj)
    setName(subj.name || '')
    setShowModal(true)
  }

  const handleOpenDelete = (subj) => {
    setModalType('delete')
    setSelectedSubject(subj)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (modalType === 'create') {
        const { error } = await supabase
          .from('subjects')
          .insert({ name })

        if (error) throw error
      } else if (modalType === 'edit' && selectedSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({ name })
          .eq('id', selectedSubject.id)

        if (error) throw error
      }

      setShowModal(false)
      fetchSubjects()
    } catch (err) {
      console.error("Error saving subject:", err)
      alert(err.message || "An error occurred while saving.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSubject) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', selectedSubject.id)

      if (error) throw error
      setShowModal(false)
      fetchSubjects()
    } catch (err) {
      console.error("Error deleting subject:", err)
      alert(err.message || "An error occurred during deletion.")
    } finally {
      setLoading(false)
    }
  }

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredSubjects.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage)

  const columns = [
    { header: "Subject Name", accessor: "name" },
    { header: "Actions", accessor: "actions" }
  ]

  const renderRow = (subj) => (
    <tr key={subj.id}>
      <td>
        <div style={{ fontWeight: 600 }}>{subj.name}</div>
      </td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => handleOpenEdit(subj)}>
            <Edit2 size={14} />
          </button>
          <button className="btn-icon btn-icon-danger" onClick={() => handleOpenDelete(subj)}>
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
          <h1>Subjects</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage core curriculum subjects and courses.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>Add Subject</span>
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
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {loading && subjects.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <Table columns={columns} renderRow={renderRow} data={currentItems} />
            
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSubjects.length)} of {filteredSubjects.length} entries
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
                {modalType === 'create' && 'Add New Subject'}
                {modalType === 'edit' && 'Edit Subject'}
                {modalType === 'delete' && 'Delete Subject'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: '24px' }}>
                  Are you sure you want to delete subject <strong>{selectedSubject?.name}</strong>? This will remove all associated lessons and exams.
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
                  <label className="form-label">Subject Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Mathematics, English Literature"
                    required 
                  />
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

export default Subjects

