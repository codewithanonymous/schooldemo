/**
 * CredentialsManagement.tsx
 * Centralized Admin Credential Management Page
 * Route: /admin/credentials
 *
 * Architecture: UI → credentialService.ts → credentialsMockData.ts → localStorage
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ShieldCheck, Users, GraduationCap, UserCheck, Briefcase,
  Search, Copy, Eye, EyeOff, Check, RefreshCw, Download,
  Printer, RotateCcw, PowerOff, Power, ChevronLeft, ChevronRight,
  X, Lock, KeyRound, AlertCircle, UserX, TrendingUp,
  CheckSquare, Square, ClipboardList
} from 'lucide-react';
import {
  getSummary,
  getStudentRows,
  getParentRows,
  getTeacherRows,
  getStaffRows,
  resetPassword,
  setStatus,
  generateNewResetPassword,
  generateMissingCredentials,
  regenerateAllPasswords,
  exportCredentialsToCSV,
  downloadCSV,
  reloadCredentials,
  type CredentialRow,
} from '../../services/credentialService';
import { CLASSES, SECTIONS } from '../../data/academicMockData';
import './CredentialsManagement.css';

// ─── Types ──────────────────────────────────────────────────────────────────
type TabId = 'students' | 'parents' | 'teachers' | 'staff';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

const ITEMS_PER_PAGE = 15;

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  subtitle?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon: Icon, label, value, color, subtitle }) => (
  <div className={`cred-kpi-card cred-kpi-${color}`}>
    <div className="cred-kpi-icon-wrap">
      <Icon size={22} />
    </div>
    <div className="cred-kpi-body">
      <span className="cred-kpi-value">{value.toLocaleString()}</span>
      <span className="cred-kpi-label">{label}</span>
      {subtitle && <span className="cred-kpi-sub">{subtitle}</span>}
    </div>
  </div>
);

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`cred-status-badge cred-status-${status.toLowerCase()}`}>
    {status}
  </span>
);

// ─── Copy Button ─────────────────────────────────────────────────────────────
const CopyBtn: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button className={`cred-copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy} title={`Copy ${label ?? ''}`}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
};

// ─── Password Cell ────────────────────────────────────────────────────────────
const PasswordCell: React.FC<{ password: string }> = ({ password }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="cred-password-cell">
      <span className="cred-mono">{show ? password : '••••••••••'}</span>
      <button className="cred-icon-btn" onClick={() => setShow((v) => !v)}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <CopyBtn text={password} label="password" />
    </div>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  count: number;
  onChange: (p: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ current, total, pageSize, count, onChange }) => {
  if (total <= 1) return null;
  const pages = Array.from({ length: total }, (_, i) => i + 1).filter(
    (p) => Math.abs(p - current) <= 2 || p === 1 || p === total,
  );
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, count);
  return (
    <div className="cred-pagination">
      <span className="cred-page-info">Showing {start}–{end} of {count}</span>
      <div className="cred-page-btns">
        <button className="cred-page-nav" disabled={current === 1} onClick={() => onChange(current - 1)}>
          <ChevronLeft size={15} />
        </button>
        {pages.map((p, idx, arr) => (
          <React.Fragment key={p}>
            {idx > 0 && p - arr[idx - 1] > 1 && <span className="cred-page-dots">…</span>}
            <button className={`cred-page-num ${current === p ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</button>
          </React.Fragment>
        ))}
        <button className="cred-page-nav" disabled={current === total} onClick={() => onChange(current + 1)}>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

// ─── Reset Password Modal ─────────────────────────────────────────────────────
interface ResetModalProps {
  row: CredentialRow;
  onClose: () => void;
  onConfirm: (newPwd: string) => void;
}

const ResetPasswordModal: React.FC<ResetModalProps> = ({ row, onClose, onConfirm }) => {
  const [newPwd, setNewPwd] = useState(() => generateNewResetPassword());
  const [show, setShow] = useState(false);
  const displayName = row.fullName ?? row.parentName ?? 'User';

  return (
    <div className="cred-modal-overlay" onClick={onClose}>
      <div className="cred-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cred-modal-header">
          <div className="cred-modal-title-wrap">
            <KeyRound size={18} className="cred-modal-icon" />
            <h3>Reset Password</h3>
          </div>
          <button className="cred-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="cred-modal-body">
          <p className="cred-modal-desc">
            Reset password for <strong>{displayName}</strong> ({row.credential.username})
          </p>
          <label className="cred-field-label">New Password</label>
          <div className="cred-pwd-input-wrap">
            <input
              className="cred-text-input"
              type={show ? 'text' : 'password'}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
            <button className="cred-icon-btn" onClick={() => setShow((v) => !v)}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button className="cred-icon-btn" title="Generate random" onClick={() => setNewPwd(generateNewResetPassword())}>
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
        <div className="cred-modal-footer">
          <button className="cred-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cred-btn-primary" onClick={() => { if (newPwd.trim()) onConfirm(newPwd.trim()); }}>
            <KeyRound size={14} /> Reset Password
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────
interface DrawerProps {
  row: CredentialRow;
  tab: TabId;
  onClose: () => void;
  onResetPassword: (row: CredentialRow) => void;
  onToggleStatus: (row: CredentialRow) => void;
}

const DetailDrawer: React.FC<DrawerProps> = ({ row, tab, onClose, onResetPassword, onToggleStatus }) => {
  const [showPwd, setShowPwd] = useState(false);
  const { credential } = row;
  const displayName = row.fullName ?? row.parentName ?? credential.username;
  const isActive = credential.status === 'active';

  const mockLastLogin = useMemo(() => {
    const days = Math.floor(Math.random() * 14) + 1;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [credential.id]);

  return (
    <>
      <div className="cred-drawer-backdrop open" onClick={onClose} />
      <div className="cred-drawer-panel">
        <div className="cred-drawer-header">
          <div className="cred-drawer-avatar">{displayName.charAt(0)}</div>
          <div className="cred-drawer-meta">
            <h2 className="cred-drawer-name">{displayName}</h2>
            <span className={`cred-drawer-role-badge cred-role-${tab}`}>{tab.toUpperCase()}</span>
          </div>
          <StatusBadge status={isActive ? 'active' : 'inactive'} />
          <button className="cred-icon-btn cred-drawer-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="cred-drawer-body">
          {/* Profile Info */}
          <div className="cred-drawer-section">
            <h4 className="cred-drawer-section-title">Profile Information</h4>
            <div className="cred-info-grid">
              {tab === 'students' && (
                <>
                  <div className="cred-info-row"><span className="cred-info-lbl">Full Name</span><span className="cred-info-val">{row.fullName}</span></div>
                  <div className="cred-info-row"><span className="cred-info-lbl">Admission No.</span><span className="cred-info-val cred-mono">{row.admissionNumber}</span></div>
                  <div className="cred-info-row"><span className="cred-info-lbl">Class</span><span className="cred-info-val">{row.className}</span></div>
                  <div className="cred-info-row"><span className="cred-info-lbl">Section</span><span className="cred-info-val">{row.sectionName}</span></div>
                </>
              )}
              {tab === 'parents' && (
                <>
                  <div className="cred-info-row"><span className="cred-info-lbl">Parent Name</span><span className="cred-info-val">{row.parentName}</span></div>
                  <div className="cred-info-row"><span className="cred-info-lbl">Phone</span><span className="cred-info-val cred-mono">{row.phone}</span></div>
                  <div className="cred-info-row"><span className="cred-info-lbl">Linked Student</span><span className="cred-info-val">{row.linkedStudentName ?? '—'}</span></div>
                  <div className="cred-info-row"><span className="cred-info-lbl">Admission No.</span><span className="cred-info-val cred-mono">{row.linkedAdmissionNumber ?? '—'}</span></div>
                </>
              )}
              {(tab === 'teachers' || tab === 'staff') && (
                <>
                  <div className="cred-info-row"><span className="cred-info-lbl">Full Name</span><span className="cred-info-val">{row.fullName}</span></div>
                  <div className="cred-info-row"><span className="cred-info-lbl">Employee ID</span><span className="cred-info-val cred-mono">{row.employeeId}</span></div>
                  <div className="cred-info-row"><span className="cred-info-lbl">Designation</span><span className="cred-info-val">{row.designation}</span></div>
                  <div className="cred-info-row"><span className="cred-info-lbl">Department</span><span className="cred-info-val">{row.department}</span></div>
                  <div className="cred-info-row"><span className="cred-info-lbl">Joining Year</span><span className="cred-info-val">{row.joiningYear}</span></div>
                </>
              )}
            </div>
          </div>

          {/* Credentials */}
          <div className="cred-drawer-section">
            <h4 className="cred-drawer-section-title">Login Credentials</h4>
            <div className="cred-credential-box">
              <div className="cred-cred-row">
                <Lock size={14} className="cred-cred-icon" />
                <span className="cred-cred-lbl">Username</span>
                <span className="cred-mono cred-cred-val">{credential.username}</span>
                <CopyBtn text={credential.username} label="username" />
              </div>
              <div className="cred-cred-row">
                <KeyRound size={14} className="cred-cred-icon" />
                <span className="cred-cred-lbl">Password</span>
                <span className="cred-mono cred-cred-val">{showPwd ? credential.password : '••••••••••'}</span>
                <button className="cred-icon-btn" onClick={() => setShowPwd((v) => !v)}>
                  {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <CopyBtn text={credential.password} label="password" />
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="cred-drawer-section">
            <h4 className="cred-drawer-section-title">Account Status</h4>
            <div className="cred-info-grid">
              <div className="cred-info-row"><span className="cred-info-lbl">Status</span><StatusBadge status={isActive ? 'active' : 'inactive'} /></div>
              <div className="cred-info-row"><span className="cred-info-lbl">Created On</span><span className="cred-info-val">{credential.createdDate}</span></div>
              <div className="cred-info-row"><span className="cred-info-lbl">Last Login</span><span className="cred-info-val">{mockLastLogin}</span></div>
            </div>
          </div>
        </div>

        {/* Drawer Actions */}
        <div className="cred-drawer-footer">
          <button className="cred-btn-secondary" onClick={() => onResetPassword(row)}>
            <KeyRound size={14} /> Reset Password
          </button>
          <button
            className={`cred-btn-secondary ${isActive ? 'cred-btn-danger' : 'cred-btn-success'}`}
            onClick={() => onToggleStatus(row)}
          >
            {isActive ? <><PowerOff size={14} /> Deactivate</> : <><Power size={14} /> Activate</>}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Print Slip ───────────────────────────────────────────────────────────────
function triggerPrintSlip(row: CredentialRow, tab: TabId): void {
  const win = window.open('', '_blank');
  if (!win) return;
  const displayName = row.fullName ?? row.parentName ?? row.credential.username;
  const detail =
    tab === 'students'
      ? `<p><strong>Class:</strong> ${row.className} - ${row.sectionName}</p><p><strong>Admission No:</strong> ${row.admissionNumber}</p>`
      : tab === 'parents'
      ? `<p><strong>Phone:</strong> ${row.phone}</p><p><strong>Linked Student:</strong> ${row.linkedStudentName ?? '—'}</p>`
      : `<p><strong>Employee ID:</strong> ${row.employeeId}</p><p><strong>Designation:</strong> ${row.designation}</p>`;
  win.document.write(`<html><head><title>Credentials Slip</title><style>
    body{font-family:Arial,sans-serif;padding:30px;max-width:400px;margin:auto;color:#000}
    .slip{border:2px dashed #333;padding:20px;border-radius:8px}
    h3{margin:0 0 4px;font-size:14px;text-transform:uppercase;letter-spacing:.05em}
    p{margin:6px 0;font-size:13px}.highlight{font-size:15px;font-weight:700;color:#4f46e5}
    .footer{font-size:10px;color:#666;margin-top:12px;border-top:1px solid #ccc;padding-top:8px}
    @media print{body{padding:0}}
  </style></head><body>
    <div class="slip">
      <h3>School Management System — Login Credentials</h3>
      <hr/>
      <p><strong>Name:</strong> ${displayName}</p>${detail}
      <p><strong>Username:</strong> <span class="highlight">${row.credential.username}</span></p>
      <p><strong>Password:</strong> <span class="highlight">${row.credential.password}</span></p>
      <div class="footer">Keep this slip confidential. Do not share your password.</div>
    </div>
    <div style="margin-top:16px;text-align:right">
      <button onclick="window.print()" style="padding:8px 16px;cursor:pointer;font-weight:700">Print</button>
    </div>
  </body></html>`);
  win.document.close();
}

// ─── Students Table ───────────────────────────────────────────────────────────
interface StudentsTabProps {
  onRowClick: (row: CredentialRow) => void;
  onReset: (row: CredentialRow) => void;
  onToggleStatus: (row: CredentialRow) => void;
  refreshKey: number;
}

const StudentsTab: React.FC<StudentsTabProps> = ({ onRowClick, onReset, onToggleStatus, refreshKey }) => {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const classNames = useMemo(() => [...new Set(CLASSES.map((c) => c.name))].sort(), []);
  const sectionNames = useMemo(() => [...new Set(SECTIONS.map((s) => s.name))].sort(), []);

  const allRows = useMemo(() => getStudentRows({
    search,
    classId: classFilter !== 'all' ? classFilter : undefined,
    sectionId: sectionFilter !== 'all' ? sectionFilter : undefined,
    status: statusFilter !== 'all' ? (statusFilter as 'active' | 'inactive') : 'all',
  }), [search, classFilter, sectionFilter, statusFilter, refreshKey]);

  const totalPages = Math.ceil(allRows.length / ITEMS_PER_PAGE);
  const pageRows = allRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelectedIds(pageRows.length === selectedIds.size && pageRows.every(r => selectedIds.has(r.credential.id)) ? new Set() : new Set(pageRows.map(r => r.credential.id)));

  return (
    <div className="cred-tab-content">
      {/* Filters */}
      <div className="cred-filters-bar">
        <div className="cred-search-wrap">
          <Search size={16} className="cred-search-icon" />
          <input className="cred-search-input" placeholder="Search name, admission no., username…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {search && <button className="cred-clear-search" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <div className="cred-filter-chips">
          <select className="cred-filter-select" value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}>
            <option value="all">All Classes</option>
            {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="cred-filter-select" value={sectionFilter} onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}>
            <option value="all">All Sections</option>
            {sectionNames.map((s) => <option key={s} value={s}>Section {s}</option>)}
          </select>
          <select className="cred-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="cred-result-count">{allRows.length} records</span>
      </div>

      {/* Table */}
      <div className="cred-table-wrap">
        <table className="cred-table">
          <thead>
            <tr>
              <th className="cred-th-check">
                <button className="cred-icon-btn" onClick={toggleAll}>
                  {pageRows.length > 0 && pageRows.every(r => selectedIds.has(r.credential.id)) ? <CheckSquare size={15}/> : <Square size={15}/>}
                </button>
              </th>
              <th>Student Name</th>
              <th>Admission No.</th>
              <th>Class</th>
              <th>Section</th>
              <th>Username</th>
              <th>Password</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={10} className="cred-empty-cell"><AlertCircle size={20} /> No records found</td></tr>
            ) : pageRows.map((row) => (
              <tr key={row.credential.id} className="cred-tr" onClick={() => onRowClick(row)}>
                <td className="cred-td-check" onClick={(e) => e.stopPropagation()}>
                  <button className="cred-icon-btn" onClick={() => toggleSelect(row.credential.id)}>
                    {selectedIds.has(row.credential.id) ? <CheckSquare size={15}/> : <Square size={15}/>}
                  </button>
                </td>
                <td><div className="cred-name-cell"><div className="cred-avatar">{(row.fullName ?? '?').charAt(0)}</div><span>{row.fullName}</span></div></td>
                <td><span className="cred-mono">{row.admissionNumber}</span></td>
                <td>{row.className}</td>
                <td>{row.sectionName}</td>
                <td><div className="cred-username-cell"><span className="cred-mono">{row.credential.username}</span><CopyBtn text={row.credential.username} label="username" /></div></td>
                <td onClick={(e) => e.stopPropagation()}><PasswordCell password={row.credential.password} /></td>
                <td><StatusBadge status={row.credential.status} /></td>
                <td className="cred-date-cell">{row.credential.createdDate}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="cred-action-btns">
                    <button className="cred-action-btn" title="Reset Password" onClick={() => onReset(row)}><KeyRound size={13}/></button>
                    <button className="cred-action-btn" title="Print Slip" onClick={() => triggerPrintSlip(row, 'students')}><Printer size={13}/></button>
                    <button className={`cred-action-btn ${row.credential.status === 'active' ? 'cred-action-danger' : 'cred-action-success'}`} title={row.credential.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => onToggleStatus(row)}>
                      {row.credential.status === 'active' ? <PowerOff size={13}/> : <Power size={13}/>}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination current={page} total={totalPages} pageSize={ITEMS_PER_PAGE} count={allRows.length} onChange={setPage} />
    </div>
  );
};

// ─── Parents Table ────────────────────────────────────────────────────────────
interface ParentsTabProps {
  onRowClick: (row: CredentialRow) => void;
  onReset: (row: CredentialRow) => void;
  onToggleStatus: (row: CredentialRow) => void;
  refreshKey: number;
}

const ParentsTab: React.FC<ParentsTabProps> = ({ onRowClick, onReset, onToggleStatus, refreshKey }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const allRows = useMemo(() => getParentRows({
    search,
    status: statusFilter !== 'all' ? (statusFilter as 'active' | 'inactive') : 'all',
  }), [search, statusFilter, refreshKey]);

  const totalPages = Math.ceil(allRows.length / ITEMS_PER_PAGE);
  const pageRows = allRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="cred-tab-content">
      <div className="cred-filters-bar">
        <div className="cred-search-wrap">
          <Search size={16} className="cred-search-icon" />
          <input className="cred-search-input" placeholder="Search parent name, student name, phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {search && <button className="cred-clear-search" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <div className="cred-filter-chips">
          <select className="cred-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="cred-result-count">{allRows.length} records</span>
      </div>

      <div className="cred-table-wrap">
        <table className="cred-table">
          <thead>
            <tr>
              <th>Parent Name</th>
              <th>Student Name</th>
              <th>Phone</th>
              <th>Username</th>
              <th>Password</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={8} className="cred-empty-cell"><AlertCircle size={20} /> No records found</td></tr>
            ) : pageRows.map((row) => (
              <tr key={row.credential.id} className="cred-tr" onClick={() => onRowClick(row)}>
                <td><div className="cred-name-cell"><div className="cred-avatar cred-avatar-parent">{(row.parentName ?? '?').charAt(0)}</div><span>{row.parentName}</span></div></td>
                <td>{row.linkedStudentName ?? <span className="cred-muted">—</span>}</td>
                <td><span className="cred-mono">{row.phone}</span></td>
                <td><div className="cred-username-cell"><span className="cred-mono">{row.credential.username}</span><CopyBtn text={row.credential.username} label="username" /></div></td>
                <td onClick={(e) => e.stopPropagation()}><PasswordCell password={row.credential.password} /></td>
                <td><StatusBadge status={row.credential.status} /></td>
                <td className="cred-date-cell">{row.credential.createdDate}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="cred-action-btns">
                    <button className="cred-action-btn" title="Reset Password" onClick={() => onReset(row)}><KeyRound size={13}/></button>
                    <button className="cred-action-btn" title="Print Slip" onClick={() => triggerPrintSlip(row, 'parents')}><Printer size={13}/></button>
                    <button className={`cred-action-btn ${row.credential.status === 'active' ? 'cred-action-danger' : 'cred-action-success'}`} title={row.credential.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => onToggleStatus(row)}>
                      {row.credential.status === 'active' ? <PowerOff size={13}/> : <Power size={13}/>}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination current={page} total={totalPages} pageSize={ITEMS_PER_PAGE} count={allRows.length} onChange={setPage} />
    </div>
  );
};

// ─── Teachers Table ───────────────────────────────────────────────────────────
interface TeachersTabProps {
  onRowClick: (row: CredentialRow) => void;
  onReset: (row: CredentialRow) => void;
  onToggleStatus: (row: CredentialRow) => void;
  refreshKey: number;
}

const TeachersTab: React.FC<TeachersTabProps> = ({ onRowClick, onReset, onToggleStatus, refreshKey }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const allRows = useMemo(() => getTeacherRows({
    search,
    status: statusFilter !== 'all' ? (statusFilter as 'active' | 'inactive') : 'all',
  }), [search, statusFilter, refreshKey]);

  const totalPages = Math.ceil(allRows.length / ITEMS_PER_PAGE);
  const pageRows = allRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="cred-tab-content">
      <div className="cred-filters-bar">
        <div className="cred-search-wrap">
          <Search size={16} className="cred-search-icon" />
          <input className="cred-search-input" placeholder="Search teacher name, employee ID…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {search && <button className="cred-clear-search" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <div className="cred-filter-chips">
          <select className="cred-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="cred-result-count">{allRows.length} records</span>
      </div>

      <div className="cred-table-wrap">
        <table className="cred-table">
          <thead>
            <tr>
              <th>Teacher Name</th>
              <th>Employee ID</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Username</th>
              <th>Password</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={8} className="cred-empty-cell"><AlertCircle size={20} /> No records found</td></tr>
            ) : pageRows.map((row) => (
              <tr key={row.credential.id} className="cred-tr" onClick={() => onRowClick(row)}>
                <td><div className="cred-name-cell"><div className="cred-avatar cred-avatar-teacher">{(row.fullName ?? '?').charAt(0)}</div><span>{row.fullName}</span></div></td>
                <td><span className="cred-mono">{row.employeeId}</span></td>
                <td><span className="cred-designation-pill">{row.designation}</span></td>
                <td><span className="cred-muted-sm">{row.department}</span></td>
                <td><div className="cred-username-cell"><span className="cred-mono">{row.credential.username}</span><CopyBtn text={row.credential.username} label="username" /></div></td>
                <td onClick={(e) => e.stopPropagation()}><PasswordCell password={row.credential.password} /></td>
                <td><StatusBadge status={row.credential.status} /></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="cred-action-btns">
                    <button className="cred-action-btn" title="Reset Password" onClick={() => onReset(row)}><KeyRound size={13}/></button>
                    <button className="cred-action-btn" title="Print Slip" onClick={() => triggerPrintSlip(row, 'teachers')}><Printer size={13}/></button>
                    <button className={`cred-action-btn ${row.credential.status === 'active' ? 'cred-action-danger' : 'cred-action-success'}`} title={row.credential.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => onToggleStatus(row)}>
                      {row.credential.status === 'active' ? <PowerOff size={13}/> : <Power size={13}/>}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination current={page} total={totalPages} pageSize={ITEMS_PER_PAGE} count={allRows.length} onChange={setPage} />
    </div>
  );
};

// ─── Staff Table ──────────────────────────────────────────────────────────────
interface StaffTabProps {
  onRowClick: (row: CredentialRow) => void;
  onReset: (row: CredentialRow) => void;
  onToggleStatus: (row: CredentialRow) => void;
  refreshKey: number;
}

const StaffTab: React.FC<StaffTabProps> = ({ onRowClick, onReset, onToggleStatus, refreshKey }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const allRows = useMemo(() => getStaffRows({
    search,
    status: statusFilter !== 'all' ? (statusFilter as 'active' | 'inactive') : 'all',
  }), [search, statusFilter, refreshKey]);

  const totalPages = Math.ceil(allRows.length / ITEMS_PER_PAGE);
  const pageRows = allRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="cred-tab-content">
      <div className="cred-filters-bar">
        <div className="cred-search-wrap">
          <Search size={16} className="cred-search-icon" />
          <input className="cred-search-input" placeholder="Search staff name, employee ID…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {search && <button className="cred-clear-search" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <div className="cred-filter-chips">
          <select className="cred-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="cred-result-count">{allRows.length} records</span>
      </div>

      <div className="cred-table-wrap">
        <table className="cred-table">
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Employee ID</th>
              <th>Role / Designation</th>
              <th>Department</th>
              <th>Username</th>
              <th>Password</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={8} className="cred-empty-cell"><AlertCircle size={20} /> No records found</td></tr>
            ) : pageRows.map((row) => (
              <tr key={row.credential.id} className="cred-tr" onClick={() => onRowClick(row)}>
                <td><div className="cred-name-cell"><div className="cred-avatar cred-avatar-staff">{(row.fullName ?? '?').charAt(0)}</div><span>{row.fullName}</span></div></td>
                <td><span className="cred-mono">{row.employeeId}</span></td>
                <td><span className="cred-designation-pill cred-designation-staff">{row.designation}</span></td>
                <td><span className="cred-muted-sm">{row.department}</span></td>
                <td><div className="cred-username-cell"><span className="cred-mono">{row.credential.username}</span><CopyBtn text={row.credential.username} label="username" /></div></td>
                <td onClick={(e) => e.stopPropagation()}><PasswordCell password={row.credential.password} /></td>
                <td><StatusBadge status={row.credential.status} /></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="cred-action-btns">
                    <button className="cred-action-btn" title="Reset Password" onClick={() => onReset(row)}><KeyRound size={13}/></button>
                    <button className="cred-action-btn" title="Print Slip" onClick={() => triggerPrintSlip(row, 'staff')}><Printer size={13}/></button>
                    <button className={`cred-action-btn ${row.credential.status === 'active' ? 'cred-action-danger' : 'cred-action-success'}`} title={row.credential.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => onToggleStatus(row)}>
                      {row.credential.status === 'active' ? <PowerOff size={13}/> : <Power size={13}/>}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination current={page} total={totalPages} pageSize={ITEMS_PER_PAGE} count={allRows.length} onChange={setPage} />
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CredentialsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('students');
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState(() => getSummary());
  const [drawerRow, setDrawerRow] = useState<CredentialRow | null>(null);
  const [resetRow, setResetRow] = useState<CredentialRow | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const refresh = useCallback(() => {
    reloadCredentials();
    setSummary(getSummary());
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRowClick = useCallback((row: CredentialRow) => setDrawerRow(row), []);

  const handleReset = useCallback((row: CredentialRow) => {
    setDrawerRow(null);
    setResetRow(row);
  }, []);

  const handleResetConfirm = useCallback((newPwd: string) => {
    if (!resetRow) return;
    resetPassword(resetRow.credential.id, newPwd);
    setResetRow(null);
    refresh();
    showToast('Password reset successfully');
  }, [resetRow, refresh, showToast]);

  const handleToggleStatus = useCallback((row: CredentialRow) => {
    const newStatus = row.credential.status === 'active' ? 'inactive' : 'active';
    setStatus(row.credential.id, newStatus);
    setDrawerRow(null);
    refresh();
    showToast(`Account ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
  }, [refresh, showToast]);

  const handleGenerateMissing = useCallback(() => {
    setBulkLoading(true);
    setTimeout(() => {
      const result = generateMissingCredentials(activeTab === 'staff' ? 'staff' : activeTab as any);
      refresh();
      setBulkLoading(false);
      showToast(`Generated ${result.generated.length - result.skipped.length} missing credentials`, 'success');
    }, 400);
  }, [activeTab, refresh, showToast]);

  const handleRegeneratePasswords = useCallback(() => {
    setBulkLoading(true);
    setTimeout(() => {
      const count = regenerateAllPasswords(activeTab === 'staff' ? 'staff' : activeTab as any);
      refresh();
      setBulkLoading(false);
      showToast(`Regenerated passwords for ${count} accounts`, 'info');
    }, 400);
  }, [activeTab, refresh, showToast]);

  const handleExport = useCallback(() => {
    let rows: CredentialRow[] = [];
    if (activeTab === 'students') rows = getStudentRows();
    else if (activeTab === 'parents') rows = getParentRows();
    else if (activeTab === 'teachers') rows = getTeacherRows();
    else rows = getStaffRows();

    const csv = exportCredentialsToCSV(rows, activeTab === 'staff' || activeTab === 'teachers' ? 'teacher' : activeTab as any);
    downloadCSV(csv, `${activeTab}-credentials-${new Date().toISOString().slice(0, 10)}.csv`);
    showToast(`Exported ${rows.length} ${activeTab} credentials`, 'success');
  }, [activeTab, showToast]);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'parents', label: 'Parents', icon: Users },
    { id: 'teachers', label: 'Teachers', icon: UserCheck },
    { id: 'staff', label: 'Staff', icon: Briefcase },
  ];

  return (
    <div className="cred-page">
      {/* Page Header */}
      <div className="cred-page-header">
        <div className="cred-page-title-wrap">
          <ShieldCheck size={26} className="cred-page-title-icon" />
          <div>
            <h1 className="cred-page-title">Credential Management</h1>
            <p className="cred-page-subtitle">Manage login credentials for students, parents, teachers and staff from one place.</p>
          </div>
        </div>
        <div className="cred-header-actions">
          <button className="cred-btn-ghost" onClick={refresh} title="Reload data">
            <RefreshCw size={15} /> Reload
          </button>
          <button className="cred-btn-secondary" onClick={handleGenerateMissing} disabled={bulkLoading}>
            <ClipboardList size={15} /> Generate Missing
          </button>
          <button className="cred-btn-secondary" onClick={handleRegeneratePasswords} disabled={bulkLoading}>
            <RotateCcw size={15} /> Regenerate Passwords
          </button>
          <button className="cred-btn-primary" onClick={handleExport}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="cred-kpi-grid">
        <KpiCard icon={GraduationCap} label="Student Accounts" value={summary.totalStudents} color="blue" subtitle="Active portal users" />
        <KpiCard icon={Users} label="Parent Accounts" value={summary.totalParents} color="purple" subtitle="Linked to students" />
        <KpiCard icon={UserCheck} label="Teacher Accounts" value={summary.totalTeachers} color="teal" subtitle="Academic staff" />
        <KpiCard icon={Briefcase} label="Staff Accounts" value={summary.totalNonTeachingStaff} color="orange" subtitle="Non-teaching staff" />
        <KpiCard icon={TrendingUp} label="Active Accounts" value={summary.activeAccounts} color="green" subtitle="Currently enabled" />
        <KpiCard icon={UserX} label="Inactive Accounts" value={summary.inactiveAccounts} color="red" subtitle="Disabled accounts" />
      </div>

      {/* Tab Bar */}
      <div className="cred-tab-bar">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`cred-tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="cred-tab-panel">
        {activeTab === 'students' && <StudentsTab onRowClick={handleRowClick} onReset={handleReset} onToggleStatus={handleToggleStatus} refreshKey={refreshKey} />}
        {activeTab === 'parents' && <ParentsTab onRowClick={handleRowClick} onReset={handleReset} onToggleStatus={handleToggleStatus} refreshKey={refreshKey} />}
        {activeTab === 'teachers' && <TeachersTab onRowClick={handleRowClick} onReset={handleReset} onToggleStatus={handleToggleStatus} refreshKey={refreshKey} />}
        {activeTab === 'staff' && <StaffTab onRowClick={handleRowClick} onReset={handleReset} onToggleStatus={handleToggleStatus} refreshKey={refreshKey} />}
      </div>

      {/* Detail Drawer */}
      {drawerRow && (
        <DetailDrawer
          row={drawerRow}
          tab={activeTab}
          onClose={() => setDrawerRow(null)}
          onResetPassword={handleReset}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Reset Password Modal */}
      {resetRow && (
        <ResetPasswordModal
          row={resetRow}
          onClose={() => setResetRow(null)}
          onConfirm={handleResetConfirm}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`cred-toast cred-toast-${toast.type}`}>
          <Check size={15} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default CredentialsManagement;
