import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  UserCheck,
  DollarSign,
  TrendingUp,
  Calendar,
  Activity,
  FileText,
  Plus,
  CheckSquare,
  LayoutGrid,
  Layers,
  Settings,
  AlertCircle,
  CalendarCheck,
  ArrowUpRight,
  TrendingDown,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

import { STUDENTS, STUDENT_LEDGER, CLASSES, SECTIONS } from '../../data/academicMockData';
import { STAFF, STAFF_DETAILS_MAP } from '../../data/staffDetailsMockData';
import { getAttendanceLogs } from '../../data/teacherMockData';

import './Dashboard.css';

const Dashboard: React.FC = () => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // --- Real-time Local State (to trigger updates when localStorage/DB updates) ---
  const [dataVersion, setDataVersion] = useState(0);

  // Sync when window regains focus or local storage emits change
  useEffect(() => {
    const handleStorageChange = () => {
      setDataVersion(prev => prev + 1);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  // --- 1. Basic Demographics & Stats ---
  const activeStudents = useMemo(() => {
    return STUDENTS.filter(s => s.status === 'ACTIVE');
  }, [dataVersion]);



  const totalMonthlySalaryExpense = useMemo(() => {
    return STAFF
      .filter(s => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + (s.monthlySalary || 0), 0);
  }, [dataVersion]);

  // --- 2. Student Attendance Metrics ---
  const studentAttendanceMetrics = useMemo(() => {
    const logs = getAttendanceLogs();
    // Filter for today
    let todayLogs = logs.filter(l => l.date === todayStr);
    let isTodayLog = true;
    let logDateLabel = 'Today';

    // Fallback to latest log date if today doesn't exist
    if (todayLogs.length === 0 && logs.length > 0) {
      const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
      const latestDate = sortedLogs[0].date;
      todayLogs = logs.filter(l => l.date === latestDate);
      isTodayLog = false;
      const parsedDate = new Date(latestDate);
      logDateLabel = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    let totalLoggedStudents = 0;
    let present = 0;
    let absent = 0;
    let leave = 0;

    if (todayLogs.length > 0) {
      todayLogs.forEach(log => {
        log.records.forEach(rec => {
          totalLoggedStudents++;
          if (rec.status === 'PRESENT' || rec.status === 'LATE' || rec.status === 'HALF_DAY') {
            present++;
          } else if (rec.status === 'ABSENT') {
            absent++;
          } else if (rec.status === 'LEAVE') {
            leave++;
          }
        });
      });
    }

    // Default seeded baseline if logs are completely empty
    if (totalLoggedStudents === 0) {
      totalLoggedStudents = activeStudents.length;
      present = Math.round(activeStudents.length * 0.94);
      absent = Math.round(activeStudents.length * 0.04);
      leave = Math.round(activeStudents.length * 0.02);
    }

    const rate = totalLoggedStudents > 0 ? Math.round((present / totalLoggedStudents) * 100) : 94;

    return {
      rate,
      present,
      absent,
      leave,
      total: totalLoggedStudents,
      logDateLabel,
      isTodayLog
    };
  }, [todayStr, activeStudents, dataVersion]);

  // --- 3. Staff Attendance Metrics ---
  const staffAttendanceMetrics = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let total = 0;

    STAFF.forEach(member => {
      if (member.status === 'INACTIVE') return;
      total++;

      const details = STAFF_DETAILS_MAP[member.id];
      const todayPunch = details?.attendance.find(a => a.date === todayStr);

      if (todayPunch) {
        if (todayPunch.status === 'PRESENT' || todayPunch.status === 'LATE' || todayPunch.status === 'HALF_DAY') {
          present++;
        } else if (todayPunch.status === 'ABSENT') {
          absent++;
        } else if (todayPunch.status === 'LEAVE') {
          leave++;
        }
      } else {
        if (member.status === 'ON_LEAVE') {
          leave++;
        } else {
          present++; // default baseline present
        }
      }
    });

    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    return {
      rate,
      present,
      absent,
      leave,
      total
    };
  }, [todayStr, dataVersion]);

  // --- 4. Fee Collections Summary ---
  const feeMetrics = useMemo(() => {
    let expected = 0;
    let collected = 0;
    let pending = 0;
    let overdue = 0;
    let monthlyCollected = 0;

    activeStudents.forEach(student => {
      const ledger = STUDENT_LEDGER[student.id];
      if (ledger) {
        expected += ledger.totalFee;
        collected += ledger.paidAmount;
        pending += ledger.pendingAmount;
        overdue += ledger.overdueAmount;

        ledger.payments.forEach(p => {
          if (p.status === 'PAID' && p.date.startsWith('2026-06')) {
            monthlyCollected += p.amount;
          }
        });
      }
    });

    const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    return {
      expected,
      collected,
      pending,
      overdue,
      monthlyCollected,
      collectionRate
    };
  }, [activeStudents, dataVersion]);

  // --- 5. Top 10 Pending Fee Students ---
  const topPendingFeeStudents = useMemo(() => {
    return activeStudents
      .map(student => {
        const ledger = STUDENT_LEDGER[student.id];
        const className = CLASSES.find(c => c.id === student.class_id)?.name || 'General';
        const secName = SECTIONS.find(sec => sec.id === student.grade_id)?.name || 'A';

        return {
          id: student.id,
          name: `${student.name} ${student.surname}`,
          className: `${className}-${secName}`,
          pendingAmount: ledger?.pendingAmount ?? 0,
          overdueAmount: ledger?.overdueAmount ?? 0
        };
      })
      .filter(item => item.pendingAmount > 0)
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 10);
  }, [activeStudents, dataVersion]);

  // --- 6. Class & Sections Strengths ---
  const classStrengths = useMemo(() => {
    return CLASSES.map(cls => {
      const sections = SECTIONS.filter(sec => sec.class_id === cls.id);
      const studentCount = STUDENTS.filter(s => s.class_id === cls.id && s.status === 'ACTIVE').length;

      return {
        id: cls.id,
        name: cls.name,
        sectionsCount: sections.length,
        studentCount
      };
    });
  }, [dataVersion]);

  // --- 7. Staff Breakdown ---
  const staffBreakdown = useMemo(() => {
    const academicStaff = STAFF.filter(s => s.role === 'Academic Staff' || s.role === 'Advisory Staff');
    const nonAcademicStaff = STAFF.filter(s => s.role === 'Administrative Staff' || s.role === 'Support Staff');

    let academicPresent = 0;
    let nonAcademicPresent = 0;

    academicStaff.forEach(s => {
      if (s.status === 'INACTIVE') return;
      const details = STAFF_DETAILS_MAP[s.id];
      const punch = details?.attendance.find(a => a.date === todayStr);
      const isPresent = punch
        ? (punch.status === 'PRESENT' || punch.status === 'LATE' || punch.status === 'HALF_DAY')
        : s.status === 'ACTIVE';
      if (isPresent) academicPresent++;
    });

    nonAcademicStaff.forEach(s => {
      if (s.status === 'INACTIVE') return;
      const details = STAFF_DETAILS_MAP[s.id];
      const punch = details?.attendance.find(a => a.date === todayStr);
      const isPresent = punch
        ? (punch.status === 'PRESENT' || punch.status === 'LATE' || punch.status === 'HALF_DAY')
        : s.status === 'ACTIVE';
      if (isPresent) nonAcademicPresent++;
    });

    return {
      academicCount: academicStaff.filter(s => s.status !== 'INACTIVE').length,
      academicPresent,
      nonAcademicCount: nonAcademicStaff.filter(s => s.status !== 'INACTIVE').length,
      nonAcademicPresent
    };
  }, [todayStr, dataVersion]);

  // --- 8. Dynamic Audit Log / Recent Activities Timeline (Top 20) ---
  const recentActivities = useMemo(() => {
    const list: any[] = [];

    // Class creation
    CLASSES.forEach(c => {
      // Parse dates safely. Mock default dates are 2026-06-01
      list.push({
        id: `act-cls-${c.id}`,
        type: 'class',
        title: 'Class Added',
        desc: `Academic Class "${c.name}" was registered inside Academic Year setup.`,
        timestamp: new Date('2026-06-01T08:00:00Z'),
        timeStr: 'Jun 01, 2026'
      });
    });

    // Student admissions
    STUDENTS.forEach(s => {
      const c = CLASSES.find(cl => cl.id === s.class_id);
      const isNew = s.id.startsWith('std-new') || s.admission_date === todayStr;
      
      list.push({
        id: `act-adm-${s.id}`,
        type: 'admission',
        title: 'New Student Enrollment',
        desc: `Student ${s.name} ${s.surname} admitted to class ${c?.name || 'Primary Grade'} under active ledger.`,
        timestamp: isNew ? new Date() : new Date(`${s.admission_date || '2026-06-10'}T09:30:00`),
        timeStr: isNew ? 'Just now' : `${s.admission_date}`
      });
    });

    // Student attendance log submissions
    const attLogs = getAttendanceLogs();
    attLogs.forEach(log => {
      const c = CLASSES.find(cl => cl.id === log.classId);
      const s = SECTIONS.find(sec => sec.id === log.sectionId);
      const teach = STAFF.find(t => t.id === log.submittedBy);
      const presentNum = log.records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;

      list.push({
        id: `act-attlog-${log.id}`,
        type: 'attendance_student',
        title: 'Student Attendance Logged',
        desc: `Attendance roll call for ${c?.name || 'Class'}-${s?.name || 'Section'} logged by ${teach ? `${teach.name} ${teach.surname}` : 'Teacher'} (${presentNum}/${log.records.length} present).`,
        timestamp: new Date(`${log.date}T10:45:00`),
        timeStr: `${log.date}`
      });
    });

    // Staff leave approvals
    STAFF.forEach(staff => {
      const details = STAFF_DETAILS_MAP[staff.id];
      if (details?.leaveHistory) {
        details.leaveHistory.forEach(lh => {
          if (lh.status === 'APPROVED') {
            list.push({
              id: `act-leave-${staff.id}-${lh.id}`,
              type: 'leave',
              title: 'Staff Leave Approved',
              desc: `Leave request for ${staff.name} ${staff.surname} approved: ${lh.leaveType} (${lh.days} Days).`,
              timestamp: new Date(`${lh.startDate}T09:00:00`),
              timeStr: `${lh.startDate}`
            });
          }
        });
      }
    });

    // Fee Payments
    Object.values(STUDENT_LEDGER).forEach(ledger => {
      const student = STUDENTS.find(s => s.id === ledger.studentId);
      if (!student) return;

      ledger.payments.forEach(p => {
        const isNewPayment = p.receiptNumber.includes('PAY-NOW') || p.date === todayStr;
        list.push({
          id: `act-fee-${student.id}-${p.receiptNumber}`,
          type: 'fee',
          title: 'Fee Collection Punch',
          desc: `Receipt of ₹${p.amount.toLocaleString()} posted for student ${student.name} ${student.surname} (Receipt: ${p.receiptNumber}).`,
          timestamp: isNewPayment ? new Date() : new Date(`${p.date}T11:45:00`),
          timeStr: isNewPayment ? 'Just now' : `${p.date}`
        });
      });
    });

    // Sort descending by timestamp
    list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Pad if short (using baseline mock elements)
    const baselineMocks = [
      {
        id: 'act-mock-1',
        type: 'class',
        title: 'Timetable Schedules Maintained',
        desc: 'Class timetables and subjects mapping updated under Term schedules.',
        timestamp: new Date('2026-06-02T14:00:00Z'),
        timeStr: '2026-06-02'
      },
      {
        id: 'act-mock-2',
        type: 'leave',
        title: 'Term Operational Settings Confirmed',
        desc: 'Academic term structures, divisions and leaves calendar updated.',
        timestamp: new Date('2026-05-28T09:00:00Z'),
        timeStr: '2026-05-28'
      }
    ];

    const merged = [...list];
    baselineMocks.forEach(mock => {
      if (!merged.some(m => m.id === mock.id)) {
        merged.push(mock);
      }
    });

    merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return merged.slice(0, 20);
  }, [todayStr, dataVersion]);

  // --- 9. Recharts Chart Formatted Data ---
  // Financial Overview: Expected vs Collected by Class level
  const financeChartData = useMemo(() => {
    return CLASSES.map(cls => {
      let expected = 0;
      let collected = 0;
      
      STUDENTS.forEach(student => {
        if (student.class_id === cls.id && student.status === 'ACTIVE') {
          const ledger = STUDENT_LEDGER[student.id];
          if (ledger) {
            expected += ledger.totalFee;
            collected += ledger.paidAmount;
          }
        }
      });

      return {
        name: cls.name,
        Expected: expected,
        Collected: collected
      };
    });
  }, [dataVersion]);

  // Demographics Overview: Male vs Female ratio per Class
  const demographicsChartData = useMemo(() => {
    return CLASSES.map(cls => {
      const males = STUDENTS.filter(s => s.class_id === cls.id && s.sex === 'MALE' && s.status === 'ACTIVE').length;
      const females = STUDENTS.filter(s => s.class_id === cls.id && s.sex === 'FEMALE' && s.status === 'ACTIVE').length;

      return {
        name: cls.name,
        Boys: males,
        Girls: females
      };
    });
  }, [dataVersion]);

  // --- 10. Operational Notifications Panel Metrics ---
  const notificationMetrics = useMemo(() => {
    const unpaidFeesCount = STUDENTS.filter(s => s.status === 'ACTIVE' && (STUDENT_LEDGER[s.id]?.pendingAmount ?? 0) > 0).length;
    
    // Missing logs today: Count section supervisor assignments where attendance logs are missing
    const todayLogsCount = getAttendanceLogs().filter(l => l.date === todayStr).length;
    const missingAttendanceLogs = Math.max(0, SECTIONS.length - todayLogsCount);

    const pendingLeaveCount = STAFF.reduce((sum, s) => {
      const details = STAFF_DETAILS_MAP[s.id];
      const pendingLeaves = details?.leaveHistory.filter(l => l.status === 'PENDING').length || 0;
      return sum + pendingLeaves;
    }, 0);

    return {
      unpaidFeesCount,
      missingAttendanceLogs,
      pendingLeaveCount
    };
  }, [todayStr, dataVersion]);

  // --- 11. Custom Date Handler for activity logs relative text ---
  const formatTimeRelative = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="dashboard-container">
      {/* Upper header */}
      <div className="dashboard-card-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Operational Command Center</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time school status aggregates and administrator control panel.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          <Clock size={16} color="var(--primary)" />
          <span>Sync status: Active (Mock Ledger Live)</span>
        </div>
      </div>

      {/* Student & Financial KPI Cards */}
      <div className="kpi-grid">
        {/* Card 1: Active Students */}
        <div className="kpi-card">
          <div className="kpi-icon-wrapper primary">
            <GraduationCap size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{activeStudents.length}</span>
            <span className="kpi-label">Active Students</span>
          </div>
        </div>

        {/* Card 2: Student Attendance Today */}
        <div className="kpi-card">
          <div className="kpi-icon-wrapper success">
            <UserCheck size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{studentAttendanceMetrics.rate}%</span>
            <span className="kpi-label">Student Attendance</span>
          </div>
        </div>

        {/* Card 3: Monthly Collected Fees */}
        <div className="kpi-card">
          <div className="kpi-icon-wrapper success">
            <DollarSign size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">₹{(feeMetrics.monthlyCollected / 1000).toFixed(1)}k</span>
            <span className="kpi-label">Collected (June)</span>
          </div>
        </div>

        {/* Card 4: Total Expected Fees */}
        <div className="kpi-card">
          <div className="kpi-icon-wrapper info">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">₹{(feeMetrics.expected / 100000).toFixed(2)}L</span>
            <span className="kpi-label">Expected Fees</span>
          </div>
        </div>

        {/* Card 5: Monthly Pending Fees */}
        <div className="kpi-card">
          <div className="kpi-icon-wrapper danger">
            <TrendingDown size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">₹{(feeMetrics.pending / 100000).toFixed(2)}L</span>
            <span className="kpi-label">Pending Fees</span>
          </div>
        </div>
      </div>

      {/* Staff & Salary Expense KPI Cards */}
      <div style={{ marginTop: 8 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Staff & Salary Overview</h3>
        <div className="kpi-grid">
          {/* Card 1: Total Staff */}
          <div className="kpi-card">
            <div className="kpi-icon-wrapper info">
              <Users size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{staffAttendanceMetrics.total}</span>
              <span className="kpi-label">Total Staff</span>
            </div>
          </div>

          {/* Card 2: Present Today */}
          <div className="kpi-card">
            <div className="kpi-icon-wrapper success">
              <UserCheck size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{staffAttendanceMetrics.present}</span>
              <span className="kpi-label">Present Today</span>
            </div>
          </div>

          {/* Card 3: Absent Today */}
          <div className="kpi-card">
            <div className="kpi-icon-wrapper danger">
              <Users size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{staffAttendanceMetrics.absent}</span>
              <span className="kpi-label">Absent Today</span>
            </div>
          </div>

          {/* Card 4: On Leave */}
          <div className="kpi-card">
            <div className="kpi-icon-wrapper warning">
              <FileText size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{staffAttendanceMetrics.leave}</span>
              <span className="kpi-label">On Leave</span>
            </div>
          </div>

          {/* Card 5: Total Monthly Salary Expense */}
          <div className="kpi-card">
            <div className="kpi-icon-wrapper primary">
              <DollarSign size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">₹{totalMonthlySalaryExpense.toLocaleString()}</span>
              <span className="kpi-label">Total Monthly Salary Expense</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Splitted Grid Layout: Left (2 Cols) and Right (1 Col) */}
      <div className="dashboard-layout-grid">
        {/* Left Side: Operations & Charts */}
        <div className="dashboard-left-col">
          {/* Subgrid: Attendance Split and Staff Overview */}
          <div className="dashboard-subgrid-two">
            {/* Student vs Staff Attendance Analytics */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <span className="dashboard-card-title">
                    <Activity size={18} color="var(--primary)" />
                    Attendance Analytics
                  </span>
                  <span className="dashboard-card-subtitle">Student & Staff attendance breakdown today</span>
                </div>
              </div>
              <div className="attendance-stat-row">
                {/* Students Progress */}
                <div className="attendance-progress-container">
                  <div className="attendance-progress-info">
                    <span className="attendance-progress-label">Students ({studentAttendanceMetrics.logDateLabel})</span>
                    <span className="attendance-progress-percentage">{studentAttendanceMetrics.rate}%</span>
                  </div>
                  <div className="attendance-progress-bar-bg">
                    <div
                      className="attendance-progress-bar-fill student"
                      style={{ width: `${studentAttendanceMetrics.rate}%` }}
                    />
                  </div>
                  <div className="attendance-submetrics">
                    <div className="attendance-submetric-box">
                      <div className="attendance-submetric-value" style={{ color: 'var(--success)' }}>
                        {studentAttendanceMetrics.present}
                      </div>
                      <div className="attendance-submetric-label">Present</div>
                    </div>
                    <div className="attendance-submetric-box">
                      <div className="attendance-submetric-value" style={{ color: 'var(--danger)' }}>
                        {studentAttendanceMetrics.absent}
                      </div>
                      <div className="attendance-submetric-label">Absent</div>
                    </div>
                    <div className="attendance-submetric-box">
                      <div className="attendance-submetric-value" style={{ color: 'var(--warning)' }}>
                        {studentAttendanceMetrics.leave}
                      </div>
                      <div className="attendance-submetric-label">Leave</div>
                    </div>
                  </div>
                </div>

                {/* Staff Progress */}
                <div className="attendance-progress-container">
                  <div className="attendance-progress-info">
                    <span className="attendance-progress-label">Staff (Today)</span>
                    <span className="attendance-progress-percentage">{staffAttendanceMetrics.rate}%</span>
                  </div>
                  <div className="attendance-progress-bar-bg">
                    <div
                      className="attendance-progress-bar-fill staff"
                      style={{ width: `${staffAttendanceMetrics.rate}%` }}
                    />
                  </div>
                  <div className="attendance-submetrics">
                    <div className="attendance-submetric-box">
                      <div className="attendance-submetric-value" style={{ color: 'var(--success)' }}>
                        {staffAttendanceMetrics.present}
                      </div>
                      <div className="attendance-submetric-label">Present</div>
                    </div>
                    <div className="attendance-submetric-box">
                      <div className="attendance-submetric-value" style={{ color: 'var(--danger)' }}>
                        {staffAttendanceMetrics.absent}
                      </div>
                      <div className="attendance-submetric-label">Absent</div>
                    </div>
                    <div className="attendance-submetric-box">
                      <div className="attendance-submetric-value" style={{ color: 'var(--warning)' }}>
                        {staffAttendanceMetrics.leave}
                      </div>
                      <div className="attendance-submetric-label">Leave</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff Classification & Presence Overview */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <span className="dashboard-card-title">
                    <Users size={18} color="var(--success)" />
                    Staff Overview
                  </span>
                  <span className="dashboard-card-subtitle">Presence summary by academic roles</span>
                </div>
              </div>
              <div className="staff-overview-container">
                <div className="staff-category-row">
                  <div className="staff-category-label">
                    <div className="staff-category-icon">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <div>Academic Staff</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>Teachers & Instructors</div>
                    </div>
                  </div>
                  <div className="staff-category-count">
                    <div className="staff-count-main">{staffBreakdown.academicPresent} / {staffBreakdown.academicCount}</div>
                    <div className="staff-count-sub">Present Today</div>
                  </div>
                </div>

                <div className="staff-category-row">
                  <div className="staff-category-label">
                    <div className="staff-category-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                      <Users size={16} />
                    </div>
                    <div>
                      <div>Non-Academic Staff</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>Admin, Finance & Support</div>
                    </div>
                  </div>
                  <div className="staff-category-count">
                    <div className="staff-count-main">{staffBreakdown.nonAcademicPresent} / {staffBreakdown.nonAcademicCount}</div>
                    <div className="staff-count-sub">Present Today</div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                  <Link to="/list/teachers" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    Manage Directory
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Collection Progress & Top Overdues */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <span className="dashboard-card-title">
                  <DollarSign size={18} color="var(--success)" />
                  Fee Ledger & Cash Flow
                </span>
                <span className="dashboard-card-subtitle">Collection statistics and pending list</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)', backgroundColor: 'var(--success-light)', padding: '4px 10px', borderRadius: '20px' }}>
                Collection Rate: {feeMetrics.collectionRate}%
              </div>
            </div>

            <div className="fee-summary-details">
              <div className="fee-summary-box">
                <span className="fee-summary-box-label">Total Expected</span>
                <span className="fee-summary-box-value">₹{feeMetrics.expected.toLocaleString()}</span>
              </div>
              <div className="fee-summary-box">
                <span className="fee-summary-box-label">Total Collected</span>
                <span className="fee-summary-box-value collected">₹{feeMetrics.collected.toLocaleString()}</span>
              </div>
              <div className="fee-summary-box">
                <span className="fee-summary-box-label">Total Overdue Balance</span>
                <span className="fee-summary-box-value overdue">₹{feeMetrics.overdue.toLocaleString()}</span>
              </div>
            </div>

            {/* Top 10 Pending Fee List */}
            <div className="overdue-list-container">
              <div className="overdue-list-title">Top Student Outstanding Balances</div>
              <div className="overdue-table-wrapper">
                <table className="overdue-table">
                  <thead>
                    <tr>
                      <th>Student Roster</th>
                      <th>Class Group</th>
                      <th>Overdue Portion</th>
                      <th>Outstanding Balance</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPendingFeeStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '16px' }}>
                          No outstanding fee balances registered in the system.
                        </td>
                      </tr>
                    ) : (
                      topPendingFeeStudents.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td>{item.className}</td>
                          <td style={{ color: 'var(--warning)' }}>₹{item.overdueAmount.toLocaleString()}</td>
                          <td className="overdue-amount-cell">₹{item.pendingAmount.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Link to="/list/students" state={{ openFeesFor: item.id }} className="btn btn-icon" style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}>
                              Collect
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Fee Collections Trend and Gender Ratio Chart */}
          <div className="dashboard-subgrid-two">
            {/* Financial chart */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <span className="dashboard-card-title">Class-Wise Finances</span>
                  <span className="dashboard-card-subtitle">Expected vs Collected Fees per Class Level</span>
                </div>
              </div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={financeChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
                    <Bar dataKey="Expected" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Collected" fill="var(--success)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Demographics chart */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <span className="dashboard-card-title">Student Demographics</span>
                  <span className="dashboard-card-subtitle">Boys vs Girls counts by Class Level</span>
                </div>
              </div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={demographicsChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
                    <Bar dataKey="Boys" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Girls" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Quick controls, Calendar events, Notifications and Live Timeline */}
        <div className="dashboard-right-col">
          {/* Quick Actions Panel */}
          <div className="dashboard-card">
            <div className="dashboard-card-header" style={{ marginBottom: '16px' }}>
              <div>
                <span className="dashboard-card-title">
                  <LayoutGrid size={18} color="var(--primary)" />
                  Quick Actions
                </span>
                <span className="dashboard-card-subtitle">One-click administrative routes</span>
              </div>
            </div>
            <div className="quick-actions-grid">
              <Link to="/list/students" state={{ openCreateModal: true }} className="quick-action-card">
                <div className="quick-action-icon">
                  <Plus size={16} />
                </div>
                <span className="quick-action-label">Add Student</span>
              </Link>
              <Link to="/list/staff" state={{ openCreateModal: true }} className="quick-action-card">
                <div className="quick-action-icon">
                  <Users size={16} />
                </div>
                <span className="quick-action-label">Add Staff</span>
              </Link>
              <Link to="/list/students" className="quick-action-card">
                <div className="quick-action-icon">
                  <DollarSign size={16} />
                </div>
                <span className="quick-action-label">Collect Fee</span>
              </Link>
              <Link to="/teacher/attendance" className="quick-action-card">
                <div className="quick-action-icon">
                  <CheckSquare size={16} />
                </div>
                <span className="quick-action-label">Take Attend</span>
              </Link>
              <Link to="/list/classes" className="quick-action-card">
                <div className="quick-action-icon">
                  <Layers size={16} />
                </div>
                <span className="quick-action-label">Create Class</span>
              </Link>
              <Link to="/list/classes" className="quick-action-card">
                <div className="quick-action-icon">
                  <Settings size={16} />
                </div>
                <span className="quick-action-label">Academic Struct</span>
              </Link>
            </div>
          </div>

          {/* Operational Alerts / Notifications Panel */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <span className="dashboard-card-title">
                  <AlertCircle size={18} color="var(--danger)" />
                  Attention Items
                </span>
                <span className="dashboard-card-subtitle">Pending tasks requiring review</span>
              </div>
            </div>
            <div className="notification-list">
              {/* Missing attendance logs */}
              {notificationMetrics.missingAttendanceLogs > 0 && (
                <div className="notification-item warning">
                  <div className="notification-item-icon warning">
                    <CalendarCheck size={18} />
                  </div>
                  <div className="notification-item-content">
                    <div className="notification-item-text">Missing Roster Logs</div>
                    <div className="notification-item-desc">{notificationMetrics.missingAttendanceLogs} classroom sections have no attendance registered today.</div>
                  </div>
                </div>
              )}

              {/* Pending leave requests */}
              {notificationMetrics.pendingLeaveCount > 0 && (
                <div className="notification-item alert">
                  <div className="notification-item-icon danger">
                    <FileText size={18} />
                  </div>
                  <div className="notification-item-content">
                    <div className="notification-item-text">Leave Requests Pending</div>
                    <div className="notification-item-desc">{notificationMetrics.pendingLeaveCount} staff members have pending leave applications awaiting approval.</div>
                  </div>
                </div>
              )}

              {/* Unpaid student fees */}
              {notificationMetrics.unpaidFeesCount > 0 && (
                <div className="notification-item">
                  <div className="notification-item-icon info">
                    <DollarSign size={18} />
                  </div>
                  <div className="notification-item-content">
                    <div className="notification-item-text">Pending Balances</div>
                    <div className="notification-item-desc">{notificationMetrics.unpaidFeesCount} student fee structures remain unpaid or partially funded for the term.</div>
                  </div>
                </div>
              )}

              {notificationMetrics.missingAttendanceLogs === 0 &&
               notificationMetrics.pendingLeaveCount === 0 &&
               notificationMetrics.unpaidFeesCount === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '12px' }}>
                  All items are in order. No pending alerts.
                </div>
              )}
            </div>
          </div>

          {/* Academic Structure Classes List */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <span className="dashboard-card-title">
                  <Layers size={18} color="var(--primary)" />
                  Class Structures
                </span>
                <span className="dashboard-card-subtitle">Active student capacity per grade level</span>
              </div>
            </div>
            <div className="class-strength-list">
              {classStrengths.map(cls => (
                <div className="class-strength-item" key={cls.id}>
                  <div className="class-strength-info">
                    <span className="class-strength-name">{cls.name}</span>
                    <span className="class-strength-sections">{cls.sectionsCount} Section(s)</span>
                  </div>
                  <span className="class-strength-badge">{cls.studentCount} Students</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events widget */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <span className="dashboard-card-title">
                  <Calendar size={18} color="var(--warning)" />
                  Upcoming Events
                </span>
                <span className="dashboard-card-subtitle">Scheduled school activities and events</span>
              </div>
            </div>
            <div className="upcoming-events-list">
              <div className="upcoming-event-item">
                <div className="upcoming-event-date-box">
                  <span className="upcoming-event-day">19</span>
                  <span className="upcoming-event-month">Jun</span>
                </div>
                <div className="upcoming-event-details">
                  <span className="upcoming-event-title">Olympiad Prep Audit</span>
                  <span className="upcoming-event-time">09:00 AM - 11:30 AM</span>
                </div>
              </div>

              <div className="upcoming-event-item">
                <div className="upcoming-event-date-box">
                  <span className="upcoming-event-day">24</span>
                  <span className="upcoming-event-month">Jun</span>
                </div>
                <div className="upcoming-event-details">
                  <span className="upcoming-event-title">Science Lab Equipment Review</span>
                  <span className="upcoming-event-time">10:00 AM - 12:00 PM</span>
                </div>
              </div>

              <div className="upcoming-event-item">
                <div className="upcoming-event-date-box">
                  <span className="upcoming-event-day">30</span>
                  <span className="upcoming-event-month">Jun</span>
                </div>
                <div className="upcoming-event-details">
                  <span className="upcoming-event-title">Staff Monthly Payroll Disburse</span>
                  <span className="upcoming-event-time">08:00 AM - 05:00 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Dynamic Audit Log Timeline */}
      <div className="dashboard-card" style={{ marginTop: '8px' }}>
        <div className="dashboard-card-header">
          <div>
            <span className="dashboard-card-title">
              <Activity size={18} color="var(--primary)" />
              Real-Time Audit & Activity Log
            </span>
            <span className="dashboard-card-subtitle">Live chronological feed of database mutations and actions (latest 20 logs)</span>
          </div>
        </div>
        <div className="timeline-wrapper">
          <div className="timeline-line" />
          {recentActivities.map((act) => (
            <div className="timeline-item" key={act.id}>
              <div className="timeline-dot active" />
              <div className={`timeline-icon-box ${act.type}`}>
                {act.type === 'admission' && <GraduationCap size={16} />}
                {act.type === 'class' && <Layers size={16} />}
                {act.type === 'section' && <LayoutGrid size={16} />}
                {act.type === 'attendance_staff' && <UserCheck size={16} />}
                {act.type === 'attendance_student' && <CalendarCheck size={16} />}
                {act.type === 'fee' && <DollarSign size={16} />}
                {act.type === 'leave' && <FileText size={16} />}
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-title">{act.title}</span>
                  <span className="timeline-time">
                    {act.timestamp instanceof Date ? formatTimeRelative(act.timestamp) : act.timeStr}
                  </span>
                </div>
                <p className="timeline-desc">{act.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
