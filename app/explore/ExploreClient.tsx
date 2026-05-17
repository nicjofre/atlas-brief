'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ExploreChart, { type VizConfig } from './ExploreChart'

type Row = Record<string, unknown>

type SavedReport = {
  id: string
  name: string
  question: string
  sql: string
  viz: VizConfig | null
  created_at: string
}

type AskResult = {
  sql: string
  explanation: string
  rows: Row[]
  viz: VizConfig | null
  error?: string
}

type Pane = 'chart' | 'table' | 'sql'

const CHART_TYPES: { value: VizConfig['type']; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'kpi', label: 'KPI' },
  { value: 'table', label: 'Table only' },
]

export default function ExploreClient({ savedReports }: { savedReports: SavedReport[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AskResult | null>(null)
  const [pane, setPane] = useState<Pane>('chart')
  const [vizOverride, setVizOverride] = useState<VizConfig | null>(null)
  const [savedName, setSavedName] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedConfirm, setSavedConfirm] = useState(false)

  // When result changes, reset override + pick the right default pane.
  useEffect(() => {
    if (!result) return
    setVizOverride(null)
    setSavedConfirm(false)
    const vizType = result.viz?.type ?? 'table'
    setPane(vizType === 'table' ? 'table' : 'chart')
  }, [result])

  async function ask(q: string, presetSql?: string, presetExplanation?: string, presetViz?: VizConfig | null) {
    setLoading(true)
    setSavedConfirm(false)
    try {
      const res = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          sql: presetSql ?? null,
          explanation: presetExplanation ?? null,
          viz: presetViz ?? null,
        }),
      })
      const data = await res.json()
      setResult({
        sql: data.sql ?? '',
        explanation: data.explanation ?? '',
        rows: data.rows ?? [],
        viz: data.viz ?? null,
        error: data.error,
      })
    } catch (e) {
      setResult({
        sql: '',
        explanation: '',
        rows: [],
        viz: null,
        error: e instanceof Error ? e.message : 'Request failed',
      })
    } finally {
      setLoading(false)
    }
  }

  const effectiveViz: VizConfig = vizOverride ?? result?.viz ?? { type: 'table' }

  async function handleSave() {
    if (!result || !savedName.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: insErr } = await supabase.from('saved_reports').insert({
        name: savedName.trim(),
        question,
        sql: result.sql,
        viz: effectiveViz,
        created_by: user?.id ?? null,
      })
      if (insErr) throw new Error(insErr.message)
      setSavedConfirm(true)
      setSavedName('')
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteReport(id: string) {
    if (!confirm('Delete this saved report?')) return
    await supabase.from('saved_reports').delete().eq('id', id)
    router.refresh()
  }

  function runSaved(r: SavedReport) {
    setQuestion(r.question)
    void ask(r.question, r.sql, undefined, r.viz)
  }

  function downloadCsv() {
    if (!result || result.rows.length === 0) return
    const headers = Object.keys(result.rows[0])
    const lines = [headers.join(',')]
    for (const row of result.rows) {
      const cells = headers.map(h => {
        const v = row[h]
        if (v == null) return ''
        const s = typeof v === 'string' ? v : JSON.stringify(v)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      })
      lines.push(cells.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atlas-explore-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tableHeaders = result && result.rows.length > 0 ? Object.keys(result.rows[0]) : []
  const numericCols = result && result.rows.length > 0
    ? Object.keys(result.rows[0]).filter(k => typeof result.rows[0][k] === 'number')
    : []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 32 }}>
      <div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 8 }}>Ask anything about the database</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && question.trim() && !loading) void ask(question.trim())
              }}
              placeholder="e.g. Average price per door by submarket"
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: 14,
                border: '1px solid #ddd',
                borderRadius: 4,
                background: '#fff',
                color: '#111',
                outline: 'none',
              }}
            />
            <button
              onClick={() => question.trim() && ask(question.trim())}
              disabled={loading || !question.trim()}
              style={{
                padding: '12px 24px',
                background: '#111',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !question.trim() ? 0.6 : 1,
              }}
            >
              {loading ? 'Thinking…' : 'Ask'}
            </button>
          </div>
        </div>

        {result && (
          <div>
            {result.explanation && (
              <div style={{ fontSize: 13, color: '#444', marginBottom: 12, fontStyle: 'italic' }}>{result.explanation}</div>
            )}

            {result.error ? (
              <div style={{ padding: 12, background: '#fee', color: '#c0392b', borderRadius: 4, fontSize: 13 }}>
                {result.error}
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => setPane('sql')} style={{ fontSize: 11, color: '#9A6B3F', background: 'none', border: '1px solid #9A6B3F', borderRadius: 2, padding: '4px 8px', cursor: 'pointer' }}>
                    Show SQL
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* tabs */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: '1px solid #ddd' }}>
                  {(['chart', 'table', 'sql'] as Pane[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setPane(p)}
                      style={{
                        padding: '8px 16px',
                        fontSize: 11,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        background: 'none',
                        border: 'none',
                        borderBottom: pane === p ? '2px solid #111' : '2px solid transparent',
                        color: pane === p ? '#111' : '#999',
                        cursor: 'pointer',
                        marginBottom: -1,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {pane === 'chart' && (
                  <div>
                    {/* viz overrides */}
                    {result.rows.length > 0 && tableHeaders.length > 0 && (
                      <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap', fontSize: 11 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666' }}>
                          Type
                          <select
                            value={effectiveViz.type}
                            onChange={e => setVizOverride({ ...effectiveViz, type: e.target.value as VizConfig['type'] })}
                            style={{ fontSize: 11, padding: '2px 6px', border: '1px solid #ddd', borderRadius: 2, color: '#111', background: '#fff' }}
                          >
                            {CHART_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </label>
                        {effectiveViz.type !== 'kpi' && effectiveViz.type !== 'table' && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666' }}>
                            X
                            <select
                              value={effectiveViz.x ?? ''}
                              onChange={e => setVizOverride({ ...effectiveViz, x: e.target.value })}
                              style={{ fontSize: 11, padding: '2px 6px', border: '1px solid #ddd', borderRadius: 2, color: '#111', background: '#fff' }}
                            >
                              {tableHeaders.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </label>
                        )}
                        {effectiveViz.type !== 'table' && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666' }}>
                            Y
                            <select
                              value={effectiveViz.y ?? ''}
                              onChange={e => setVizOverride({ ...effectiveViz, y: e.target.value })}
                              style={{ fontSize: 11, padding: '2px 6px', border: '1px solid #ddd', borderRadius: 2, color: '#111', background: '#fff' }}
                            >
                              {(numericCols.length > 0 ? numericCols : tableHeaders).map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    )}

                    {effectiveViz.type === 'table'
                      ? <ResultsTable rows={result.rows} />
                      : <ExploreChart rows={result.rows} viz={effectiveViz} />}
                  </div>
                )}

                {pane === 'table' && <ResultsTable rows={result.rows} />}

                {pane === 'sql' && (
                  <pre style={{ padding: 12, background: '#f5f5f5', border: '1px solid #eee', borderRadius: 4, fontSize: 11, overflow: 'auto', whiteSpace: 'pre-wrap', color: '#111' }}>
                    {result.sql}
                  </pre>
                )}
              </>
            )}

            {!result.error && result.rows.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#666' }}>{result.rows.length} row{result.rows.length === 1 ? '' : 's'}</span>
                <button
                  onClick={downloadCsv}
                  style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#9A6B3F', background: 'none', border: '1px solid #9A6B3F', borderRadius: 2, padding: '4px 10px', cursor: 'pointer' }}
                >
                  Download CSV
                </button>
                <div style={{ flex: 1 }} />
                <input
                  type="text"
                  value={savedName}
                  onChange={e => setSavedName(e.target.value)}
                  placeholder="Name this report"
                  style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 2, background: '#fff', color: '#111', outline: 'none' }}
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !savedName.trim()}
                  style={{ padding: '4px 10px', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#fff', background: '#111', border: 'none', borderRadius: 2, cursor: saving || !savedName.trim() ? 'not-allowed' : 'pointer', opacity: saving || !savedName.trim() ? 0.6 : 1 }}
                >
                  {saving ? 'Saving…' : 'Save as Report'}
                </button>
                {savedConfirm && <span style={{ fontSize: 11, color: '#27ae60' }}>✓ Saved</span>}
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div style={{ marginTop: 24, padding: 16, background: '#fff', border: '1px solid #eee', borderRadius: 4, fontSize: 13, color: '#666', lineHeight: 1.6 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 8 }}>Try asking</div>
            {[
              'Average price per door by submarket',
              'Sales volume by quarter over the last two years',
              'Brokers who have sold more than 3 deals in the last year',
              'Under construction projects delivering before Q4 2027',
              'Average CAP rate for sold deals in NoHo',
            ].map(q => (
              <div
                key={q}
                onClick={() => {
                  setQuestion(q)
                  void ask(q)
                }}
                style={{ cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid #f5f5f5', color: '#111' }}
              >
                {q}
              </div>
            ))}
          </div>
        )}
      </div>

      <aside>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 8 }}>Saved reports</div>
        {savedReports.length === 0 ? (
          <div style={{ fontSize: 12, color: '#999', padding: 12, background: '#fff', border: '1px solid #eee', borderRadius: 4 }}>
            None yet. Run a query and click <em>Save as Report</em>.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {savedReports.map(r => (
              <div key={r.id} style={{ padding: 10, background: '#fff', border: '1px solid #eee', borderRadius: 4 }}>
                <div
                  onClick={() => runSaved(r)}
                  style={{ cursor: 'pointer', fontSize: 13, color: '#111', fontWeight: 500, marginBottom: 4 }}
                >
                  {r.name}
                </div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 6, lineHeight: 1.4 }}>{r.question}</div>
                <button
                  onClick={() => handleDeleteReport(r.id)}
                  style={{ fontSize: 10, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: 1, textTransform: 'uppercase' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}

function ResultsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: 24, color: '#999', fontSize: 13, textAlign: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 4 }}>
        No rows matched.
      </div>
    )
  }
  const headers = Object.keys(rows[0])
  return (
    <div style={{ overflow: 'auto', background: '#fff', border: '1px solid #eee', borderRadius: 4 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #111', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            {headers.map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 12px', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
              {headers.map(h => (
                <td key={h} style={{ padding: '8px 12px', color: '#111', verticalAlign: 'top' }}>{formatCell(row[h])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatCell(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return v.toLocaleString()
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return JSON.stringify(v)
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 120)
  return String(v)
}
