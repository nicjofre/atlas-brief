'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'

type Row = Record<string, unknown>

export type VizConfig = {
  type: 'bar' | 'line' | 'kpi' | 'table'
  x?: string | null
  y?: string | null
}

function toNumber(v: unknown): number {
  if (v == null) return NaN
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v)
  return NaN
}

function compactNumber(n: number): string {
  if (!isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

export default function ExploreChart({ rows, viz }: { rows: Row[]; viz: VizConfig }) {
  if (rows.length === 0) {
    return <div style={{ padding: 24, color: '#999', fontSize: 13, textAlign: 'center' }}>No data to chart.</div>
  }

  if (viz.type === 'kpi') {
    const col = viz.y ?? Object.keys(rows[0]).find(k => typeof rows[0][k] === 'number') ?? Object.keys(rows[0])[0]
    const value = rows[0]?.[col]
    return (
      <div style={{ padding: '40px 24px', background: '#fff', border: '1px solid #eee', borderRadius: 4, textAlign: 'center' }}>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 12 }}>{col}</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 56, color: '#111', lineHeight: 1 }}>
          {typeof value === 'number' ? compactNumber(value) : String(value ?? '—')}
        </div>
        {rows.length > 1 && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 16 }}>(showing first row of {rows.length})</div>
        )}
      </div>
    )
  }

  const xKey = viz.x ?? Object.keys(rows[0])[0]
  const yKey = viz.y ?? Object.keys(rows[0]).find(k => typeof rows[0][k] === 'number') ?? Object.keys(rows[0])[1]

  const data = rows.map(r => ({
    ...r,
    [yKey]: toNumber(r[yKey]),
  }))

  if (viz.type === 'line') {
    return (
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 4, padding: '24px 16px 8px' }}>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#666' }} />
            <YAxis tick={{ fontSize: 11, fill: '#666' }} tickFormatter={compactNumber} />
            <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #ddd', borderRadius: 4 }} formatter={(v: unknown) => compactNumber(toNumber(v))} />
            <Line type="monotone" dataKey={yKey} stroke="#9A6B3F" strokeWidth={2} dot={{ fill: '#9A6B3F', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // bar (default)
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 4, padding: '24px 16px 8px' }}>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#666' }} interval={0} angle={data.length > 8 ? -30 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'} height={data.length > 8 ? 80 : 40} />
          <YAxis tick={{ fontSize: 11, fill: '#666' }} tickFormatter={compactNumber} />
          <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #ddd', borderRadius: 4 }} formatter={(v: unknown) => compactNumber(toNumber(v))} />
          <Bar dataKey={yKey} fill="#9A6B3F" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
