import React, { useMemo, useState, useEffect } from 'react'
import {
  ResponsiveContainer, BarChart, Bar,
  LineChart, Line,
  PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

/**
 * Props:
 *  - data: array of row objects
 *  - columns: array of column names
 *  - initialViz: backend suggestion { type, x, y, title }
 */
export default function ChartRenderer({ data = [], columns = [], initialViz = {} }) {
  // Figure out candidate columns
  const numericCols = useMemo(() => {
    if (!data.length) return []
    const keys = columns.length ? columns : Object.keys(data[0] || {})
    const nums = keys.filter(k => data.some(r => typeof r?.[k] === 'number'))
    return nums
  }, [data, columns])

  const categoricalCols = useMemo(() => {
    if (!data.length) return []
    const keys = columns.length ? columns : Object.keys(data[0] || {})
    const cats = keys.filter(k => !numericCols.includes(k))
    return cats
  }, [data, columns, numericCols])

  // UI state
  const [chartType, setChartType] = useState(initialViz?.type || 'bar')
  const [title, setTitle] = useState(initialViz?.title || 'Results')
  const [xKey, setXKey] = useState(initialViz?.x || (categoricalCols[0] || columns[0] || ''))
  const [yKeys, setYKeys] = useState(() => {
    if (initialViz?.y) return [initialViz.y]
    if (numericCols.length) return [numericCols[0]]
    return []
  })
  const [showTable, setShowTable] = useState(true)

  // Keep sensible defaults if backend didn’t supply
  useEffect(() => {
    if (!xKey && (categoricalCols[0] || columns[0])) {
      setXKey(categoricalCols[0] || columns[0])
    }
    if (!yKeys.length && numericCols[0]) {
      setYKeys([numericCols[0]])
    }
  }, [xKey, yKeys, categoricalCols, columns, numericCols])

  // Helpers
  const toggleYKey = (k) => {
    setYKeys(prev => prev.includes(k) ? prev.filter(i => i !== k) : [...prev, k])
  }

  const onExportCSV = () => {
    if (!data?.length) return
    const keys = columns.length ? columns : Object.keys(data[0])
    const csv = [
      keys.join(','),
      ...data.map(row => keys.map(k => {
        const v = row[k]
        if (v == null) return ''
        const s = String(v).replace(/"/g, '""')
        return /[",\n]/.test(s) ? `"${s}"` : s
      }).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (title || 'results') + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Guard: nothing to show
  if (!data || data.length === 0) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.h3}>{title || 'Results'}</h3>
        </div>
        <div style={{ padding: 12, color: '#6b7280' }}>No data.</div>
      </div>
    )
  }

  // UI
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={styles.h3}>{title}</h3>

          <select value={chartType} onChange={(e) => setChartType(e.target.value)} style={styles.select}>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
            <option value="table">Table only</option>
          </select>

          {/* X selector (not for pie with auto labels) */}
          {chartType !== 'pie' && (
            <label style={styles.label}>
              X:
              <select value={xKey} onChange={(e) => setXKey(e.target.value)} style={styles.select}>
                {[...categoricalCols, ...numericCols].map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
          )}

          {/* Y selector(s) */}
          {chartType !== 'pie' ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={styles.labelText}>Y:</span>
              {numericCols.map(k => (
                <label key={k} style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={yKeys.includes(k)}
                    onChange={() => toggleYKey(k)}
                  />
                  <span>{k}</span>
                </label>
              ))}
            </div>
          ) : (
            <label style={styles.label}>
              Value:
              <select
                value={yKeys[0] || ''}
                onChange={(e) => setYKeys([e.target.value])}
                style={styles.select}
              >
                {numericCols.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowTable(s => !s)} style={styles.btnSecondary}>
            {showTable ? 'Hide Table' : 'Show Table'}
          </button>
          <button onClick={onExportCSV} style={styles.btnPrimary}>Export CSV</button>
        </div>
      </div>

      {/* Chart */}
      {chartType !== 'table' && (
        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer>
            {chartType === 'bar' && (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {yKeys.length ? yKeys.map(k => <Bar key={k} dataKey={k} />) : <Bar dataKey={numericCols[0]} />}
              </BarChart>
            )}
            {chartType === 'line' && (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {yKeys.length ? yKeys.map(k => <Line key={k} dataKey={k} />) : <Line dataKey={numericCols[0]} />}
              </LineChart>
            )}
            {chartType === 'pie' && (
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={data}
                  dataKey={yKeys[0] || numericCols[0]}
                  nameKey={xKey || (categoricalCols[0] || columns[0])}
                  outerRadius={120}
                  label
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {showTable && (
        <div style={{ marginTop: 12, overflow: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {(columns.length ? columns : Object.keys(data[0])).map(c => (
                  <th key={c} style={styles.th}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} style={i % 2 ? styles.trOdd : undefined}>
                  {(columns.length ? columns : Object.keys(row)).map(c => (
                    <td key={c} style={styles.td}>
                      {row[c] != null ? String(row[c]) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles = {
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 12,
    background: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  h3: { margin: 0, fontSize: 16, fontWeight: 600 },
  select: {
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff'
  },
  label: { display: 'flex', gap: 8, alignItems: 'center' },
  labelText: { fontSize: 13, color: '#374151' },
  checkbox: { display: 'inline-flex', gap: 6, alignItems: 'center', padding: '2px 6px' },
  btnPrimary: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #111827',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer'
  },
  btnSecondary: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13
  },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    background: '#f9fafb',
    zIndex: 1
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap'
  },
  trOdd: { background: '#fafafa' }
}
