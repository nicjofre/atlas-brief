'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// listings.status drives every status badge (home page feed, article page,
// listing detail). Editing here propagates to all of them on next render.
type Status = '' | 'for_sale' | 'sold' | 'under_construction' | 'off_market'

const LABELS: Record<Exclude<Status, ''>, string> = {
  for_sale: 'For Sale',
  sold: 'Sold',
  under_construction: 'Under Construction',
  off_market: 'Off Market',
}

export default function StatusEditor({
  listingId,
  currentStatus,
}: {
  listingId: string
  currentStatus: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [value, setValue] = useState<Status>((currentStatus as Status) ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(next: Status) {
    setValue(next)
    setSaving(true)
    setError(null)
    try {
      const { error: updErr } = await supabase
        .from('listings')
        .update({ status: next === '' ? null : next })
        .eq('id', listingId)
      if (updErr) throw new Error(updErr.message)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <select
          value={value}
          onChange={e => handleChange(e.target.value as Status)}
          disabled={saving}
          style={{
            fontSize: 12,
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: 2,
            color: '#111',
            background: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="">— unset —</option>
          {(Object.keys(LABELS) as Array<Exclude<Status, ''>>).map(key => (
            <option key={key} value={key}>{LABELS[key]}</option>
          ))}
        </select>
        {saving && <span style={{ fontSize: 11, color: '#999' }}>saving…</span>}
      </div>
      {error && <div style={{ marginTop: 4, fontSize: 11, color: '#c0392b' }}>{error}</div>}
    </div>
  )
}
