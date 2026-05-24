import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'
import ArticleActions from './ArticleActions'
import EmptyTrashButton from './EmptyTrashButton'

export const dynamic = 'force-dynamic'

type Status = 'draft' | 'ready' | 'published' | 'archived'

type Row = {
  id: string
  slug: string
  status: Status
  section_slug: string
  cat_label: string | null
  entry_num: number
  tape_tier: number | null
  headline: string | null
  published_at: string | null
  updated_at: string
  deleted_at: string | null
  listing: {
    id: string
    property: { street_address: string | null; city: string | null; state: string | null } | null
  } | null
}

export default async function ArticlesIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // We fetch EVERYTHING (including trashed) here, then split into buckets.
  // Articles index is internal-only and the row count stays small.
  const { data: articles, error } = await supabase
    .from('articles')
    .select(`
      id, slug, status, section_slug, cat_label, entry_num, tape_tier,
      headline, published_at, updated_at, deleted_at,
      listing:listings (
        id,
        property:properties (street_address, city, state)
      )
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    return (
      <Shell>
        <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fee', border: '1px solid #fcc', borderRadius: 4, color: '#c0392b', fontSize: 13 }}>
          Error: {error.message}
        </div>
      </Shell>
    )
  }

  const all = (articles ?? []) as unknown as Row[]
  const live = all.filter(a => !a.deleted_at)
  const drafts = live.filter(a => a.status === 'draft' || a.status === 'ready')
  const published = live.filter(a => a.status === 'published')
  const archived = live.filter(a => a.status === 'archived')
  const trashed = all.filter(a => a.deleted_at)

  return (
    <Shell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 6 }}>
              Articles
            </div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#111', margin: 0 }}>
              Drafts, published, archived, trash
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
            <Stat label="Drafts" value={drafts.length} />
            <Stat label="Live" value={published.length} />
            <Stat label="Archived" value={archived.length} />
            <Stat label="Trash" value={trashed.length} />
          </div>
        </div>

        {drafts.length > 0 && (
          <Section title={`In progress · ${drafts.length}`}>
            <ArticleTable rows={drafts} />
          </Section>
        )}

        {published.length > 0 && (
          <Section title={`Published · ${published.length}`}>
            <ArticleTable rows={published} dateLabel="Published" />
          </Section>
        )}

        {archived.length > 0 && (
          <Section title={`Archived · ${archived.length}`} muted>
            <ArticleTable rows={archived} dateLabel="Archived" />
          </Section>
        )}

        {trashed.length > 0 && (
          <Section
            title={`Trash · ${trashed.length}`}
            muted
            extra={<EmptyTrashButton count={trashed.length} />}
          >
            <ArticleTable rows={trashed} dateLabel="Trashed" trashView />
          </Section>
        )}

        {all.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#666', fontSize: 14, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 4 }}>
            No articles yet. Go to{' '}
            <Link href="/listings" style={{ color: '#9A6B3F', borderBottom: '1px solid #9A6B3F' }}>Database</Link>
            , open a listing, and click &ldquo;Draft article&rdquo; to start one.
          </div>
        )}
      </div>
    </Shell>
  )
}

function ArticleTable({
  rows,
  dateLabel = 'Last edit',
  trashView = false,
}: {
  rows: Row[]
  dateLabel?: string
  trashView?: boolean
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ddd', background: '#FAFAF8' }}>
            <Th>Status</Th>
            <Th>Entry</Th>
            <Th>Headline</Th>
            <Th>Listing</Th>
            <Th>Tape</Th>
            <Th>{dateLabel}</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const p = r.listing?.property
            const headlineText = (r.headline ?? '').replace(/\*/g, '') || '(untitled)'
            const dateValue =
              dateLabel === 'Published' ? r.published_at :
              dateLabel === 'Trashed' ? r.deleted_at :
              dateLabel === 'Archived' ? r.updated_at :
              r.updated_at
            return (
              <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <Td><StatusPill status={r.status} trashed={!!r.deleted_at} /></Td>
                <Td>
                  <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#9A6B3F' }}>
                    № {String(r.entry_num).padStart(2, '0')}
                  </span>
                  <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                    {r.cat_label ?? r.section_slug}
                  </div>
                </Td>
                <Td>
                  <Link href={`/articles/${r.id}/edit`} style={{ color: '#111', textDecoration: 'none', fontWeight: 500 }}>
                    {headlineText}
                  </Link>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                    /{r.slug}
                  </div>
                </Td>
                <Td>
                  {p ? (
                    <Link href={`/listings/${r.listing!.id}`} style={{ color: '#9A6B3F', textDecoration: 'none' }}>
                      {p.street_address}
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        {[p.city, p.state].filter(Boolean).join(', ')}
                      </div>
                    </Link>
                  ) : (
                    <span style={{ color: '#bbb' }}>—</span>
                  )}
                </Td>
                <Td>
                  <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#666' }}>
                    {r.tape_tier ? `Tape ${r.tape_tier}` : '—'}
                  </span>
                </Td>
                <Td>
                  <span style={{ fontSize: 12, color: '#666' }}>{formatDate(dateValue)}</span>
                </Td>
                <Td>
                  <ArticleActions
                    articleId={r.id}
                    status={r.status}
                    slug={r.slug}
                    isTrashed={trashView}
                  />
                </Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Section({
  title,
  children,
  muted = false,
  extra,
}: {
  title: string
  children: React.ReactNode
  muted?: boolean
  extra?: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 32, opacity: muted ? 0.85 : 1 }}>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: muted ? '#999' : '#666', marginBottom: 12, borderBottom: `2px solid ${muted ? '#bbb' : '#111'}`, paddingBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span>{title}</span>
        {extra}
      </div>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', fontWeight: 600 }}>
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>{children}</td>
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#999', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 20, color: '#111', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function StatusPill({ status, trashed }: { status: string; trashed: boolean }) {
  if (trashed) {
    return (
      <span style={{ padding: '3px 9px', borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', background: '#FEF3F0', color: '#7A2E2E' }}>
        Trash
      </span>
    )
  }
  const colors: Record<string, { bg: string; fg: string }> = {
    draft: { bg: '#FFF8E7', fg: '#8B6914' },
    ready: { bg: '#E8F4F0', fg: '#0E5E45' },
    published: { bg: '#0B5D1E', fg: '#fff' },
    archived: { bg: '#F0F0F0', fg: '#555' },
  }
  const c = colors[status] ?? { bg: '#eee', fg: '#666' }
  return (
    <span style={{ padding: '3px 9px', borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', background: c.bg, color: c.fg }}>
      {status}
    </span>
  )
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <InternalNav active="articles" />
      {children}
    </div>
  )
}
