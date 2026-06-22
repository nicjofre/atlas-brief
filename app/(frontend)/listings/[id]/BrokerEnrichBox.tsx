'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPropertyAsset } from '@/lib/upload-image'
import type { Database } from '@/lib/db/types'

type BrokerUpdate = Database['public']['Tables']['brokers']['Update']

const ACCENT = '#9A6B3F'

// Fields the broker enrichment can fill, in display order. Keep in sync with the
// brokers table + the /api/parse-broker schema.
const FIELDS: Array<{ key: string; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'title', label: 'Title' },
  { key: 'firm', label: 'Firm' },
  { key: 'team', label: 'Team' },
  { key: 'phone', label: 'Phone' },
  { key: 'cell', label: 'Cell' },
  { key: 'email', label: 'Email' },
  { key: 'dre_license', label: 'DRE License' },
  { key: 'office_address', label: 'Office Address' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'profile_url', label: 'Profile URL' },
  { key: 'focus_areas', label: 'Focus Areas' },
  { key: 'start_year', label: 'Start Year' },
  { key: 'years_active', label: 'Years Active' },
  { key: 'volume_closed', label: 'Volume Closed' },
  { key: 'bio', label: 'Bio' },
]

function asDisplay(v: unknown): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

type ProposedRow = {
  key: string
  label: string
  current: string
  next: string
  nextValue: unknown
  overwrites: boolean
  checked: boolean
}

export default function BrokerEnrichBox({
  brokerId,
  current,
  firm,
  logoSignedUrl,
  logoPath,
}: {
  brokerId: string
  current: Record<string, unknown>
  firm: string | null
  logoSignedUrl: string | null
  logoPath: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [rows, setRows] = useState<ProposedRow[] | null>(null)

  async function handleExtract() {
    setBusy(true)
    setError(null)
    setNote(null)
    setRows(null)
    try {
      const res = await fetch('/api/parse-broker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Parse failed')

      const proposed = data.proposed as Record<string, unknown>
      const next: ProposedRow[] = []
      for (const { key, label } of FIELDS) {
        const nextValue = proposed[key]
        const nextDisplay = asDisplay(nextValue)
        if (!nextDisplay) continue // nothing extracted for this field
        const curDisplay = asDisplay(current[key])
        if (nextDisplay === curDisplay) continue // no change
        next.push({
          key,
          label,
          current: curDisplay,
          next: nextDisplay,
          nextValue,
          overwrites: curDisplay.length > 0,
          // default: take new data, but pre-uncheck overwrites so existing
          // values aren't replaced unless David opts in.
          checked: curDisplay.length === 0,
        })
      }
      if (next.length === 0) {
        setNote('No new fields found — everything in the paste already matches what we have.')
      } else {
        setRows(next)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!rows) return
    const selected = rows.filter(r => r.checked)
    if (selected.length === 0) {
      setNote('Nothing selected to save.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const patch: BrokerUpdate = {}
      for (const r of selected) (patch as Record<string, unknown>)[r.key] = r.nextValue
      const { error: updErr } = await supabase.from('brokers').update(patch).eq('id', brokerId)
      if (updErr) throw new Error(updErr.message)
      setRows(null)
      setText('')
      setNote(`Saved ${selected.length} field${selected.length === 1 ? '' : 's'}.`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogoFile(file: File) {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const { path } = await uploadPropertyAsset(supabase, {
        file,
        pathPrefix: `broker/firm-logo/${brokerId}`,
      })
      if (logoPath) {
        await supabase.storage.from('property-assets').remove([logoPath])
      }
      // A firm's logo is the same for everyone there — propagate to all brokers
      // sharing this firm name so it's upload-once-per-firm. Falls back to just
      // this broker when no firm is set.
      if (firm && firm.trim()) {
        const { error: e } = await supabase
          .from('brokers')
          .update({ firm_logo_url: path })
          .ilike('firm', firm.trim())
        if (e) throw new Error(e.message)
        setNote(`Logo saved for all brokers at ${firm.trim()}.`)
      } else {
        const { error: e } = await supabase
          .from('brokers')
          .update({ firm_logo_url: path })
          .eq('id', brokerId)
        if (e) throw new Error(e.message)
        setNote('Logo saved.')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logo upload failed')
    } finally {
      setBusy(false)
    }
  }

  // Paste an image anywhere in the box to set the firm logo.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile()
          if (file) {
            e.preventDefault()
            void handleLogoFile(file)
            return
          }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firm, logoPath])

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: ACCENT,
    marginBottom: 6,
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
      <div style={labelStyle}>Enrich broker</div>

      {/* Firm logo */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div
          onClick={() => document.getElementById(`logo-input-${brokerId}`)?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) handleLogoFile(f)
          }}
          style={{
            width: 96,
            height: 64,
            border: '2px dashed #ddd',
            borderRadius: 6,
            background: logoSignedUrl
              ? `url(${logoSignedUrl}) center/contain no-repeat #fff`
              : '#f9f9f9',
            cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <input
            id={`logo-input-${brokerId}`}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleLogoFile(f)
            }}
          />
          {!logoSignedUrl && (
            <div style={{ fontSize: 9, color: '#aaa', textAlign: 'center', padding: 4, lineHeight: 1.2 }}>
              Firm logo
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5, flexGrow: 1 }}>
          Firm logo. Drag, click, or click then ⌘V/Ctrl+V to paste an image.
          {firm ? ` Applies to all brokers at ${firm}.` : ''}
        </div>
      </div>

      {/* Text enrichment */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste the broker's bio / contact block from their firm website, email signature, or LinkedIn. We'll pull out the profile fields CoStar doesn't give us and let you pick what to save."
        rows={4}
        style={{
          width: '100%',
          fontSize: 12,
          padding: 8,
          border: '1px solid #ddd',
          borderRadius: 4,
          fontFamily: 'inherit',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={handleExtract}
          disabled={busy || !text.trim()}
          style={{
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: '#fff',
            background: busy || !text.trim() ? '#ccc' : ACCENT,
            border: 'none',
            borderRadius: 4,
            padding: '6px 12px',
            cursor: busy || !text.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Working…' : 'Extract'}
        </button>
        {note && <span style={{ fontSize: 11, color: '#666' }}>{note}</span>}
        {error && <span style={{ fontSize: 11, color: '#c0392b' }}>{error}</span>}
      </div>

      {/* Proposed changes preview */}
      {rows && (
        <div style={{ marginTop: 12, border: '1px solid #eee', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#888', padding: '8px 10px', background: '#fafafa' }}>
            Proposed changes — pick what to save
          </div>
          {rows.map((r, i) => (
            <label
              key={r.key}
              style={{
                display: 'flex',
                gap: 10,
                padding: '8px 10px',
                borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
                cursor: 'pointer',
                alignItems: 'flex-start',
              }}
            >
              <input
                type="checkbox"
                checked={r.checked}
                onChange={e =>
                  setRows(rows.map(x => (x.key === r.key ? { ...x, checked: e.target.checked } : x)))
                }
                style={{ marginTop: 3 }}
              />
              <div style={{ flexGrow: 1, fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 600 }}>
                  {r.label}
                  {r.overwrites && (
                    <span style={{ color: '#c0392b', fontWeight: 400, fontSize: 10, marginLeft: 6 }}>
                      overwrites
                    </span>
                  )}
                </div>
                {r.overwrites && <div style={{ color: '#999', textDecoration: 'line-through' }}>{r.current}</div>}
                <div style={{ color: '#1a7a3a' }}>{r.next}</div>
              </div>
            </label>
          ))}
          <div style={{ padding: '8px 10px', borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={busy}
              style={{
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: '#fff',
                background: busy ? '#ccc' : ACCENT,
                border: 'none',
                borderRadius: 4,
                padding: '6px 12px',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Save selected
            </button>
            <button
              onClick={() => setRows(null)}
              disabled={busy}
              style={{
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: '#666',
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
