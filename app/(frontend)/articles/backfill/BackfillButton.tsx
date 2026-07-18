'use client'

import { useState } from 'react'

type Result = {
  total: number
  streetview: number
  satellite: number
  alreadyDone: number
  skippedNoLocation: number
  errors: { id: string; error: string }[]
}

export default function BackfillButton() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    if (!confirm('Overwrite the hero on every brief older than 18 hours with a Google default? This is reversible per-article.')) return
    setRunning(true)
    setErr(null)
    setResult(null)
    try {
      const res = await fetch('/api/articles/backfill-heroes', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Backfill failed')
      setResult(data as Result)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Backfill failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <button
        onClick={run}
        disabled={running}
        style={{
          border: '1px solid #9A6B3F', background: running ? '#c9b79f' : '#9A6B3F', color: '#fff',
          borderRadius: 6, padding: '11px 20px', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
          cursor: running ? 'default' : 'pointer', fontFamily: 'ui-monospace, Menlo, monospace',
        }}
      >
        {running ? 'Running… (up to a couple minutes, keep this tab open)' : 'Run backfill'}
      </button>

      {err && <div style={{ marginTop: 14, color: '#c0392b', fontSize: 14 }}>{err}</div>}

      {result && (
        <div style={{ marginTop: 20, background: '#f6f4f0', border: '1px solid #e6ddcd', borderRadius: 8, padding: 16, fontSize: 14, lineHeight: 1.7 }}>
          <div><b>{result.total}</b> briefs older than 18h</div>
          <div>Street View heroes set: <b>{result.streetview}</b></div>
          <div>Satellite fallbacks set: <b>{result.satellite}</b></div>
          <div>Already done (skipped): <b>{result.alreadyDone}</b></div>
          <div>No address/coords (skipped): <b>{result.skippedNoLocation}</b></div>
          {result.errors.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: 'pointer', color: '#c0392b' }}>{result.errors.length} error(s)</summary>
              <pre style={{ fontSize: 11, overflow: 'auto', marginTop: 8 }}>{JSON.stringify(result.errors, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
