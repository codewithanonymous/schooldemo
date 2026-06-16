import React from 'react'
import { useAuth } from '../context/AuthContext'
import { User, Shield, Mail, Calendar, Award, Activity, CheckCircle } from 'lucide-react'
import Announcements from '../components/Announcements'

const Dashboard = () => {
  const { user, role } = useAuth()

  // Format date safely
  const creationDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Not Available'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Greeting */}
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          Welcome back, {user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          This is your personal workspace and application overview.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          
          {/* Main Workspace Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Glassmorphic Profile Card */}
            <div 
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
              }}
            >
              {/* Decorative background glow */}
              <div 
                style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'var(--primary)',
                  filter: 'blur(80px)',
                  opacity: 0.15,
                  pointerEvents: 'none'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                <div 
                  style={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '50%',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <User size={36} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Your Profile</h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>Account Status: Active</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Mail size={18} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '15px' }}>{user?.email || 'No email associated'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Shield size={18} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '15px', textTransform: 'capitalize' }}>Role: <strong>{role || 'user'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '15px' }}>Member Since: {creationDate}</span>
                </div>
              </div>
            </div>

            {/* Quick Status / Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div 
                className="chart-card" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  padding: '20px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>Verified</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email Authenticated</div>
                </div>
              </div>

              <div 
                className="chart-card" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  padding: '20px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <Activity size={24} style={{ color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>Default</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Workspace Settings</div>
                </div>
              </div>

              <div 
                className="chart-card" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  padding: '20px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <Award size={24} style={{ color: 'var(--warning)' }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>Regular</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Access Level Tier</div>
                </div>
              </div>
            </div>

            {/* Nice informational panel about their access permissions */}
            <div className="chart-card" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '12px', fontWeight: 600 }}>Access Scope Information</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                You are currently signed in with standard <strong>{role}</strong> access. This allows you to explore pages and items configured for your role. To gain administration capabilities, please request permissions escalation from the system administrator.
              </p>
            </div>

          </div>

          {/* Sidebar Announcements Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '420px', width: '100%', justifySelf: 'end' }}>
            <Announcements />
          </div>

        </div>
      </div>
    </div>
  )
}

export default Dashboard
