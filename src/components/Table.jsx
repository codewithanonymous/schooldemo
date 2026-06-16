import React from 'react'

const Table = ({ columns, renderRow, data }) => {
  return (
    <div className="custom-table-wrapper">
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.accessor} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((item) => renderRow(item))
          ) : (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Table
