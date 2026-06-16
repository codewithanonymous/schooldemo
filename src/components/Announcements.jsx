import React from 'react'
import { ANNOUNCEMENTS } from '../data/mockData'

const Announcements = () => {
  const data = [...ANNOUNCEMENTS]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2>Announcements</h2>
        <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>View All</span>
      </div>

      {data.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {data.map((item, idx) => {
            const colors = ['var(--primary-light)', 'var(--success-light)', 'var(--warning-light)']
            const textColors = ['var(--primary)', 'var(--success)', 'var(--warning)']
            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: colors[idx % 3],
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: `4px solid ${textColors[idx % 3]}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>{item.title}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Intl.DateTimeFormat('en-GB').format(new Date(item.date))}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.description}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          No announcements
        </div>
      )}
    </div>
  )
}

export default Announcements
