import React from 'react'
import UserCard from '../../components/UserCard'
import CountChart from '../../components/charts/CountChart'
import AttendanceChart from '../../components/charts/AttendanceChart'
import FinanceChart from '../../components/charts/FinanceChart'
import Announcements from '../../components/Announcements'
import EventList from '../../components/EventList'

const AdminDashboard = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome to your school administration overview.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        {/* main container split in 2 columns (LEFT/RIGHT) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          
          <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {/* Column 1 - main charts & stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Stat cards row */}
              <div className="dashboard-grid">
                <UserCard type="admin" />
                <UserCard type="teacher" />
                <UserCard type="student" />
                <UserCard type="parent" />
              </div>

              {/* Sex / Attendance charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <div style={{ minHeight: '380px' }}>
                  <CountChart />
                </div>
                <div style={{ minHeight: '380px' }}>
                  <AttendanceChart />
                </div>
              </div>

              {/* Finance line chart */}
              <div style={{ minHeight: '380px' }}>
                <FinanceChart />
              </div>
            </div>

            {/* Column 2 - side panel events/announcements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '420px', width: '100%', justifySelf: 'end' }}>
              <EventList />
              <Announcements />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
