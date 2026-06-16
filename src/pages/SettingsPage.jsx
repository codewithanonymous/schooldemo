import React from 'react'

const SettingsPage = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '600px' }}>
      <div>
        <h1>Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure portal preferences and custom notifications.</p>
      </div>

      <div className="chart-card">
        <h2 style={{ marginBottom: '20px' }}>General Settings</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Enable Email Notifications</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Receive alerts for announcements and event updates.</div>
            </div>
            <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Daily Schedule Digest</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Get a daily morning email summary of your timetable.</div>
            </div>
            <input type="checkbox" style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>SMS Alerts</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Receive urgent notifications on your phone.</div>
            </div>
            <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
