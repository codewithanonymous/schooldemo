import React, { useMemo } from 'react';
import { 
  getTeacherProfile, 
  getTeacherStats, 
  getWeeklyTimetable 
} from '../../data/teacherMockData';
import { ANNOUNCEMENTS } from '../../data/mockData';
import { TEACHER_ASSIGNMENTS, SECTIONS } from '../../data/academicMockData';
import { CURRENT_TEACHER_ID } from '../../data/teacherMockData';
import { 
  GraduationCap, 
  Users, 
  Calendar, 
  Award, 
  Clock, 
  ArrowRight,
  Megaphone
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './TeacherPortal.css';

const TeacherDashboard: React.FC = () => {
  const profile = getTeacherProfile();
  const stats = getTeacherStats();
  const timetable = getWeeklyTimetable();

  // Derive assigned section codes (e.g. 'cls-4a') from TEACHER_ASSIGNMENTS dynamically
  const myAssignedSectionIds = useMemo(() => {
    return TEACHER_ASSIGNMENTS
      .filter(a => a.teacher_id === CURRENT_TEACHER_ID)
      .map(a => a.section_id);
  }, []);

  // Map section_id → old-style class_id codes for announcements
  const myOldClassIds = useMemo(() => {
    return SECTIONS
      .filter(s => myAssignedSectionIds.includes(s.id))
      .map(s => {
        // Map new section code (e.g. '4A') back to legacy cls-4a format for announcements
        const code = s.code.toLowerCase().replace(/\s+/g, '-');
        return `cls-${code}`;
      });
  }, [myAssignedSectionIds]);

  // Filter announcements: global ones + ones matching assigned classes
  const filterAnnouncements = useMemo(() => {
    return ANNOUNCEMENTS.filter(a => !a.class_id || myOldClassIds.includes(a.class_id)).slice(0, 4);
  }, [myOldClassIds]);

  // Format date helper
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Welcome Banner */}
      <div>
        <h1>Welcome Back, Mr. {profile.name} {profile.surname}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Assigned Faculty portal dashboard. Manage student attendance rolls, record marks, and check timetables.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="classes-kpi-grid">
        <div className="class-kpi-card">
          <GraduationCap size={22} className="kpi-icon primary" />
          <div>
            <div className="kpi-label">Assigned Classes</div>
            <div className="kpi-val">{stats.assignedClassesCount} Levels</div>
          </div>
        </div>
        <div className="class-kpi-card">
          <Users size={22} className="kpi-icon success" />
          <div>
            <div className="kpi-label">Rostered Students</div>
            <div className="kpi-val">{stats.studentsCount} Active</div>
          </div>
        </div>
        <div className="class-kpi-card">
          <Calendar size={22} className="kpi-icon info" />
          <div>
            <div className="kpi-label">Timetable Lectures</div>
            <div className="kpi-val">{stats.timetableCount} Weekly</div>
          </div>
        </div>
        <div className="class-kpi-card">
          <Award size={22} className="kpi-icon warning" />
          <div>
            <div className="kpi-label">Pending Marks Entry</div>
            <div className="kpi-val">{stats.pendingMarksCount} Pending</div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="teacher-grid-layout">
        
        {/* Left: Schedule Timetable */}
        <div className="erp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>Weekly Assigned Lectures</h3>
          </div>
          
          <div className="timetable-list">
            {timetable.map(event => (
              <div key={event.id} className="timetable-event-item">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 6, height: 32, backgroundColor: 'var(--primary)', borderRadius: 3 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{event.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Classroom Roster Mapped • Section A
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="timetable-event-time" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
                  </div>
                  <Link to="/teacher/attendance" className="btn-icon" style={{ color: 'var(--primary)' }} title="Punches roll call">
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Announcements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Quick Actions Panel */}
          <div className="erp-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5 }}>Quick Portal Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              <Link to="/teacher/attendance" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                Roll Call (Punches)
              </Link>
              <Link to="/teacher/marks" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                Enter Subject Marks
              </Link>
              <Link to="/teacher/performance" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                Performance Analytics
              </Link>
            </div>
          </div>

          {/* Announcements Card */}
          <div className="erp-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="erp-card-title">
              <Megaphone size={16} /> <span>Announcements</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filterAnnouncements.map(ann => (
                <div key={ann.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{ann.title}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ann.date}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                    {ann.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default TeacherDashboard;
