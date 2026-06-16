'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Free-text manual override for ULA. Measure ULA only applies inside the City
// of LA, but the derived ula_* fields are computed from price alone — so David
// can override/annotate here per listing. When blank, the derived ULA applies.
export default function UlaOverride({
  listingId,
  currentOverride,
  derivedSummary,
}: {
  listingId: string
  currentOverride: string | null
  derivedSummary?: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [value, setValue] = useState(currentOverride ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = value.trim() !== (currentOverride ?? '').trim()

  async function save() {
    if (!dirty) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const next = value.trim()
      const { error: updErr } = await supabase
        .from('listings')
        .update({ ula_override: next === '' ? null : next })
        .eq('id', listingId)
      if (updErr) throw new Error(updErr.message)
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          disabled={saving}
          placeholder="Override ULA, e.g. “N/A — outside City of LA”"
          style={{
            fontSize: 12,
            padding: '4px 8px',
            minWidth: 280,
            border: '1px solid #ddd',
            borderRadius: 2,
            color: '#111',
            background: '#fff',
          }}
        />
        {saving && <span style={{ fontSize: 11, color: '#999' }}>saving…</span>}
        {saved && !saving && <span style={{ fontSize: 11, color: '#0A5417' }}>✓ saved</span>}
        {value.trim() !== '' && !saving && !saved && (
          <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#5b87b5' }}>
            override active
          </span>
        )}
      </div>
      {derivedSummary && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#999' }}>
          Auto-derived (from price): {derivedSummary}. Leave blank to use it.
        </div>
      )}
      {error && <div style={{ marginTop: 4, fontSize: 11, color: '#c0392b' }}>{error}</div>}
    </div>
  )
}
