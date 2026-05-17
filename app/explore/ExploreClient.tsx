'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Row = Record<string, unknown>

type SavedReport = {
  id: string
  name: string
  question: string
  sql: string
  created_at: string
}

type AskResult = {
  sql: string
  explanation: string
  rows: Row[]
  error?: string
}

export default function ExploreClient({ savedReports }: { savedReports: SavedReport[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AskResult | null>(null)
  const [showSql, setShowSql] = useState(false)
  const [savedName, setSavedName] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedConfirm, setSavedConfirm] = useState(false)

  async function ask(q: string, presetSql?: string, presetExplanation?: string) {
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
        }),
      })
      const data = await res.json()
      setResult({
        sql: data.sql ?? '',
        explanation: data.explanation ?? '',
        rows: data.rows ?? [],
        error: data.error,
      })
    } catch (e) {
      setResult({
        sql: '',
        explanation: '',
        rows: [],
        error: e instanceof Error ? e.message : 'Request failed',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!result || !savedName.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: insErr } = await supabase.from('saved_reports').insert({
        name: savedName.trim(),
        question,
        sql: result.sql,
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
    void ask(r.question, r.sql)
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

  const headers = result && result.rows.length > 0 ? Object.keys(result.rows[0]) : []

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
                if (e.key === 'Enter' && question.trim() && !loading) {
                  void ask(question.trim())
                }
              }}
              placeholder="e.g. Sold deals in NoHo over the last 12 months under $5M"
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
              {loading ? 'Thinking...' : 'Ask'}
            </button>
          </div>
        </div>

        {result && (
          <div>
            {result.explanation && (
              <div style={{ fontSize: 13, color: '#444', marginBottom: 12, fontStyle: 'italic' }}>{result.explanation}</div>
            )}

            <div style={{ marginBottom: 12 }}>
              <button
                onClick={() => setShowSql(s => !s)}
                style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showSql ? '▾ Hide SQL' : '▸ Show SQL'}
              </button>
              {showSql && (
                <pre style={{ marginTop: 8, padding: 12, background: '#f5f5f5', border: '1px solid #eee', borderRadius: 4, fontSize: 11, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                  {result.sql}
                </pre>
              )}
            </div>

            {result.error ? (
              <div style={{ padding: 12, background: '#fee', color: '#c0392b', borderRadius: 4, fontSize: 13 }}>{result.error}</div>
            ) : result.rows.length === 0 ? (
              <div style={{ padding: 24, color: '#999', fontSize: 13, textAlign: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 4 }}>
                No rows matched.
              </div>
            ) : (
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
                    {result.rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        {headers.map(h => (
                          <td key={h} style={{ padding: '8px 12px', color: '#111', verticalAlign: 'top' }}>{formatCell(row[h])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  {saving ? 'Saving...' : 'Save as Report'}
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
              'Sold deals in NoHo in the last 12 months under $5M',
              'Average $/door for sold 1960s buildings in Hollywood',
              'Brokers who have sold more than 3 deals in the last year',
              'Under construction projects delivering before Q4 2027',
              'Properties where current rent is more than 15% below market',
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

function formatCell(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return v.toLocaleString()
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return JSON.stringify(v)
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 120)
  return String(v)
}
