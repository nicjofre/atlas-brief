'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Choice = '' | 'RSO' | 'AB 1482 Only' | 'Exempt'

export default function RentRegulationOverride({
  listingId,
  currentOverride,
  derivedLabel,
}: {
  listingId: string
  currentOverride: string | null
  derivedLabel: string | null | unknown
}) {
  const derivedLabelString = typeof derivedLabel === 'string' ? derivedLabel : null
  const router = useRouter()
  const supabase = createClient()
  const [value, setValue] = useState<Choice>((currentOverride as Choice) ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(next: Choice) {
    setValue(next)
    setSaving(true)
    setError(null)
    try {
      const { error: updErr } = await supabase
        .from('listings')
        .update({ rent_regulation_override: next === '' ? null : next })
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
          onChange={e => handleChange(e.target.value as Choice)}
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
          <option value="">Use auto-derived ({derivedLabelString ?? '—'})</option>
          <option value="RSO">RSO</option>
          <option value="AB 1482 Only">AB 1482 Only</option>
          <option value="Exempt">Exempt</option>
        </select>
        {saving && <span style={{ fontSize: 11, color: '#999' }}>saving…</span>}
        {value !== '' && !saving && (
          <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#5b87b5' }}>
            override active
          </span>
        )}
      </div>
      {error && <div style={{ marginTop: 4, fontSize: 11, color: '#c0392b' }}>{error}</div>}
    </div>
  )
}
