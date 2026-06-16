'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DraftArticleButton({
  listingId,
  existing,
}: {
  listingId: string
  existing: { id: string; status: string; slug: string } | null
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already exists — show a link to the editor (and to the public post if published).
  if (existing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link
          href={`/articles/${existing.id}/edit`}
          style={{
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            padding: '7px 14px',
            background: '#111',
            color: '#fff',
            borderRadius: 2,
            textDecoration: 'none',
          }}
        >
          {existing.status === 'published' ? 'Edit published article' : `Edit ${existing.status}`}
        </Link>
        {existing.status === 'published' && (
          <Link
            href={`/atlas-brief/${existing.slug}`}
            target="_blank"
            rel="noopener"
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              padding: '7px 12px',
              border: '1px solid #ddd',
              color: '#666',
              borderRadius: 2,
              textDecoration: 'none',
            }}
          >
            View on Atlas Brief ↗
          </Link>
        )}
      </div>
    )
  }

  async function createDraft() {
    setCreating(true)
    setError(null)
    try {
      const r = await fetch('/api/articles/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
      router.push(`/articles/${data.articleId}/edit`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Draft failed')
      setCreating(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={createDraft}
        disabled={creating}
        style={{
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          padding: '7px 14px',
          background: creating ? '#888' : '#9A6B3F',
          color: '#fff',
          border: 'none',
          borderRadius: 2,
          cursor: creating ? 'not-allowed' : 'pointer',
        }}
      >
        {creating ? 'Drafting… (60-120s)' : 'Draft article'}
      </button>
      {error && <span style={{ fontSize: 12, color: '#c0392b' }}>{error}</span>}
    </div>
  )
}
