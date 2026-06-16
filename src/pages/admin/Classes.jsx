import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const Classes = () => {
  const { schoolId } = useAuth()
  const [classesList, setClassesList] = useState([])
  const [teachers, setTeachers] = useState([])
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create')
  const [selectedClass, setSelectedClass] = useState(null)

  // Form Fields
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [gradeId, setGradeId] = useState('')

  const fetchClasses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, capacity, supervisor_id, grade_id')
        .eq('school_id', schoolId)
        .order('name')

      if (error) throw error
      setClassesList(data || [])
    } catch (err) {
      console.error("Error fetching classes:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedData = async () => {
    try {
      const { data: teacherData } = await supabase.from('teachers').select('id, name, surname').eq('school_id', schoolId).order('surname')
      const { data: gradeData }   = await supabase.from('grades').select('id, level').eq('school_id', schoolId).order('level')
      
      setTeachers(teacherData || [])
      setGrades(gradeData || [])
      
      if (teacherData?.length > 0) setSupervisorId(teacherData[0].id)
      if (gradeData?.length > 0) setGradeId(gradeData[0].id)
    } catch (err) {
      console.error("Error fetching related data:", err)
    }
  }

  useEffect(() => {
    fetchClasses()
    fetchRelatedData()
  }, [])

  const handleOpenCreate = () => {
    setModalType('create')
    setSelectedClass(null)
    setName('')
    setCapacity('')
    if (teachers.length > 0) setSupervisorId(teachers[0].id)
    if (grades.length > 0) setGradeId(grades[0].id)
    setShowModal(true)
  }

  const handleOpenEdit = (cls) => {
    setModalType('edit')
    setSelectedClass(cls)
    setName(cls.name || '')
    setCapacity(cls.capacity || '')
    setSupervisorId(cls.supervisor_id || '')
    setGradeId(cls.grade_id || '')
    setShowModal(true)
  }

  const handleOpenDelete = (cls) => {
    setModalType('delete')
    setSelectedClass(cls)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (modalType === 'create') {
        const { error } = await supabase
          .from('classes')
          .insert({
            name,
            school_id:     schoolId,
            capacity:      parseInt(capacity),
            supervisor_id: supervisorId || null,
            grade_id:      parseInt(gradeId)
          })

        if (error) throw error
      } else if (modalType === 'edit' && selectedClass) {
        const { error } = await supabase
          .from('classes')
          .update({
            name,
            capacity:      parseInt(capacity),
            supervisor_id: supervisorId || null,
            grade_id:      parseInt(gradeId)
          })
          .eq('id', selectedClass.id)
          .eq('school_id', schoolId)

        if (error) throw error
      }

      setShowModal(false)
      fetchClasses()
    } catch (err) {
      console.error("Error saving class:", err)
      alert(err.message || "An error occurred while saving.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedClass) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', selectedClass.id)

      if (error) throw error
      setShowModal(false)
      fetchClasses()
    } catch (err) {
      console.error("Error deleting class:", err)
      alert(err.message || "An error occurred during deletion.")
    } finally {
      setLoading(false)
    }
  }

  const filteredClasses = classesList.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredClasses.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage)

  const columns = [
    { header: "Class Name", accessor: "name" },
    { header: "Capacity", accessor: "capacity" },
    { header: "Grade Level",   accessor: "grade_id",    className: "hidden md:table-cell" },
    { header: "Supervisor",    accessor: "supervisor_id", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "actions" }
  ]

  const getTeacherName = (id) => {
    const teacher = teachers.find(t => t.id === id)
    return teacher ? `${teacher.name} ${teacher.surname}` : 'None'
  }

  const getGradeLevel = (id) => {
    const grade = grades.find(g => g.id === id)
    return grade ? `Grade ${grade.level}` : '-'
  }

  const renderRow = (cls) => (
    <tr key={cls.id}>
      <td>
        <div style={{ fontWeight: 600 }}>{cls.name}</div>
      </td>
      <td>{cls.capacity}</td>
      <td className="hidden md:table-cell"><span className="badge badge-primary">{getGradeLevel(cls.grade_id)}</span></td>
      <td className="hidden md:table-cell">{getTeacherName(cls.supervisor_id)}</td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => handleOpenEdit(cls)}>
            <Edit2 size={14} />
          </button>
          <button className="btn-icon btn-icon-danger" onClick={() => handleOpenDelete(cls)}>
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
          <h1>Classes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage class assignments, capacities, and teacher supervisors.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>Add Class</span>
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
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {loading && classesList.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <Table columns={columns} renderRow={renderRow} data={currentItems} />
            
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredClasses.length)} of {filteredClasses.length} entries
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
                {modalType === 'create' && 'Add New Class'}
                {modalType === 'edit' && 'Edit Class'}
                {modalType === 'delete' && 'Delete Class'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: '24px' }}>
                  Are you sure you want to delete class <strong>{selectedClass?.name}</strong>? This will remove all students and lessons associated with it.
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
                  <label className="form-label">Class Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. 1A, 2B"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Capacity</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={capacity} 
                    onChange={(e) => setCapacity(e.target.value)} 
                    placeholder="e.g. 30"
                    required 
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Supervisor (Teacher)</label>
                    <select className="form-select" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
                      <option value="">No Supervisor</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} {t.surname}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Grade</label>
                    <select className="form-select" value={gradeId} onChange={(e) => setGradeId(e.target.value)} required>
                      {grades.map(g => (
                        <option key={g.id} value={g.id}>Grade {g.level}</option>
                      ))}
                    </select>
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

export default Classes
