import React, { useState, useMemo } from 'react';
import { STUDENTS, CLASSES, SECTIONS } from '../../data/academicMockData';
import { Search, Copy, Printer, Eye, EyeOff, Check, ChevronLeft, ChevronRight, Lock, User, RefreshCw, X } from 'lucide-react';
import './StudentCredentials.css';

const StudentCredentials: React.FC = () => {
  // --- Search & Filter States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // --- UI States ---
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [selectedPrintStudent, setSelectedPrintStudent] = useState<any | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // --- Recalculate or Sync trigger ---
  const [syncKey, setSyncKey] = useState(0);

  // Get active students list (reads from state/localStorage)
  const studentsList = useMemo(() => {
    return STUDENTS;
  }, [syncKey, STUDENTS]);

  // --- Filtered Students ---
  const filteredStudents = useMemo(() => {
    return studentsList.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.admission_number && s.admission_number.toLowerCase().includes(searchQuery.toLowerCase()));

      const classObj = CLASSES.find(c => c.id === s.class_id);
      const className = classObj ? classObj.name : '';
      const matchesClass = classFilter === 'All' || className === classFilter;

      const secObj = SECTIONS.find(sec => sec.id === s.grade_id);
      const sectionName = secObj ? secObj.name : '';
      const matchesSection = sectionFilter === 'All' || sectionName === sectionFilter;

      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

      return matchesSearch && matchesClass && matchesSection && matchesStatus;
    });
  }, [studentsList, searchQuery, classFilter, sectionFilter, statusFilter]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // --- Clipboard Copy ---
  const handleCopy = (student: any) => {
    const text = `Student Name: ${student.name} ${student.surname}\nAdmission Number (Username): ${student.admission_number}\nPassword: ${student.password || 'Student123'}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(student.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // --- Toggle Password Visibility ---
  const togglePassword = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Trigger print slip for single student ---
  const handlePrintSlip = (student: any) => {
    const secObj = SECTIONS.find(sec => sec.id === student.grade_id);
    const classObj = CLASSES.find(c => c.id === student.class_id);
    setSelectedPrintStudent({
      ...student,
      className: classObj ? classObj.name : 'Unknown',
      sectionName: secObj ? secObj.name : 'Unknown'
    });
    setShowPrintModal(true);
  };

  const executePrint = () => {
    window.print();
  };

  // --- Bulk Print Filtered Slips ---
  const handlePrintAllFiltered = () => {
    // Open a new printable window with all filtered slips
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const slipsHtml = filteredStudents.map(student => {
      const secObj = SECTIONS.find(sec => sec.id === student.grade_id);
      const classObj = CLASSES.find(c => c.id === student.class_id);
      const cName = classObj ? classObj.name : 'Unknown';
      const sName = secObj ? secObj.name : 'Unknown';
      
      return `
        <div class="print-slip-card">
          <div class="print-slip-header">
            <h3>SCHOOL ERP - STUDENT LOGIN CREDENTIALS</h3>
            <span class="badge">CONFIDENTIAL</span>
          </div>
          <div class="print-slip-body">
            <p><strong>Student Name:</strong> ${student.name} ${student.surname}</p>
            <p><strong>Class:</strong> ${cName} - ${sName}</p>
            <p><strong>Admission Number:</strong> ${student.admission_number}</p>
            <p><strong>Username:</strong> ${student.admission_number}</p>
            <p><strong>Password:</strong> ${student.password}</p>
          </div>
          <div class="print-slip-footer">
            <p>Please keep these credentials secure. Do not share your password with anyone.</p>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Student Credentials Slips</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #fff;
              color: #000;
            }
            .print-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .print-slip-card {
              border: 2px dashed #000;
              padding: 15px;
              border-radius: 8px;
              background: #fff;
              page-break-inside: avoid;
            }
            .print-slip-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #000;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .print-slip-header h3 {
              margin: 0;
              font-size: 14px;
              font-weight: bold;
            }
            .badge {
              font-size: 10px;
              border: 1px solid #000;
              padding: 2px 6px;
              border-radius: 4px;
              font-weight: bold;
            }
            .print-slip-body p {
              margin: 5px 0;
              font-size: 12px;
            }
            .print-slip-footer {
              margin-top: 10px;
              border-top: 1px solid #000;
              padding-top: 6px;
              font-size: 10px;
              color: #555;
              text-align: center;
            }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; cursor: pointer;">Print Now</button>
          </div>
          <div class="print-container">
            ${slipsHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="credentials-page">
      <div className="credentials-header">
        <div>
          <h1>Student Login Credentials Directory</h1>
          <p className="subtitle">View, copy, and print credentials for student portal authentication.</p>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={() => setSyncKey(prev => prev + 1)}>
            <RefreshCw size={16} />
            <span>Reload Data</span>
          </button>
          {filteredStudents.length > 0 && (
            <button className="btn-primary" onClick={handlePrintAllFiltered}>
              <Printer size={16} />
              <span>Print All Filtered slips</span>
            </button>
          )}
        </div>
      </div>

      {/* --- Filter Bar --- */}
      <div className="filters-container">
        <div className="search-box">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, admission number..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="dropdowns-group">
          <div className="filter-item">
            <label>Class</label>
            <select 
              value={classFilter} 
              onChange={(e) => { setClassFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Classes</option>
              {Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`).map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Section</label>
            <select 
              value={sectionFilter} 
              onChange={(e) => { setSectionFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Sections</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Status</label>
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- Grid Layout --- */}
      {filteredStudents.length === 0 ? (
        <div className="no-records-card">
          <User size={48} className="empty-icon" />
          <h3>No Student Records Found</h3>
          <p>Try adjusting your search terms or filters.</p>
        </div>
      ) : (
        <>
          <div className="credentials-grid">
            {paginatedStudents.map(student => {
              const secObj = SECTIONS.find(sec => sec.id === student.grade_id);
              const classObj = CLASSES.find(c => c.id === student.class_id);
              const cName = classObj ? classObj.name : 'Unknown';
              const sName = secObj ? secObj.name : 'Unknown';
              const showPassword = showPasswordMap[student.id] || false;

              return (
                <div key={student.id} className="student-credential-card">
                  <div className="card-top">
                    <div className="avatar-circle">
                      {student.name.charAt(0)}{student.surname.charAt(0)}
                    </div>
                    <div className="student-meta">
                      <h3>{student.name} {student.surname}</h3>
                      <p className="student-class">{cName} - Section {sName}</p>
                    </div>
                    <span className={`status-badge ${student.status.toLowerCase()}`}>
                      {student.status}
                    </span>
                  </div>

                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Admission Number:</span>
                      <span className="detail-value">{student.admission_number}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Username:</span>
                      <span className="detail-value font-mono">{student.admission_number}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Password:</span>
                      <div className="password-wrapper">
                        <span className="detail-value font-mono">
                          {showPassword ? (student.password || 'Student123') : '••••••••••••'}
                        </span>
                        <button className="btn-icon" onClick={() => togglePassword(student.id)}>
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button className="btn-secondary" onClick={() => handleCopy(student)}>
                      {copiedId === student.id ? (
                        <>
                          <Check size={14} className="success-icon" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy Info</span>
                        </>
                      )}
                    </button>
                    <button className="btn-secondary" onClick={() => handlePrintSlip(student)}>
                      <Printer size={14} />
                      <span>Print Slip</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* --- Pagination --- */}
          {totalPages > 1 && (
            <div className="pagination">
              <span className="page-info">
                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} Students
              </span>
              <div className="page-buttons">
                <button 
                  className="page-nav-btn" 
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                  .map((p, idx, arr) => {
                    const showDots = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showDots && <span className="pagination-dots">...</span>}
                        <button 
                          className={`page-num-btn ${currentPage === p ? 'active' : ''}`}
                          onClick={() => handlePageChange(p)}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
                <button 
                  className="page-nav-btn" 
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- Single Student Print Slip Modal --- */}
      {showPrintModal && selectedPrintStudent && (
        <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Print Credentials Slip</h2>
              <button className="btn-icon close-btn" onClick={() => setShowPrintModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Slip layout for display */}
              <div id="credentials-print-area" className="credentials-print-slip">
                <div className="slip-brand">
                  <User size={24} className="slip-logo" />
                  <div>
                    <h3>SCHOOL MANAGEMENT SYSTEM</h3>
                    <p>Student Authentication Card</p>
                  </div>
                </div>
                <div className="slip-info">
                  <div className="slip-row">
                    <span className="lbl">Student Name:</span>
                    <span className="val">{selectedPrintStudent.name} {selectedPrintStudent.surname}</span>
                  </div>
                  <div className="slip-row">
                    <span className="lbl">Class & Section:</span>
                    <span className="val">{selectedPrintStudent.className} - {selectedPrintStudent.sectionName}</span>
                  </div>
                  <div className="slip-row border-t pt-2 mt-2">
                    <span className="lbl highlight">Username:</span>
                    <span className="val font-mono highlight">{selectedPrintStudent.admission_number}</span>
                  </div>
                  <div className="slip-row">
                    <span className="lbl highlight">Password:</span>
                    <span className="val font-mono highlight">{selectedPrintStudent.password || 'Student123'}</span>
                  </div>
                </div>
                <div className="slip-warning">
                  <Lock size={12} />
                  <span>Please keep this card safe. Do not share your login password.</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={executePrint}>
                <Printer size={16} />
                <span>Print Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCredentials;
