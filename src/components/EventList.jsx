import React from 'react'
import { EVENTS } from '../data/mockData'

const EventList = () => {
  const now = new Date()
  const events = EVENTS
    .filter(e => new Date(e.start_time) >= now)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 5)

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2>Upcoming Events</h2>
        <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>View All</span>
      </div>

      {events.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {events.map((event, idx) => {
            const borderColors = ['var(--primary)', 'var(--success)', 'var(--warning)']
            return (
              <div
                key={event.id}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  borderTop: `4px solid ${borderColors[idx % 3]}`,
                  backgroundColor: 'rgba(255,255,255,0.01)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>{event.title}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(event.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{event.description}</p>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Date: {new Intl.DateTimeFormat('en-GB').format(new Date(event.start_time))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          No upcoming events
        </div>
      )}
    </div>
  )
}

export default EventList
