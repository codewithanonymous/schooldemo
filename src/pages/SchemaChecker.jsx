import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { expectedSchema } from '../lib/expectedSchema'
import { compareSchemas } from '../lib/schemaComparator'
import { 
  Database, 
  Terminal, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  ChevronRight, 
  ShieldAlert, 
  History,
  FileCode,
  Check
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SchemaChecker = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [activeSchema, setActiveSchema] = useState(null)
  const [mismatches, setMismatches] = useState([])
  const [migrations, setMigrations] = useState([])
  const [sqlScript, setSqlScript] = useState('')
  const [warnings, setWarnings] = useState([])
  const [historyList, setHistoryList] = useState([])

  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Dev mode restriction
  useEffect(() => {
    const checkLocalhost = () => {
      const hostname = window.location.hostname
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || import.meta.env.DEV
      setIsAuthorized(isLocal)
      setCheckingAuth(false)
    }
    checkLocalhost()
  }, [])

  const runAnalysis = async () => {
    setLoading(true)
    try {
      // 1. Fetch current schema from custom RPC
      const { data, error } = await supabase.rpc('inspect_schema')
      if (error) throw error

      if (data) {
        setActiveSchema(data)
        
        // 2. Run comparisons
        const analysis = compareSchemas(data, expectedSchema)
        setMismatches(analysis.mismatches || [])
        setSqlScript(analysis.sqlMigrations?.join('\n') || '')
        setWarnings(analysis.warnings || [])
        
        // 3. Set history list
        setHistoryList(data.migrations || [])
      }
    } catch (err) {
      console.error("Schema inspection failed:", err)
      alert(`Database inspection failed: ${err.message || JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthorized) {
      runAnalysis()
    }
  }, [isAuthorized])

  const handleApplyMigrations = async () => {
    if (!sqlScript) return
    const confirmText = "Are you sure you want to execute migrations on Supabase?\n\nThis will apply changes. Proceed?"
    if (!window.confirm(confirmText)) return

    setApplying(true)
    try {
      // Generate snapshots for history logging
      const beforeSnapshot = JSON.stringify(activeSchema)

      // Apply query-by-query via exec_sql
      const queries = sqlScript.split(';').map(q => q.trim()).filter(q => q.length > 0)
      let finalSuccess = true
      let finalError = null

      for (const q of queries) {
        const { data: res, error: rpcErr } = await supabase.rpc('exec_sql', { sql_query: q + ';' })
        if (rpcErr || (res && res.success === false)) {
          finalSuccess = false
          finalError = rpcErr?.message || res?.error || "SQL query execution failed."
          break
        }
      }

      // Refresh DB state
      const { data: updatedSchemaData } = await supabase.rpc('inspect_schema')
      const afterSnapshot = JSON.stringify(updatedSchemaData)

      // Write results to SchemaMigrationHistory log table
      await supabase.from('SchemaMigrationHistory').insert({
        sql: sqlScript,
        success: finalSuccess,
        error: finalError,
        before_snapshot: JSON.parse(beforeSnapshot),
        after_snapshot: updatedSchemaData
      })

      if (finalSuccess) {
        alert("✔ Schema corrections successfully applied to Supabase!")
      } else {
        alert(`✘ Some operations failed: ${finalError}`)
      }

      runAnalysis()
    } catch (err) {
      console.error("Migration application failed:", err)
      alert(`Error applying migrations: ${err.message}`)
    } finally {
      setApplying(false)
    }
  }

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#fff' }}>
        <RefreshCw className="spinner" style={{ marginRight: '12px' }} />
        <span>Authorizing Schema Validator...</span>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#fff', padding: '32px', textAlign: 'center' }}>
        <ShieldAlert size={64} color="var(--danger)" style={{ marginBottom: '24px' }} />
        <h1 style={{ marginBottom: '12px' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', marginBottom: '24px' }}>
          The Schema validation panel is restricted to development mode / localhost environments only.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>
          Go to Sign In
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', backgroundColor: 'var(--bg-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-icon" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Database size={28} style={{ color: 'var(--primary)' }} />
              Supabase Schema Checker & Migrator
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Automated schema inspector, integrity validation, and SQL generation panel.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={runAnalysis} disabled={loading || applying}>
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
            <span>Analyze Schema</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleApplyMigrations} 
            disabled={loading || applying || !sqlScript}
          >
            {applying ? (
              <>
                <RefreshCw size={16} className="spinner" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Apply SQL Corrections</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Layout (Left Content, Right History) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        
        {/* Left Column: Mismatches and SQL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Analysis Card */}
          <div className="chart-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span>Validation Report</span>
              {mismatches.length === 0 ? (
                <span className="badge badge-success" style={{ fontSize: '12px' }}>Schema Clean</span>
              ) : (
                <span className="badge badge-danger" style={{ fontSize: '12px' }}>{mismatches.length} Mismatches</span>
              )}
            </h2>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <div className="spinner"></div>
              </div>
            ) : mismatches.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mismatches.map((m, idx) => {
                  let alertColor = 'var(--warning-light)'
                  let borderCol = 'var(--warning)'
                  let Icon = AlertTriangle

                  if (m.severity === 'CRITICAL' || m.severity === 'HIGH') {
                    alertColor = 'var(--danger-light)'
                    borderCol = 'var(--danger)'
                    Icon = XCircle
                  } else if (m.severity === 'INFO') {
                    alertColor = 'var(--primary-light)'
                    borderCol = 'var(--primary)'
                    Icon = ChevronRight
                  }

                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        backgroundColor: alertColor, 
                        borderLeft: `4px solid ${borderCol}`, 
                        padding: '12px 16px', 
                        borderRadius: 'var(--radius-md)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px' 
                      }}
                    >
                      <Icon size={18} style={{ color: borderCol, flexShrink: 0 }} />
                      <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{m.message}</span>
                    </div>
                  )
                })}

                {warnings.length > 0 && (
                  <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(245, 158, 11, 0.02)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <AlertTriangle size={16} />
                      <span>Safety Warning</span>
                    </div>
                    <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                      {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <CheckCircle size={48} color="var(--success)" style={{ marginBottom: '12px' }} />
                <p>Database structure matches expected frontend data configurations.</p>
              </div>
            )}
          </div>

          {/* SQL Preview Box */}
          <div className="chart-card" style={{ backgroundColor: '#020617', border: '1px solid var(--border-color)' }}>
            <div className="chart-header" style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <FileCode size={20} />
                Generated Migration Script
              </h2>
            </div>
            <pre style={{ 
              marginTop: '16px', 
              fontFamily: 'monospace', 
              fontSize: '13px', 
              color: '#38bdf8', 
              whiteSpace: 'pre-wrap', 
              lineHeight: '1.6',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {sqlScript || '-- No migrations generated. Database schema matches expectations.'}
            </pre>
          </div>

        </div>

        {/* Right Column: History list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="chart-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} style={{ color: 'var(--primary)' }} />
                Migration Logs
              </h2>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <div className="spinner"></div>
              </div>
            ) : historyList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto' }}>
                {historyList.map((hist) => (
                  <div 
                    key={hist.id} 
                    style={{ 
                      padding: '16px', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(hist.timestamp).toLocaleString()}
                      </span>
                      <span className={`badge ${hist.success ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {hist.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    <pre style={{ 
                      fontSize: '11px', 
                      fontFamily: 'monospace', 
                      maxHeight: '80px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      color: 'var(--text-secondary)',
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      padding: '8px',
                      borderRadius: '4px'
                    }}>
                      {hist.sql}
                    </pre>
                    {hist.error && (
                      <span style={{ fontSize: '11px', color: 'var(--danger)' }}>
                        Error: {hist.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                No migrations applied yet.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}

export default SchemaChecker
