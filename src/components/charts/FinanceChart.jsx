import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { MoreHorizontal } from 'lucide-react'

const data = [
  { name: "Jan", income: 4000, expense: 2400 },
  { name: "Feb", income: 3000, expense: 1398 },
  { name: "Mar", income: 5000, expense: 9800 },
  { name: "Apr", income: 7780, expense: 3908 },
  { name: "May", income: 5890, expense: 4800 },
  { name: "Jun", income: 6390, expense: 3800 },
  { name: "Jul", income: 7490, expense: 4300 },
  { name: "Aug", income: 8200, expense: 4100 },
  { name: "Sep", income: 9100, expense: 4600 },
  { name: "Oct", income: 9500, expense: 5200 },
  { name: "Nov", income: 11000, expense: 4900 },
  { name: "Dec", income: 12500, expense: 5500 },
]

const FinanceChart = () => {
  return (
    <div className="chart-card" style={{ height: '100%', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
      <div className="chart-header">
        <h2>Financial Overview</h2>
        <button className="btn-icon">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div style={{ flexGrow: 1, width: '100%', minHeight: '260px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: 0,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis 
              axisLine={false} 
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
              tickLine={false} 
              tickMargin={10}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'var(--bg-card)', 
                borderColor: 'var(--border-color)', 
                borderRadius: '8px',
                color: 'var(--text-primary)'
              }}
            />
            <Legend
              align="center"
              verticalAlign="top"
              wrapperStyle={{ paddingBottom: '24px' }}
            />
            <Line
              type="monotone"
              dataKey="income"
              name="Income ($)"
              stroke="var(--success)"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="expense" 
              name="Expense ($)"
              stroke="var(--danger)" 
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default FinanceChart
