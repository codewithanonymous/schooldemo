import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Table from '../../components/Table'
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react'

const Parents = () => {
  const [parents, setParents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('create') // 'create', 'edit', 'delete'
  const [selectedParent, setSelectedParent] = useState(null)

  // Form Fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  const fetchParents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('*')

      if (error) throw error
      setParents(data || [])
    } catch (err) {
      console.error("Error fetching parents:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParents()
  }, [])

  const handleOpenCreate = () => {
    setModalType('create')
    setSelectedParent(null)
    setUsername('')
    setPassword('')
    setName('')
    setSurname('')
    setEmail('')
    setPhone('')
    setAddress('')
    setShowModal(true)
  }

  const handleOpenEdit = (parent) => {
    setModalType('edit')
    setSelectedParent(parent)
    setUsername(parent.username || '')
    setPassword('')
    setName(parent.name || '')
    setSurname(parent.surname || '')
    setEmail(parent.email || '')
    setPhone(parent.phone || '')
    setAddress(parent.address || '')
    setShowModal(true)
  }

  const handleOpenDelete = (parent) => {
    setModalType('delete')
    setSelectedParent(parent)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (modalType === 'create') {
        const parentEmail = email || `${username}@school.local`

        // 1. Secure server-side user creation — role is set in DB, never in client payload
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_user', {
          p_email:    parentEmail,
          p_password: password,
          p_role:     'parent',
          p_name:     name,
          p_surname:  surname
        })
        if (rpcError) throw rpcError
        const userId = rpcData?.user_id
        if (!userId) throw new Error('User creation did not return an ID.')

        // 2. Insert into parents table
        const { error: insertError } = await supabase
          .from('parents')
          .insert({ id: userId, username, name, surname, email: parentEmail, phone, address })

        if (insertError) throw insertError

      } else if (modalType === 'edit' && selectedParent) {
        const { error: updateError } = await supabase
          .from('parents')
          .update({
            username,
            name,
            surname,
            email,
            phone,
            address
          })
          .eq('id', selectedParent.id)

        if (updateError) throw updateError
      }

      setShowModal(false)
      fetchParents()
    } catch (err) {
      console.error("Error saving parent:", err)
      alert(err.message || "An error occurred while saving.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedParent) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('parents')
        .delete()
        .eq('id', selectedParent.id)

      if (error) throw error
      setShowModal(false)
      fetchParents()
    } catch (err) {
      console.error("Error deleting parent:", err)
      alert(err.message || "An error occurred during deletion.")
    } finally {
      setLoading(false)
    }
  }

  // Search
  const filteredParents = parents.filter(p => {
    const searchString = `${p.name} ${p.surname} ${p.username} ${p.email || ''}`.toLowerCase()
    return searchString.includes(searchQuery.toLowerCase())
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredParents.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredParents.length / itemsPerPage)

  const columns = [
    { header: "Name", accessor: "name" },
    { header: "Username", accessor: "username", className: "hidden md:table-cell" },
    { header: "Phone", accessor: "phone", className: "hidden md:table-cell" },
    { header: "Address", accessor: "address", className: "hidden lg:table-cell" },
    { header: "Actions", accessor: "actions" }
  ]

  const renderRow = (parent) => (
    <tr key={parent.id}>
      <td>
        <div className="table-avatar-cell">
          <div className="table-avatar">
            {parent.name[0] + (parent.surname ? parent.surname[0] : '')}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{parent.name} {parent.surname}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{parent.email || 'No email'}</div>
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell">{parent.username}</td>
      <td className="hidden md:table-cell">{parent.phone}</td>
      <td className="hidden lg:table-cell" style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {parent.address}
      </td>
      <td>
        <div className="table-actions">
          <button className="btn-icon" onClick={() => handleOpenEdit(parent)}>
            <Edit2 size={14} />
          </button>
          <button className="btn-icon btn-icon-danger" onClick={() => handleOpenDelete(parent)}>
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
          <h1>Parents</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage parent contacts and link them to students.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>Add Parent</span>
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
              placeholder="Search parents..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {loading && parents.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <Table columns={columns} renderRow={renderRow} data={currentItems} />
            
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredParents.length)} of {filteredParents.length} entries
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
                {modalType === 'create' && 'Add New Parent'}
                {modalType === 'edit' && 'Edit Parent'}
                {modalType === 'delete' && 'Delete Parent'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {modalType === 'delete' ? (
              <div>
                <p style={{ marginBottom: '24px' }}>
                  Are you sure you want to delete parent <strong>{selectedParent?.name} {selectedParent?.surname}</strong>? This action cannot be undone.
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
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      required 
                    />
                  </div>
                  {modalType === 'create' && (
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input 
                        type="password" 
                        className="form-input" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                      />
                    </div>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={surname} 
                      onChange={(e) => setSurname(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
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

export default Parents

