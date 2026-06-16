import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ATTENDANCE_DATA } from '../../data/mockData'
import { MoreHorizontal } from 'lucide-react'

const AttendanceChart = () => (
  <div className="chart-card" style={{ height: '100%', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
    <div className="chart-header">
      <h2>Weekly Attendance</h2>
      <button className="btn-icon"><MoreHorizontal size={18} /></button>
    </div>

    <div style={{ flexGrow: 1, width: '100%', minHeight: '260px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ATTENDANCE_DATA} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
          <XAxis dataKey="name" axisLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} />
          <YAxis axisLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
          <Legend align="left" verticalAlign="top" wrapperStyle={{ paddingBottom: '24px' }} iconType="circle" />
          <Bar dataKey="present" name="Present" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="absent"  name="Absent"  fill="var(--warning)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
)

export default AttendanceChart
