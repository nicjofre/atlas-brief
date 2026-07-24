import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Client } from 'pg'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'

const TABS = [
  { id: 'posts', label: 'By post' },
  { id: 'pages', label: 'By page' },
  { id: 'dispatch', label: 'Dispatch engagement' },
  { id: 'waitlist', label: 'Tax waitlist' },
  { id: 'deals', label: 'Deal submissions' },
  { id: 'guide', label: 'Guide leads' },
] as const
type TabId = (typeof TABS)[number]['id']

// Every tab honours the same window. `days: null` means all time.
const RANGES = [
  { id: '7', label: '7 days', days: 7 },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
] as const
type RangeId = (typeof RANGES)[number]['id']

// Friendlier names for the pages we know about. Anything else (a section
// index, a new page) falls back to showing the raw path.
const PAGE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/atlas-brief': 'The Tape (index)',
  '/about': 'About',
  '/contact': 'Contact',
  '/tax-appeals': 'Tax Appeals',
  '/rso-briefing': 'RSO Intelligence Briefing',
  '/survival-guide': 'Survival Guide',
}

// The landing pages that gate something behind a form. Pairing unique visitors
// against signups in the same window is the whole point of tracking pages.
const LANDING = [
  { path: '/rso-briefing', label: 'RSO Intelligence Briefing', leadKey: 'rso_briefing' },
  { path: '/survival-guide', label: 'Survival Guide', leadKey: 'survival_guide' },
  { path: '/tax-appeals', label: 'Tax Appeals waitlist', leadKey: 'tax_appeals' },
] as const

const LEAD_SOURCE_LABEL: Record<string, string> = {
  survival_guide: 'Survival Guide',
  rso_briefing: 'RSO Briefing',
}

export const dynamic = 'force-dynamic'

type SourceCols = {
  email_src: number
  social_src: number
  direct_src: number
  internal_src: number
  other_src: number
}
type PostRow = SourceCols & { headline: string; slug: string; total: number; uniques: number }
type PageRow = SourceCols & { path: string; total: number; uniques: number }
type Totals = { total_views: number; unique_readers: number; pieces: number }
type BroadcastRow = { broadcast_id: string; first_seen: string; delivered: number; opens: number; clicks: number }
type LinkRow = { deal: string; clicks: number }
type EmailTotals = { delivered: number; opens: number; clicks: number; untracked: number }
type WaitlistRow = { email: string; name: string | null; property: string | null; created_at: string }
type DealRow = { name: string; email: string; deal: string; note: string | null; created_at: string }
type GuideRow = { name: string; email: string; company: string | null; source: string | null; created_at: string }

// Reused window predicates. $1 is the day count (null = all time).
const VIEW_WINDOW = `($1::int is null or pv.viewed_at > now() - make_interval(days => $1::int))`
const CREATED_WINDOW = `($1::int is null or created_at > now() - make_interval(days => $1::int))`

const SOURCE_COLS = `
  count(*) filter (where pv.source = 'email')::int email_src,
  count(*) filter (where pv.source = 'social')::int social_src,
  count(*) filter (where pv.source = 'direct')::int direct_src,
  count(*) filter (where pv.source = 'internal')::int internal_src,
  count(*) filter (where pv.source = 'other' or pv.source is null)::int other_src`

async function loadAnalytics(days: number | null) {
  const c = new Client({ connectionString: process.env.DATABASE_URI })
  await c.connect()
  const p = [days]
  try {
    const [
      posts, totals, pages, pageTotals, landingViews, landingLeads,
      broadcasts, links, emailCount, emailTotals, waitlist, deals, guideLeads, postTitleRows,
    ] = await Promise.all([
      c.query<PostRow>(`
        select coalesce(a.headline, pv.slug) as headline, pv.slug,
          count(*)::int total,
          count(distinct pv.visitor_hash)::int uniques,
          ${SOURCE_COLS}
        from post_views pv
        left join articles a on a.slug = pv.slug
        where pv.kind = 'article' and pv.slug is not null and ${VIEW_WINDOW}
        group by pv.slug, a.headline
        order by total desc
        limit 100`, p),
      c.query<Totals>(`
        select count(*)::int total_views,
          count(distinct pv.visitor_hash)::int unique_readers,
          count(distinct pv.slug)::int pieces
        from post_views pv
        where pv.kind = 'article' and ${VIEW_WINDOW}`, p),
      c.query<PageRow>(`
        select pv.path,
          count(*)::int total,
          count(distinct pv.visitor_hash)::int uniques,
          ${SOURCE_COLS}
        from post_views pv
        where pv.kind = 'page' and ${VIEW_WINDOW}
        group by pv.path
        order by total desc
        limit 100`, p),
      c.query<Totals>(`
        select count(*)::int total_views,
          count(distinct pv.visitor_hash)::int unique_readers,
          count(distinct pv.path)::int pieces
        from post_views pv
        where pv.kind = 'page' and ${VIEW_WINDOW}`, p),
      c.query<{ path: string; uniques: number }>(`
        select pv.path, count(distinct pv.visitor_hash)::int uniques
        from post_views pv
        where pv.kind = 'page'
          and pv.path in ('/rso-briefing', '/survival-guide', '/tax-appeals')
          and ${VIEW_WINDOW}
        group by pv.path`, p),
      c.query<{ k: string; n: number }>(`
        select 'rso_briefing' as k, count(*)::int n from white_paper_leads
          where source = 'rso_briefing' and ${CREATED_WINDOW}
        union all
        select 'survival_guide', count(*)::int from white_paper_leads
          where source = 'survival_guide' and ${CREATED_WINDOW}
        union all
        select 'tax_appeals', count(*)::int from tax_appeal_waitlist
          where ${CREATED_WINDOW}`, p),
      c.query<BroadcastRow>(`
        select broadcast_id, min(created_at) first_seen,
          count(*) filter (where type = 'delivered')::int delivered,
          count(distinct email) filter (where type = 'opened')::int opens,
          count(distinct email) filter (where type = 'clicked')::int clicks
        from email_events where broadcast_id is not null and ${CREATED_WINDOW}
        group by broadcast_id order by min(created_at) desc limit 50`, p),
      c.query<LinkRow>(`
        select coalesce(substring(link from '/atlas-brief/([a-z0-9-]+)'), link) as deal,
          count(*)::int clicks
        from email_events
        where type = 'clicked' and link is not null and ${CREATED_WINDOW}
        group by deal order by clicks desc limit 30`, p),
      c.query<{ n: number }>(`select count(*)::int n from email_events`),
      c.query<EmailTotals>(`
        select
          count(*) filter (where type = 'delivered')::int delivered,
          count(distinct email) filter (where type = 'opened')::int opens,
          count(distinct email) filter (where type = 'clicked')::int clicks,
          count(*) filter (where broadcast_id is null)::int untracked
        from email_events where ${CREATED_WINDOW}`, p),
      c.query<WaitlistRow>(`
        select email, name, property, created_at
        from tax_appeal_waitlist where ${CREATED_WINDOW}
        order by created_at desc limit 500`, p),
      c.query<DealRow>(`
        select name, email, deal, note, created_at
        from deal_submissions where ${CREATED_WINDOW}
        order by created_at desc limit 500`, p),
      c.query<GuideRow>(`
        select name, email, company, source, created_at
        from white_paper_leads where ${CREATED_WINDOW}
        order by created_at desc limit 500`, p),
      // Freeform post titles (they live in the Payload schema, not `articles`),
      // so "By post" can show a real title instead of the bare slug.
      c.query<{ slug: string; title: string }>(`
        select slug, title from payload.posts where _status = 'published'`),
    ])
    // For a post view, the articles join found nothing so headline === slug.
    // Swap in the post title where we have one.
    const postTitles = new Map(postTitleRows.rows.map(r => [r.slug, r.title]))
    const postsResolved = posts.rows.map(p =>
      p.headline === p.slug && postTitles.has(p.slug)
        ? { ...p, headline: postTitles.get(p.slug)! }
        : p
    )

    const viewsByPath = new Map(landingViews.rows.map(r => [r.path, r.uniques]))
    const leadsByKey = new Map(landingLeads.rows.map(r => [r.k, r.n]))
    const conversions = LANDING.map(l => ({
      label: l.label,
      path: l.path,
      uniques: viewsByPath.get(l.path) ?? 0,
      leads: leadsByKey.get(l.leadKey) ?? 0,
    }))

    const zero: Totals = { total_views: 0, unique_readers: 0, pieces: 0 }
    return {
      posts: postsResolved,
      totals: totals.rows[0] ?? zero,
      pages: pages.rows,
      pageTotals: pageTotals.rows[0] ?? zero,
      conversions,
      broadcasts: broadcasts.rows,
      links: links.rows,
      hasEmail: (emailCount.rows[0]?.n ?? 0) > 0,
      emailTotals: emailTotals.rows[0] ?? { delivered: 0, opens: 0, clicks: 0, untracked: 0 },
      waitlist: waitlist.rows,
      deals: deals.rows,
      guideLeads: guideLeads.rows,
    }
  } finally {
    await c.end().catch(() => {})
  }
}

const TH: React.CSSProperties = {
  textAlign: 'left', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
  color: '#999', fontWeight: 600, padding: '8px 12px', borderBottom: '1px solid #eee',
}
const TD: React.CSSProperties = { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f3f3f3', color: '#222' }
const NUM: React.CSSProperties = { ...TD, fontFamily: 'monospace', textAlign: 'right' as const }

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: '16px 20px', minWidth: 140 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999' }}>{label}</div>
      <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', color: '#0A0A0A', marginTop: 4 }}>{value}</div>
    </div>
  )
}

// The five source columns shared by the post and page tables.
function SourceHeaders() {
  return (
    <>
      <th style={{ ...TH, textAlign: 'right' }}>Email</th>
      <th style={{ ...TH, textAlign: 'right' }}>Social</th>
      <th style={{ ...TH, textAlign: 'right' }}>Direct</th>
      <th style={{ ...TH, textAlign: 'right' }}>Internal</th>
      <th style={{ ...TH, textAlign: 'right' }}>Other</th>
    </>
  )
}
function SourceCells({ r }: { r: SourceCols }) {
  return (
    <>
      <td style={NUM}>{r.email_src || ''}</td>
      <td style={NUM}>{r.social_src || ''}</td>
      <td style={NUM}>{r.direct_src || ''}</td>
      <td style={NUM}>{r.internal_src || ''}</td>
      <td style={NUM}>{r.other_src || ''}</td>
    </>
  )
}

const EMPTY: React.CSSProperties = { color: '#999', fontSize: 14 }

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; range?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const tab: TabId = (TABS.find(t => t.id === sp.tab)?.id ?? 'posts') as TabId
  const range = RANGES.find(r => r.id === sp.range) ?? RANGES[1]
  const rangeId: RangeId = range.id

  const {
    posts, totals, pages, pageTotals, conversions,
    broadcasts, links, hasEmail, emailTotals, waitlist, deals, guideLeads,
  } = await loadAnalytics(range.days)

  const windowNote = range.days === null ? 'all time' : `last ${range.days} days`

  return (
    <>
      <InternalNav active="analytics" />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', fontFamily: 'Georgia, serif' }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Analytics</h1>

        {/* tab bar */}
        <div style={{ display: 'flex', gap: 0, marginTop: 24, borderBottom: '1px solid #ddd', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <Link
              key={t.id}
              href={`/analytics?tab=${t.id}&range=${rangeId}`}
              style={{
                padding: '10px 20px',
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: tab === t.id ? '#111' : '#999',
                textDecoration: 'none',
                borderBottom: tab === t.id ? '2px solid #111' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* date range — applies to every tab */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999' }}>Showing</span>
          {RANGES.map(r => (
            <Link
              key={r.id}
              href={`/analytics?tab=${tab}&range=${r.id}`}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                borderRadius: 999,
                textDecoration: 'none',
                border: '1px solid',
                borderColor: rangeId === r.id ? '#111' : '#e0e0e0',
                background: rangeId === r.id ? '#111' : 'transparent',
                color: rangeId === r.id ? '#fff' : '#666',
              }}
            >
              {r.label}
            </Link>
          ))}
        </div>

        {tab === 'posts' && (
        <>
        <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
          <Stat label="Total reads" value={totals.total_views.toLocaleString()} />
          <Stat label="Unique readers" value={totals.unique_readers.toLocaleString()} />
          <Stat label="Posts read" value={totals.pieces.toLocaleString()} />
        </div>

        <h2 style={{ fontSize: 18, marginTop: 36, marginBottom: 8 }}>By post</h2>
        {posts.length === 0 ? (
          <p style={EMPTY}>No reads recorded in the {windowNote}.</p>
        ) : (
          <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Post</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Reads</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Unique</th>
                  <SourceHeaders />
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.slug}>
                    <td style={TD}>
                      <a href={`/atlas-brief/${p.slug}`} style={{ color: '#0A0A0A' }}>{p.headline.replace(/\*/g, '')}</a>
                    </td>
                    <td style={NUM}>{p.total}</td>
                    <td style={NUM}>{p.uniques}</td>
                    <SourceCells r={p} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>
        )}

        {tab === 'pages' && (
        <>
        <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
          <Stat label="Page views" value={pageTotals.total_views.toLocaleString()} />
          <Stat label="Unique visitors" value={pageTotals.unique_readers.toLocaleString()} />
          <Stat label="Pages viewed" value={pageTotals.pieces.toLocaleString()} />
        </div>

        <h2 style={{ fontSize: 18, marginTop: 36, marginBottom: 8 }}>By page</h2>
        <p style={{ ...EMPTY, marginTop: 0, marginBottom: 12 }}>
          Everything except articles — the home page, The Tape, the landing pages. Admin tools and
          signed-in browsing are never counted.
        </p>
        {pages.length === 0 ? (
          <p style={EMPTY}>No page views recorded in the {windowNote}.</p>
        ) : (
          <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Page</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Views</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Unique</th>
                  <SourceHeaders />
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.path}>
                    <td style={TD}>
                      <a href={p.path} style={{ color: '#0A0A0A' }}>{PAGE_LABELS[p.path] ?? p.path}</a>
                      {PAGE_LABELS[p.path] && (
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#aaa' }}>{p.path}</div>
                      )}
                    </td>
                    <td style={NUM}>{p.total}</td>
                    <td style={NUM}>{p.uniques}</td>
                    <SourceCells r={p} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={{ fontSize: 18, marginTop: 36, marginBottom: 8 }}>Landing page conversion</h2>
        <p style={{ ...EMPTY, marginTop: 0, marginBottom: 12 }}>
          Unique visitors against signups captured in the same window.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Page</th>
                <th style={{ ...TH, textAlign: 'right' }}>Unique visitors</th>
                <th style={{ ...TH, textAlign: 'right' }}>Signups</th>
                <th style={{ ...TH, textAlign: 'right' }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map((c) => (
                <tr key={c.path}>
                  <td style={TD}>
                    <a href={c.path} style={{ color: '#0A0A0A' }}>{c.label}</a>
                  </td>
                  <td style={NUM}>{c.uniques || '—'}</td>
                  <td style={NUM}>{c.leads || '—'}</td>
                  <td style={NUM}>
                    {c.uniques ? `${Math.round((c.leads / c.uniques) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}

        {tab === 'dispatch' && (
        <>
        <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>Dispatch engagement</h2>
        {!hasEmail ? (
          <div style={{ background: '#FBF6EC', border: '1px solid #EADFC8', borderRadius: 8, padding: 16, fontSize: 14, color: '#555' }}>
            No email engagement yet. This fills in once the <b>Resend webhook</b> is connected (in Resend: Webhooks → add{' '}
            <code>https://atlasbrief.la/api/webhooks/resend</code>, then set <code>RESEND_WEBHOOK_SECRET</code>) and a dispatch goes out.
          </div>
        ) : (
          <>
            {/* Email top-line — counts every event in the window, including
                one-off test sends that have no broadcast_id and so never reach
                the table below. */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <Stat label="Delivered" value={emailTotals.delivered.toLocaleString()} />
              <Stat label="Opens" value={emailTotals.opens.toLocaleString()} />
              <Stat label="Clicks" value={emailTotals.clicks.toLocaleString()} />
            </div>

            {broadcasts.length === 0 ? (
              <p style={{ ...EMPTY, marginBottom: 24 }}>
                No full dispatches in the {windowNote} — the per-dispatch breakdown fills in once you
                <b> Send now</b> or <b>Schedule</b> a dispatch. Test sends are counted in the totals
                above but aren&rsquo;t broken out here.
              </p>
            ) : (
            <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Dispatch (broadcast)</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Delivered</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Opens</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Clicks</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Open %</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Click %</th>
                  </tr>
                </thead>
                <tbody>
                  {broadcasts.map((b) => (
                    <tr key={b.broadcast_id}>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12 }}>
                        {new Date(b.first_seen).toLocaleDateString()} · {b.broadcast_id.slice(0, 8)}…
                      </td>
                      <td style={NUM}>{b.delivered}</td>
                      <td style={NUM}>{b.opens}</td>
                      <td style={NUM}>{b.clicks}</td>
                      <td style={NUM}>{b.delivered ? Math.round((b.opens / b.delivered) * 100) + '%' : '—'}</td>
                      <td style={NUM}>{b.delivered ? Math.round((b.clicks / b.delivered) * 100) + '%' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
            {links.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, color: '#666', margin: '0 0 8px' }}>Most-clicked deals</h3>
                <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {links.map((l) => (
                        <tr key={l.deal}>
                          <td style={TD}>{l.deal}</td>
                          <td style={NUM}>{l.clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
        </>
        )}

        {tab === 'waitlist' && (
        <>
        <div style={{ display: 'flex', gap: 16, marginTop: 20, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="Waitlist signups" value={waitlist.length.toLocaleString()} />
        </div>
        <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>Tax Appeals waitlist</h2>
        {waitlist.length === 0 ? (
          <p style={EMPTY}>
            No signups in the {windowNote}. Interest captured on the public{' '}
            <Link href="/tax-appeals" style={{ color: '#9A6B3F' }}>Tax Appeals</Link> page shows here.
          </p>
        ) : (
          <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Email</th>
                  <th style={TH}>Name</th>
                  <th style={TH}>Property</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((w) => (
                  <tr key={w.email}>
                    <td style={TD}><a href={`mailto:${w.email}`} style={{ color: '#0A0A0A' }}>{w.email}</a></td>
                    <td style={TD}>{w.name || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={TD}>{w.property || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                      {new Date(w.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>
        )}

        {tab === 'deals' && (
        <>
        <div style={{ display: 'flex', gap: 16, marginTop: 20, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="Deals submitted" value={deals.length.toLocaleString()} />
        </div>
        <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>Submitted deals</h2>
        {deals.length === 0 ? (
          <p style={EMPTY}>
            No deals submitted in the {windowNote}. Deals sent through the header <b>Submit a Deal</b> popup show here.
          </p>
        ) : (
          <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>From</th>
                  <th style={TH}>Deal</th>
                  <th style={TH}>Note</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Sent</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d, i) => (
                  <tr key={`${d.email}-${i}`}>
                    <td style={TD}>
                      <div>{d.name}</div>
                      <a href={`mailto:${d.email}`} style={{ color: '#9A6B3F', fontSize: 13 }}>{d.email}</a>
                    </td>
                    <td style={{ ...TD, maxWidth: 320 }}>{d.deal}</td>
                    <td style={{ ...TD, color: '#666', fontSize: 13 }}>{d.note || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>
        )}

        {tab === 'guide' && (
        <>
        <div style={{ display: 'flex', gap: 16, marginTop: 20, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="Total leads" value={guideLeads.length.toLocaleString()} />
          <Stat
            label="RSO Briefing"
            value={guideLeads.filter(g => g.source === 'rso_briefing').length.toLocaleString()}
          />
          <Stat
            label="Survival Guide"
            value={guideLeads.filter(g => g.source === 'survival_guide').length.toLocaleString()}
          />
        </div>
        <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>Downloadable leads</h2>
        <p style={{ ...EMPTY, marginTop: 0, marginBottom: 12 }}>
          Both gated PDFs capture into the same list. The Source column shows which one each lead came from.
        </p>
        {guideLeads.length === 0 ? (
          <p style={EMPTY}>
            No downloads in the {windowNote}. Leads captured on the{' '}
            <Link href="/survival-guide" style={{ color: '#9A6B3F' }}>Survival Guide</Link> and{' '}
            <Link href="/rso-briefing" style={{ color: '#9A6B3F' }}>RSO Briefing</Link> pages show here.
          </p>
        ) : (
          <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Name</th>
                  <th style={TH}>Email</th>
                  <th style={TH}>Company</th>
                  <th style={TH}>Source</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Downloaded</th>
                </tr>
              </thead>
              <tbody>
                {guideLeads.map((g, i) => (
                  <tr key={`${g.email}-${i}`}>
                    <td style={TD}>{g.name}</td>
                    <td style={TD}><a href={`mailto:${g.email}`} style={{ color: '#9A6B3F' }}>{g.email}</a></td>
                    <td style={{ ...TD, color: '#666' }}>{g.company || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...TD, color: '#666' }}>
                      {g.source
                        ? (LEAD_SOURCE_LABEL[g.source] ?? g.source)
                        : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                      {new Date(g.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>
        )}
      </div>
    </>
  )
}
