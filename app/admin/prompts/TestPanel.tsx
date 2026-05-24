'use client'

import { useState } from 'react'

type Listing = {
  id: string
  label: string
}

type TestResult = {
  output: string
  systemPrompt: string
  userMessage: string
  promptSections: Array<{ key: string; sort_order: number; length: number }>
  listingLabel: string
  usage: { input_tokens: number; output_tokens: number }
  elapsedMs: number
}

export default function TestPanel({ listings }: { listings: Listing[] }) {
  const [selectedId, setSelectedId] = useState<string>(listings[0]?.id ?? '')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSystem, setShowSystem] = useState(false)

  async function run() {
    if (!selectedId) return
    setRunning(true)
    setError(null)
    setResult(null)
    const t0 = Date.now()
    try {
      const r = await fetch('/api/admin/test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: selectedId }),
      })
      if (!r.ok || !r.body) {
        const errText = await r.text().catch(() => '')
        throw new Error(`HTTP ${r.status}: ${errText.slice(0, 300)}`)
      }

      // Build the result incrementally as SSE events stream in.
      const partial: TestResult = {
        output: '',
        systemPrompt: '',
        userMessage: '',
        promptSections: [],
        listingLabel: '',
        usage: { input_tokens: 0, output_tokens: 0 },
        elapsedMs: 0,
      }
      setResult(partial)

      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        // SSE events are separated by a blank line.
        const events = buf.split('\n\n')
        buf = events.pop() ?? ''
        for (const raw of events) {
          const lines = raw.split('\n')
          const eventLine = lines.find(l => l.startsWith('event: '))
          const dataLine = lines.find(l => l.startsWith('data: '))
          if (!eventLine || !dataLine) continue
          const ev = eventLine.slice(7).trim()
          const data = JSON.parse(dataLine.slice(6))
          if (ev === 'meta') {
            Object.assign(partial, {
              systemPrompt: data.systemPrompt,
              userMessage: data.userMessage,
              promptSections: data.promptSections,
              listingLabel: data.listingLabel,
            })
            setResult({ ...partial })
          } else if (ev === 'chunk') {
            partial.output += data.text
            partial.elapsedMs = Date.now() - t0
            setResult({ ...partial })
          } else if (ev === 'done') {
            partial.usage = data.usage
            partial.elapsedMs = data.elapsedMs
            setResult({ ...partial })
          } else if (ev === 'error') {
            throw new Error(data.message)
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <section
      style={{
        marginTop: 48,
        padding: 24,
        background: '#fff',
        border: '1px solid #e5e5e5',
        borderRadius: 4,
      }}
    >
      <div style={{ marginBottom: 6, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F' }}>
        Test run
      </div>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#111', margin: '0 0 6px' }}>
        See what the current prompt produces
      </h2>
      <p style={{ fontSize: 13, color: '#666', lineHeight: 1.55, margin: '0 0 16px', maxWidth: '72ch' }}>
        Pick a listing and run the current prompt set against it. The AI sees exactly what David
        sees — all the saved prompts in the sidebar above, assembled in sort order, plus the
        listing&apos;s structured data. Use this to iterate prompts: edit, save, click Generate.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          disabled={running}
          style={{
            padding: '8px 12px',
            fontSize: 13,
            border: '1px solid #ddd',
            borderRadius: 3,
            background: '#fff',
            minWidth: 320,
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          {listings.length === 0 && <option value="">No listings available</option>}
          {listings.map(l => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={!selectedId || running}
          style={{
            padding: '9px 18px',
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            background: !selectedId || running ? '#eee' : '#111',
            color: !selectedId || running ? '#999' : '#fff',
            border: 'none',
            borderRadius: 2,
            cursor: !selectedId || running ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? 'Generating… (30-90s)' : 'Generate draft'}
        </button>
        {error && <span style={{ fontSize: 12, color: '#c0392b' }}>{error}</span>}
      </div>

      {result && (
        <div>
          <div
            style={{
              padding: '10px 14px',
              background: '#F0F4FA',
              border: '1px dashed #5b87b5',
              borderRadius: 3,
              fontSize: 12,
              color: '#385878',
              marginBottom: 14,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span>
              <b>{result.listingLabel}</b>
            </span>
            <span>{result.promptSections.length} prompt sections sent</span>
            <span>
              {result.usage.input_tokens.toLocaleString()} in / {result.usage.output_tokens.toLocaleString()} out tokens
            </span>
            <span>{(result.elapsedMs / 1000).toFixed(1)}s</span>
            <button
              onClick={() => setShowSystem(s => !s)}
              style={{
                marginLeft: 'auto',
                padding: '4px 10px',
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                background: 'transparent',
                color: '#385878',
                border: '1px solid #5b87b5',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              {showSystem ? 'Hide' : 'View'} assembled prompt
            </button>
          </div>

          {showSystem && (
            <details open style={{ marginBottom: 16 }}>
              <summary style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9A6B3F', cursor: 'pointer', marginBottom: 8 }}>
                Assembled system prompt ({result.systemPrompt.length.toLocaleString()} chars)
              </summary>
              <pre
                style={{
                  fontFamily: 'ui-monospace, Menlo, monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  padding: 14,
                  background: '#0E1116',
                  color: '#E5E7EB',
                  border: '1px solid #1C2128',
                  borderRadius: 3,
                  maxHeight: 380,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {result.systemPrompt}
              </pre>
            </details>
          )}

          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 8 }}>
            AI output ({result.output.length.toLocaleString()} chars)
          </div>
          <pre
            style={{
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 13,
              lineHeight: 1.6,
              padding: 18,
              background: '#FAFAF8',
              color: '#111',
              border: '1px solid #ddd',
              borderRadius: 3,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {result.output}
          </pre>
        </div>
      )}
    </section>
  )
}
