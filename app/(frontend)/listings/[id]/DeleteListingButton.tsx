'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteListingButton({ listingId }: { listingId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [stage, setStage] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setStage('deleting')
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: updErr } = await supabase
        .from('listings')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
        .eq('id', listingId)
      if (updErr) throw new Error(updErr.message)
      router.push('/listings')
      router.refresh()
    } catch (e) {
      setStage('confirm')
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (stage === 'idle') {
    return (
      <button
        onClick={() => setStage('confirm')}
        style={{
          padding: '6px 12px',
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: '#c0392b',
          background: '#fff',
          border: '1px solid #c0392b',
          borderRadius: 2,
          cursor: 'pointer',
        }}
      >
        Delete
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={handleConfirm}
        disabled={stage === 'deleting'}
        style={{
          padding: '6px 12px',
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: '#fff',
          background: '#c0392b',
          border: 'none',
          borderRadius: 2,
          cursor: stage === 'deleting' ? 'not-allowed' : 'pointer',
          opacity: stage === 'deleting' ? 0.6 : 1,
        }}
      >
        {stage === 'deleting' ? 'Deleting…' : 'Confirm Delete'}
      </button>
      <button
        onClick={() => {
          setStage('idle')
          setError(null)
        }}
        disabled={stage === 'deleting'}
        style={{
          padding: '6px 12px',
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: '#666',
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: 2,
          cursor: stage === 'deleting' ? 'not-allowed' : 'pointer',
        }}
      >
        Cancel
      </button>
      {error && <span style={{ fontSize: 11, color: '#c0392b' }}>{error}</span>}
    </div>
  )
}
