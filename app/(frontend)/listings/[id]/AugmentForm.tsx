'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type FieldsChanged = Record<string, { from: unknown; to: unknown }>

type SourceKey = 'contacts' | 'public_record' | 'loan' | 'sale_comp' | 'om'

const SECTIONS: { key: SourceKey; label: string; hint: string; isPdf: boolean }[] = [
  {
    key: 'contacts',
    label: 'Contacts tab',
    hint: 'Paste the entire Contacts tab. Captures listing/buyer brokers, property manager, recorded owner, true owner.',
    isPdf: false,
  },
  {
    key: 'public_record',
    label: 'Public Record tab',
    hint: 'Paste the entire Public Record tab. Captures owner mailing, subdivision, legal description, transaction history, 5-year assessment history.',
    isPdf: false,
  },
  {
    key: 'loan',
    label: 'Loan tab',
    hint: 'Paste the Loan tab. Enriches existing loan events with maturity date, data source (CMBS/Research), loan classification.',
    isPdf: false,
  },
  {
    key: 'sale_comp',
    label: 'Sales Comp page',
    hint: 'Paste the CoStar Sales Comp (sold-deal) page. Captures true buyer/seller, hold period, sale notes, initial ask, both brokers, buyer activity history.',
    isPdf: false,
  },
  {
    key: 'om',
    label: 'Broker OM PDF',
    hint: 'Upload a broker Offering Memorandum PDF. Captures CAP/GRM split, marketing quotes, in-unit features, expense breakdown, richer broker contact info.',
    isPdf: true,
  },
]

function formatValue(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return v.toLocaleString()
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? '' : 's'}`
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 100)
  return String(v)
}

type RunResult = {
  key: SourceKey
  status: 'ok' | 'error' | 'skipped'
  error?: string
  fields_changed?: FieldsChanged
}

export default function AugmentForm({ listingId }: { listingId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [texts, setTexts] = useState<Record<Exclude<SourceKey, 'om'>, string>>({
    contacts: '',
    public_record: '',
    loan: '',
    sale_comp: '',
  })
  const [omFile, setOmFile] = useState<File | null>(null)
  const [running, setRunning] = useState<Set<SourceKey>>(new Set())
  const [results, setResults] = useState<RunResult[] | null>(null)

  const stagedCount =
    Object.values(texts).filter(t => t.trim().length > 0).length + (omFile ? 1 : 0)

  async function runOne(key: SourceKey): Promise<RunResult> {
    if (key === 'om') {
      if (!omFile) return { key, status: 'skipped' }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { key, status: 'error', error: 'Not signed in' }
        const safeName = omFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${user.id}/${Date.now()}-${safeName}`
        const { error: uploadError } = await supabase.storage
          .from('om-uploads')
          .upload(path, omFile, { contentType: 'application/pdf', upsert: false })
        if (uploadError) return { key, status: 'error', error: uploadError.message }
        const res = await fetch('/api/parse-om', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: listingId,
            path,
            file_name: omFile.name,
            file_size: omFile.size,
          }),
        })
        const data = await res.json()
        if (data.error) return { key, status: 'error', error: data.error }
        return { key, status: 'ok', fields_changed: data.fields_changed ?? {} }
      } catch (e) {
        return { key, status: 'error', error: e instanceof Error ? e.message : 'Request failed' }
      }
    }

    const text = texts[key]
    if (!text.trim()) return { key, status: 'skipped' }

    try {
      const url = key === 'sale_comp' ? '/api/parse-sale-comp' : '/api/augment'
      const body =
        key === 'sale_comp'
          ? { listing_id: listingId, text }
          : { listing_id: listingId, type: key, text }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) return { key, status: 'error', error: data.error }
      return { key, status: 'ok', fields_changed: data.fields_changed ?? {} }
    } catch (e) {
      return { key, status: 'error', error: e instanceof Error ? e.message : 'Request failed' }
    }
  }

  async function handleParseAll() {
    if (stagedCount === 0) return

    const keys: SourceKey[] = []
    for (const k of Object.keys(texts) as Exclude<SourceKey, 'om'>[]) {
      if (texts[k].trim()) keys.push(k)
    }
    if (omFile) keys.push('om')

    setRunning(new Set(keys))
    setResults(null)

    // Run in parallel
    const settled = await Promise.all(keys.map(runOne))
    setResults(settled)
    setRunning(new Set())

    // Clear staged inputs that succeeded
    setTexts(prev => {
      const next = { ...prev }
      for (const r of settled) {
        if (r.status === 'ok' && r.key !== 'om') {
          next[r.key as Exclude<SourceKey, 'om'>] = ''
        }
      }
      return next
    })
    if (settled.find(r => r.key === 'om' && r.status === 'ok')) {
      setOmFile(null)
    }

    router.refresh()
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
        Paste content into any of the sections below — leave others blank if you don&apos;t have them. Click <strong>Parse All</strong> to run them in parallel. Each field updates the listing with merge semantics.
      </div>

      {SECTIONS.map(section => {
        const isRunning = running.has(section.key)
        const result = results?.find(r => r.key === section.key)
        const hasInput =
          section.isPdf
            ? !!omFile
            : (texts[section.key as Exclude<SourceKey, 'om'>] ?? '').trim().length > 0

        return (
          <div
            key={section.key}
            style={{
              marginBottom: 24,
              padding: 16,
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: 4,
              opacity: isRunning ? 0.6 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F' }}>
                {section.label}
              </div>
              {result && (
                <div style={{ fontSize: 11, color: result.status === 'ok' ? '#27ae60' : result.status === 'error' ? '#c0392b' : '#999' }}>
                  {result.status === 'ok'
                    ? `✓ ${Object.keys(result.fields_changed ?? {}).length} field${Object.keys(result.fields_changed ?? {}).length === 1 ? '' : 's'} updated`
                    : result.status === 'error'
                    ? `✗ ${result.error}`
                    : 'skipped'}
                </div>
              )}
              {isRunning && <div style={{ fontSize: 11, color: '#999' }}>parsing…</div>}
              {!isRunning && !result && hasInput && (
                <div style={{ fontSize: 11, color: '#5b87b5' }}>queued</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 1.5 }}>{section.hint}</div>

            {section.isPdf ? (
              <div
                onClick={() => document.getElementById('augment-om-input')?.click()}
                style={{
                  border: '2px dashed #ddd',
                  borderRadius: 4,
                  padding: '24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: omFile ? '#f9f9f9' : '#fff',
                }}
              >
                <input
                  id="augment-om-input"
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => setOmFile(e.target.files?.[0] ?? null)}
                />
                {omFile ? (
                  <div>
                    <div style={{ fontSize: 13, color: '#111', marginBottom: 4 }}>{omFile.name}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {(omFile.size / 1024).toFixed(0)} KB — click to replace
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#666' }}>Drop OM PDF here</div>
                )}
              </div>
            ) : (
              <textarea
                value={texts[section.key as Exclude<SourceKey, 'om'>]}
                onChange={e =>
                  setTexts(prev => ({ ...prev, [section.key as Exclude<SourceKey, 'om'>]: e.target.value }))
                }
                placeholder="Paste tab content here..."
                rows={8}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 13,
                  background: '#fff',
                  color: '#111',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        )
      })}

      <button
        onClick={handleParseAll}
        disabled={running.size > 0 || stagedCount === 0}
        style={{
          padding: '12px 28px',
          background: '#111',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: 13,
          cursor: running.size > 0 || stagedCount === 0 ? 'not-allowed' : 'pointer',
          opacity: running.size > 0 || stagedCount === 0 ? 0.6 : 1,
        }}
      >
        {running.size > 0
          ? `Parsing ${running.size}…`
          : stagedCount === 0
          ? 'Parse All'
          : `Parse All (${stagedCount})`}
      </button>

      {results && results.some(r => r.status === 'ok') && (
        <div style={{ marginTop: 24, padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 4 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 12 }}>
            Combined diff
          </div>
          <DiffTable results={results.filter(r => r.status === 'ok')} />
        </div>
      )}
    </div>
  )
}

function DiffTable({ results }: { results: RunResult[] }) {
  type Row = { source: string; field: string; from: unknown; to: unknown }
  const rows: Row[] = []
  for (const r of results) {
    for (const [field, change] of Object.entries(r.fields_changed ?? {})) {
      rows.push({ source: r.key, field, from: change.from, to: change.to })
    }
  }
  if (rows.length === 0) {
    return <div style={{ fontSize: 12, color: '#999' }}>No fields changed.</div>
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #eee', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          <th style={{ textAlign: 'left', padding: '6px 12px 6px 0' }}>Source</th>
          <th style={{ textAlign: 'left', padding: '6px 12px' }}>Field</th>
          <th style={{ textAlign: 'left', padding: '6px 12px' }}>Before</th>
          <th style={{ textAlign: 'left', padding: '6px 0' }}>After</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
            <td style={{ padding: '8px 12px 8px 0', fontSize: 11, color: '#9A6B3F', letterSpacing: 1, textTransform: 'uppercase' }}>{r.source}</td>
            <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#111' }}>{r.field}</td>
            <td style={{ padding: '8px 12px', color: '#999' }}>{formatValue(r.from)}</td>
            <td style={{ padding: '8px 0', color: '#111' }}>{formatValue(r.to)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
