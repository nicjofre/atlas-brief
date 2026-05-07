'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type AugmentType = 'contacts' | 'public_record' | 'loan'

const TYPE_LABELS: Record<AugmentType, string> = {
  contacts: 'Contacts tab',
  public_record: 'Public Record tab',
  loan: 'Loan tab',
}

const TYPE_HINTS: Record<AugmentType, string> = {
  contacts: 'Paste the entire Contacts tab. Captures listing/buyer brokers, property manager, recorded owner, true owner.',
  public_record: 'Paste the entire Public Record tab. Captures owner mailing, subdivision, legal description, transaction history (sales + loans), 5-year assessment history.',
  loan: 'Paste the Loan tab. Enriches existing loan events with maturity date, data source (CMBS/Research), loan classification.',
}

type FieldsChanged = Record<string, { from: unknown; to: unknown }>

function formatValue(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return v.toLocaleString()
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? '' : 's'}`
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 100)
  return String(v)
}

export default function AugmentForm({ listingId }: { listingId: string }) {
  const router = useRouter()
  const [type, setType] = useState<AugmentType>('contacts')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ fields_changed: FieldsChanged } | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/augment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, type, text }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult({ fields_changed: data.fields_changed ?? {} })
        setText('')
        router.refresh()
      }
    } catch {
      setError('Request failed')
    } finally {
      setLoading(false)
    }
  }

  const changedKeys = result ? Object.keys(result.fields_changed) : []

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 8 }}>Source</div>
        <div style={{ display: 'flex', gap: 0, marginBottom: 8, borderBottom: '1px solid #ddd' }}>
          {(Object.keys(TYPE_LABELS) as AugmentType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: '8px 16px',
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                background: 'none',
                border: 'none',
                borderBottom: type === t ? '2px solid #111' : '2px solid transparent',
                color: type === t ? '#111' : '#999',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{TYPE_HINTS[type]}</div>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Copy the full ${TYPE_LABELS[type]} content from CoStar and paste here...`}
        rows={14}
        style={{
          width: '100%',
          padding: 16,
          border: '1px solid #ddd',
          borderRadius: 4,
          fontSize: 13,
          background: '#fff',
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'monospace',
          boxSizing: 'border-box',
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        style={{
          marginTop: 12,
          padding: '12px 28px',
          background: '#111',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: 13,
          cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
          opacity: loading || !text.trim() ? 0.6 : 1,
        }}
      >
        {loading ? 'Parsing...' : 'Apply'}
      </button>

      {error && <div style={{ marginTop: 12, color: '#c0392b', fontSize: 13 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 24, padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 4 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 12 }}>
            {changedKeys.length === 0 ? 'No changes' : `${changedKeys.length} field${changedKeys.length === 1 ? '' : 's'} updated`}
          </div>
          {changedKeys.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                  <th style={{ textAlign: 'left', padding: '6px 12px 6px 0' }}>Field</th>
                  <th style={{ textAlign: 'left', padding: '6px 12px' }}>Before</th>
                  <th style={{ textAlign: 'left', padding: '6px 0' }}>After</th>
                </tr>
              </thead>
              <tbody>
                {changedKeys.map(k => (
                  <tr key={k} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '8px 12px 8px 0', fontFamily: 'monospace', color: '#111' }}>{k}</td>
                    <td style={{ padding: '8px 12px', color: '#999' }}>{formatValue(result.fields_changed[k].from)}</td>
                    <td style={{ padding: '8px 0', color: '#111' }}>{formatValue(result.fields_changed[k].to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
