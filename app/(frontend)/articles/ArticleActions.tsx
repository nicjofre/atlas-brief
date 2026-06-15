'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Status = 'draft' | 'ready' | 'published' | 'archived'

export default function ArticleActions({
  articleId,
  status,
  slug,
  isTrashed,
}: {
  articleId: string
  status: Status
  slug: string
  isTrashed: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function update(patch: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setBusy(true)
    setError(null)
    try {
      // Loose update: ArticleActions only ever flips a handful of well-known
       // columns (status, deleted_at). Skipping strict typing keeps the helper
       // generic without losing safety in practice.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updErr } = await supabase.from('articles').update(patch as any).eq('id', articleId)
      if (updErr) throw new Error(updErr.message)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  // Trash actions
  if (isTrashed) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => update({ deleted_at: null })}
          disabled={busy}
          style={primaryBtn(busy)}
        >
          Restore
        </button>
        {error && <span style={{ fontSize: 10, color: '#c0392b' }}>{error}</span>}
      </div>
    )
  }

  // Live row actions
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Link href={`/articles/${articleId}/edit`} style={primaryBtn(false)}>
        Edit
      </Link>
      {status === 'published' && (
        <>
          <Link
            href={`/atlas-brief/${slug}`}
            target="_blank"
            rel="noopener"
            style={ghostBtn(false)}
          >
            View ↗
          </Link>
          <button
            onClick={() => update({ status: 'archived' }, 'Archive this article? It will be removed from the public site but kept editable.')}
            disabled={busy}
            style={ghostBtn(busy)}
          >
            Archive
          </button>
        </>
      )}
      {status === 'archived' && (
        <button
          onClick={() => update({ status: 'published' })}
          disabled={busy}
          style={ghostBtn(busy)}
        >
          Re-publish
        </button>
      )}
      <button
        onClick={() => update({ deleted_at: new Date().toISOString() }, 'Send this article to Trash? It will be recoverable.')}
        disabled={busy}
        style={dangerBtn(busy)}
      >
        Trash
      </button>
      {error && <span style={{ fontSize: 10, color: '#c0392b' }}>{error}</span>}
    </div>
  )
}

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    padding: '5px 10px',
    background: busy ? '#888' : '#111',
    color: '#fff',
    textDecoration: 'none',
    border: 'none',
    borderRadius: 2,
    cursor: busy ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  }
}

function ghostBtn(busy: boolean): React.CSSProperties {
  return {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    padding: '5px 10px',
    border: '1px solid #ddd',
    color: '#666',
    textDecoration: 'none',
    background: 'transparent',
    borderRadius: 2,
    cursor: busy ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  }
}

function dangerBtn(busy: boolean): React.CSSProperties {
  return {
    ...ghostBtn(busy),
    color: '#c0392b',
    borderColor: '#f5b8a4',
  }
}
