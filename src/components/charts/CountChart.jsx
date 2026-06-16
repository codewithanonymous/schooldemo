import React, { useEffect, useState } from 'react'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabaseClient'
import { MoreHorizontal } from 'lucide-react'

const CountChart = () => {
  const [dataState, setDataState] = useState({ boys: 0, girls: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudentsSex = async () => {
      try {
        // RLS scopes this to admin/teacher view automatically
        const { data, error } = await supabase
          .from('students')
          .select('sex', { count: 'exact' })

        if (!error && data) {
          const boys = data.filter(s => s.sex === 'MALE').length
          const girls = data.filter(s => s.sex === 'FEMALE').length
          setDataState({ boys, girls, total: boys + girls })
        }
      } catch (err) {
        console.error("Error fetching student counts by sex:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStudentsSex()
  }, [])

  const chartData = [
    {
      name: "Total",
      count: dataState.total,
      fill: "var(--border-color)",
    },
    {
      name: "Girls",
      count: dataState.girls,
      fill: "var(--warning)",
    },
    {
      name: "Boys",
      count: dataState.boys,
      fill: "var(--primary)",
    },
  ]

  const boysPercentage = dataState.total > 0 ? Math.round((dataState.boys / dataState.total) * 100) : 0
  const girlsPercentage = dataState.total > 0 ? Math.round((dataState.girls / dataState.total) * 100) : 0

  return (
    <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '380px' }}>
      <div className="chart-header">
        <h2>Students Gender Ratio</h2>
        <button className="btn-icon">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {loading ? (
        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <div style={{ flexGrow: 1, position: 'relative', width: '100%', minHeight: '200px' }}>
            <ResponsiveContainer>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="100%"
                barSize={24}
                data={chartData}
              >
                <RadialBar background={{ fill: 'rgba(255,255,255,0.02)' }} dataKey="count" />
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total</span>
              <h2 style={{ fontSize: '32px', fontWeight: 800, marginTop: '-4px' }}>{dataState.total}</h2>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginBottom: '4px' }}></div>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{dataState.boys}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Boys ({boysPercentage}%)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--warning)', marginBottom: '4px' }}></div>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{dataState.girls}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Girls ({girlsPercentage}%)</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CountChart
