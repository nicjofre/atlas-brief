'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EmptyTrashButton({ count }: { count: number }) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function empty() {
    if (
      !confirm(
        `Permanently delete ${count} article${count === 1 ? '' : 's'} from trash? This cannot be undone.`
      )
    ) return
    setBusy(true)
    setError(null)
    try {
      const { error: delErr } = await supabase
        .from('articles')
        .delete()
        .not('deleted_at', 'is', null)
      if (delErr) throw new Error(delErr.message)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Empty failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={empty}
        disabled={busy}
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          padding: '5px 12px',
          background: 'transparent',
          color: '#c0392b',
          border: '1px solid #f5b8a4',
          borderRadius: 2,
          cursor: busy ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {busy ? 'Emptying…' : 'Empty trash'}
      </button>
      {error && <span style={{ fontSize: 11, color: '#c0392b' }}>{error}</span>}
    </div>
  )
}
