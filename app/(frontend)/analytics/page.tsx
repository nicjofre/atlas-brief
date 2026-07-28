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
// One named subscriber's reading on the site, joined to their email engagement.
type ReaderRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string | null
  views: number
  pieces: number
  last_seen: string
  last_path: string
  opens: number
  clicks: number
}
type ReaderTotals = { identified: number; readers: number; total: number }

// ---- one reader, in full ----
type ReaderProfile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string | null
  status: string
  created_at: string
}
// A single thing the reader did, on the site or in their inbox. Both streams
// merge into one chronological timeline — the point of the detail view is
// seeing "opened, clicked, then read three more things" as one sequence.
type TimelineEntry = {
  at: string
  kind: 'view' | 'open' | 'click' | 'other'
  label: string
  detail: string | null
}
type ReaderDetail = {
  profile: ReaderProfile
  timeline: TimelineEntry[]
  views: number
  pages: number
  opens: number
  clicks: number
  firstSeen: string | null
  truncated: boolean
}

// ---- one dispatch, recipient by recipient ----
type BroadcastSummary = {
  broadcast_id: string
  first_seen: string
  recipients: number
  delivered: number
  opens: number
  clicks: number
  bounces: number
  complaints: number
  // Clicks landing within 90 seconds of the send. Corporate mail gateways
  // pre-fetch every link in a message to scan it, which registers as a
  // recipient clicking everything at once. Counted so the UI can say so
  // instead of quietly reporting scanners as readers.
  burst_clicks: number
  burst_people: number
}
type RecipientRow = {
  email: string
  subscriber_id: string | null
  first_name: string | null
  last_name: string | null
  role: string | null
  delivered_at: string | null
  first_open: string | null
  opens: number
  first_click: string | null
  clicks: number
  bounced: boolean
  complained: boolean
  // Which deals this person clicked, resolved to headlines.
  clicked: string[]
}
type BroadcastDetail = {
  summary: BroadcastSummary
  recipients: RecipientRow[]
  deals: { label: string; clicks: number; people: number }[]
  truncated: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Resend broadcast ids are uuids, but a hand-set id (a test send) can be any
// slug — so validate shape loosely and rely on the parameterized query.
const BROADCAST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const RECIPIENT_LIMIT = 1000
// Enough to read a reader's whole relationship with the brief without letting
// one very active subscriber pull an unbounded result set.
const TIMELINE_LIMIT = 300

// Reused window predicates. $1 is the day count (null = all time).
const VIEW_WINDOW = `($1::int is null or pv.viewed_at > now() - make_interval(days => $1::int))`
const CREATED_WINDOW = `($1::int is null or created_at > now() - make_interval(days => $1::int))`

const SOURCE_COLS = `
  count(*) filter (where pv.source = 'email')::int email_src,
  count(*) filter (where pv.source = 'social')::int social_src,
  count(*) filter (where pv.source = 'direct')::int direct_src,
  count(*) filter (where pv.source = 'internal')::int internal_src,
  count(*) filter (where pv.source = 'other' or pv.source is null)::int other_src`

// Everything one named reader did in the window, site and inbox merged. Runs on
// the connection loadAnalytics already opened, and only when a reader is
// selected — the list view never pays for it.
async function loadReaderDetail(
  c: Client,
  days: number | null,
  readerId: string,
  labelForPath: (path: string) => string
): Promise<ReaderDetail | null> {
  const p: [number | null, string] = [days, readerId]

  const profile = await c.query<ReaderProfile>(
    `select id, email, first_name, last_name, role, status, created_at
     from subscribers where id = $1`,
    [readerId]
  )
  if (!profile.rows[0]) return null

  const [views, events, totals] = await Promise.all([
    c.query<{ path: string; source: string | null; viewed_at: string }>(`
      select pv.path, pv.source, pv.viewed_at
      from post_views pv
      where pv.subscriber_id = $2 and ${VIEW_WINDOW}
      order by pv.viewed_at desc
      limit ${TIMELINE_LIMIT}`, p),
    // Joined on the address, which is how Resend identifies a recipient — the
    // webhook never sees our subscriber id.
    c.query<{ type: string; link: string | null; created_at: string }>(`
      select e.type, e.link, e.created_at
      from email_events e
      where lower(e.email) = (select lower(email) from subscribers where id = $2)
        and ${CREATED_WINDOW.replace('created_at', 'e.created_at')}
      order by e.created_at desc
      limit ${TIMELINE_LIMIT}`, p),
    c.query<{ views: number; pages: number; first_seen: string | null }>(`
      select count(*)::int views, count(distinct pv.path)::int pages,
        min(pv.viewed_at) first_seen
      from post_views pv
      where pv.subscriber_id = $2 and ${VIEW_WINDOW}`, p),
  ])

  const timeline: TimelineEntry[] = [
    ...views.rows.map((v): TimelineEntry => ({
      at: v.viewed_at,
      kind: 'view',
      label: labelForPath(v.path),
      // 'email' on the first page of a dispatch click, 'internal' after that —
      // which is exactly how you tell the landing page from what followed it.
      detail: v.source === 'email' ? 'arrived from the dispatch' : v.source,
    })),
    ...events.rows.map((e): TimelineEntry => ({
      at: e.created_at,
      kind: e.type === 'opened' ? 'open' : e.type === 'clicked' ? 'click' : 'other',
      label: e.type === 'opened'
        ? 'Opened the dispatch'
        : e.type === 'clicked'
          ? `Clicked ${labelForPath((e.link || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0] || '')}`
          : `Email ${e.type}`,
      detail: null,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const t = totals.rows[0]
  return {
    profile: profile.rows[0],
    timeline: timeline.slice(0, TIMELINE_LIMIT),
    views: t?.views ?? 0,
    pages: t?.pages ?? 0,
    opens: events.rows.filter(e => e.type === 'opened').length,
    clicks: events.rows.filter(e => e.type === 'clicked').length,
    firstSeen: t?.first_seen ?? null,
    truncated: timeline.length > TIMELINE_LIMIT,
  }
}

// Everyone one dispatch reached, and what each of them did with it.
//
// Deliberately NOT windowed: once you've drilled into a specific dispatch you
// want that dispatch's whole story, not the slice of it that happens to fall
// inside the page's date filter. A 7-day view of a 3-week-old send would show
// an empty recipient list next to real headline numbers.
async function loadBroadcastDetail(
  c: Client,
  broadcastId: string,
  labelForPath: (path: string) => string
): Promise<BroadcastDetail | null> {
  const p = [broadcastId]

  const summary = await c.query<BroadcastSummary>(`
    select broadcast_id, min(created_at) first_seen,
      count(distinct email)::int recipients,
      count(*) filter (where type = 'delivered')::int delivered,
      count(distinct email) filter (where type = 'opened')::int opens,
      count(distinct email) filter (where type = 'clicked')::int clicks,
      count(distinct email) filter (where type = 'bounced')::int bounces,
      count(distinct email) filter (where type = 'complained')::int complaints,
      count(*) filter (
        where type = 'clicked'
          and created_at < (select min(created_at) + interval '90 seconds'
                            from email_events where broadcast_id = $1)
      )::int burst_clicks,
      count(distinct email) filter (
        where type = 'clicked'
          and created_at < (select min(created_at) + interval '90 seconds'
                            from email_events where broadcast_id = $1)
      )::int burst_people
    from email_events where broadcast_id = $1
    group by broadcast_id`, p)
  if (!summary.rows[0]) return null

  const [recipients, clickedLinks, deals] = await Promise.all([
    // One row per address. Subscribers are joined on the address because that's
    // all Resend reports; a recipient with no subscriber row (removed since the
    // send) still shows, just without a name.
    c.query<Omit<RecipientRow, 'clicked'>>(`
      select lower(e.email) as email,
        s.id as subscriber_id, s.first_name, s.last_name, s.role,
        min(e.created_at) filter (where e.type = 'delivered') as delivered_at,
        min(e.created_at) filter (where e.type = 'opened') as first_open,
        count(*) filter (where e.type = 'opened')::int opens,
        min(e.created_at) filter (where e.type = 'clicked') as first_click,
        count(*) filter (where e.type = 'clicked')::int clicks,
        bool_or(e.type = 'bounced') as bounced,
        bool_or(e.type = 'complained') as complained
      from email_events e
      left join subscribers s on lower(s.email) = lower(e.email)
      where e.broadcast_id = $1 and e.email is not null
      group by lower(e.email), s.id, s.first_name, s.last_name, s.role
      order by clicks desc, opens desc, lower(e.email)
      limit ${RECIPIENT_LIMIT}`, p),
    c.query<{ email: string; link: string }>(`
      select distinct lower(email) as email, link
      from email_events
      where broadcast_id = $1 and type = 'clicked' and link is not null`, p),
    c.query<{ link: string; clicks: number; people: number }>(`
      select link, count(*)::int clicks, count(distinct email)::int people
      from email_events
      where broadcast_id = $1 and type = 'clicked' and link is not null
      group by link order by clicks desc limit 30`, p),
  ])

  // A tracked link is a full URL; reduce it to the path so it resolves to a
  // headline the same way an on-site read does.
  const toLabel = (link: string) =>
    labelForPath(link.replace(/^https?:\/\/[^/]+/, '').split('?')[0] || link)

  const byEmail = new Map<string, string[]>()
  for (const r of clickedLinks.rows) {
    const list = byEmail.get(r.email) ?? []
    const label = toLabel(r.link)
    if (!list.includes(label)) list.push(label)
    byEmail.set(r.email, list)
  }

  return {
    summary: summary.rows[0],
    recipients: recipients.rows.map(r => ({ ...r, clicked: byEmail.get(r.email) ?? [] })),
    deals: deals.rows.map(d => ({ label: toLabel(d.link), clicks: d.clicks, people: d.people })),
    truncated: recipients.rowCount === RECIPIENT_LIMIT,
  }
}

async function loadAnalytics(days: number | null, readerId: string | null, broadcastId: string | null) {
  const c = new Client({ connectionString: process.env.DATABASE_URI })
  await c.connect()
  const p = [days]
  try {
    const [
      posts, totals, pages, pageTotals, landingViews, landingLeads,
      broadcasts, links, emailCount, emailTotals, waitlist, deals, guideLeads, postTitleRows,
      readerRows, readerTotals, emailByAddress, articleTitleRows,
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
      // --- named readers ---
      // Every view we could attribute to a subscriber, grouped by person. The
      // join is on subscriber_id, so anonymous traffic simply isn't in here.
      // Titles are resolved in JS rather than joined: joining articles and
      // payload.posts inside an aggregate risks multiplying rows and inflating
      // the very counts this table exists to report.
      c.query<Omit<ReaderRow, 'opens' | 'clicks'>>(`
        select s.id, s.email, s.first_name, s.last_name, s.role,
          count(*)::int views,
          count(distinct pv.path)::int pieces,
          max(pv.viewed_at) last_seen,
          (array_agg(pv.path order by pv.viewed_at desc))[1] as last_path
        from post_views pv
        join subscribers s on s.id = pv.subscriber_id
        where ${VIEW_WINDOW}
        group by s.id, s.email, s.first_name, s.last_name, s.role
        order by views desc, last_seen desc
        limit 200`, p),
      c.query<ReaderTotals>(`
        select
          count(*) filter (where pv.subscriber_id is not null)::int identified,
          count(distinct pv.subscriber_id)::int readers,
          count(*)::int total
        from post_views pv
        where ${VIEW_WINDOW}`, p),
      // Email engagement keyed by address, merged onto the reader rows in JS.
      c.query<{ email: string; opens: number; clicks: number }>(`
        select lower(email) as email,
          count(*) filter (where type = 'opened')::int opens,
          count(*) filter (where type = 'clicked')::int clicks
        from email_events
        where email is not null and ${CREATED_WINDOW}
        group by lower(email)`, p),
      c.query<{ slug: string; headline: string }>(`
        select slug, headline from articles where headline is not null`),
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

    // Path -> human label, so "last read" shows a headline rather than a slug.
    const articleTitles = new Map(articleTitleRows.rows.map(r => [r.slug, r.headline.replace(/\*/g, '')]))
    const labelForPath = (path: string): string => {
      if (PAGE_LABELS[path]) return PAGE_LABELS[path]
      const m = /^\/atlas-brief\/([^/]+)$/.exec(path || '')
      if (!m) return path
      return articleTitles.get(m[1]) ?? postTitles.get(m[1]) ?? m[1]
    }
    const engagement = new Map(emailByAddress.rows.map(r => [r.email, r]))
    const readers: ReaderRow[] = readerRows.rows.map(r => {
      const e = engagement.get(r.email.toLowerCase())
      return {
        ...r,
        last_path: labelForPath(r.last_path),
        opens: e?.opens ?? 0,
        clicks: e?.clicks ?? 0,
      }
    })

    const readerDetail = readerId ? await loadReaderDetail(c, days, readerId, labelForPath) : null
    const broadcastDetail = broadcastId && !readerId
      ? await loadBroadcastDetail(c, broadcastId, labelForPath)
      : null

    const zero: Totals = { total_views: 0, unique_readers: 0, pieces: 0 }
    return {
      readerDetail,
      broadcastDetail,
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
      readers,
      readerTotals: readerTotals.rows[0] ?? { identified: 0, readers: 0, total: 0 },
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

// Recipient rows list the deals someone clicked, and a dispatch carries enough
// deals that spelling out full headlines turns every row into a paragraph.
// Trim each one and summarise the tail.
function clickedSummary(labels: string[], shown = 2, width = 38): string {
  if (labels.length === 0) return ''
  const short = labels
    .slice(0, shown)
    .map(l => (l.length > width ? `${l.slice(0, width - 1).trimEnd()}…` : l))
  const rest = labels.length - short.length
  return rest > 0 ? `${short.join(' · ')} +${rest} more` : short.join(' · ')
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; range?: string; reader?: string; broadcast?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const tab: TabId = (TABS.find(t => t.id === sp.tab)?.id ?? 'posts') as TabId
  const range = RANGES.find(r => r.id === sp.range) ?? RANGES[1]
  const rangeId: RangeId = range.id
  // Validated before it reaches SQL — a malformed uuid is a Postgres error, not
  // an empty result.
  const readerId = sp.reader && UUID_RE.test(sp.reader) ? sp.reader : null
  const broadcastId = sp.broadcast && BROADCAST_ID_RE.test(sp.broadcast) ? sp.broadcast : null

  const {
    posts, totals, pages, pageTotals, conversions,
    broadcasts, links, hasEmail, emailTotals, waitlist, deals, guideLeads,
    readers, readerTotals, readerDetail, broadcastDetail,
  } = await loadAnalytics(
    range.days,
    tab === 'dispatch' ? readerId : null,
    tab === 'dispatch' ? broadcastId : null
  )

  // Switching range while drilled into a person or a dispatch keeps you there.
  const rangeHref = (r: RangeId) =>
    `/analytics?tab=${tab}&range=${r}` +
    (readerDetail ? `&reader=${readerDetail.profile.id}` : '') +
    (broadcastDetail ? `&broadcast=${broadcastDetail.summary.broadcast_id}` : '')
  const readersHref = `/analytics?tab=dispatch&range=${rangeId}`

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
              href={rangeHref(r.id)}
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
        {!readerDetail && !broadcastDetail && (
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
                        <Link
                          href={`/analytics?tab=dispatch&range=${rangeId}&broadcast=${b.broadcast_id}`}
                          style={{ color: '#0A0A0A' }}
                        >
                          {new Date(b.first_seen).toLocaleDateString()} · {b.broadcast_id.slice(0, 8)}…
                        </Link>
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

        {/* ---- one dispatch, recipient by recipient ---- */}
        {broadcastDetail && (() => {
          const b = broadcastDetail.summary
          const pct = (n: number) => (b.delivered ? `${Math.round((n / b.delivered) * 100)}%` : '—')
          const quiet = broadcastDetail.recipients.filter(r => !r.opens && !r.clicks && !r.bounced).length
          return (
            <>
              <div style={{ marginTop: 28 }}>
                <Link href={readersHref} style={{ fontSize: 12, color: '#9A6B3F', textDecoration: 'none' }}>
                  ← All dispatches
                </Link>
              </div>
              <h2 style={{ fontSize: 22, marginTop: 12, marginBottom: 2 }}>
                Dispatch · {new Date(b.first_seen).toLocaleDateString()}
              </h2>
              <p style={{ ...EMPTY, marginTop: 0, marginBottom: 16 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.broadcast_id}</span>
                {' · '}every event for this send, whatever date range is selected
              </p>

              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <Stat label="Recipients" value={b.recipients.toLocaleString()} />
                <Stat label="Delivered" value={b.delivered.toLocaleString()} />
                <Stat label="Opened" value={`${b.opens} · ${pct(b.opens)}`} />
                <Stat label="Clicked" value={`${b.clicks} · ${pct(b.clicks)}`} />
                {b.bounces > 0 && <Stat label="Bounced" value={b.bounces.toLocaleString()} />}
                {b.complaints > 0 && <Stat label="Complaints" value={b.complaints.toLocaleString()} />}
              </div>

              {b.burst_people > 0 && (
                <div style={{
                  background: '#FBF6EC', border: '1px solid #EADFC8', borderRadius: 8,
                  padding: '12px 16px', fontSize: 13, color: '#5A4A33', marginBottom: 24,
                }}>
                  <b>{b.burst_clicks} of these clicks came from {b.burst_people} recipient
                  {b.burst_people === 1 ? '' : 's'} within 90 seconds of the send.</b>{' '}
                  That pattern is almost always corporate mail security scanning every link in the
                  message, not people reading it. Treat the click figure above as an upper bound —
                  the clicks spread out over the following hours are the real ones.
                </div>
              )}

              {broadcastDetail.deals.length > 0 && (
                <>
                  <h3 style={{ fontSize: 14, color: '#666', margin: '0 0 8px' }}>What they clicked</h3>
                  <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={TH}>Deal</th>
                          <th style={{ ...TH, textAlign: 'right' }}>People</th>
                          <th style={{ ...TH, textAlign: 'right' }}>Clicks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {broadcastDetail.deals.map((d) => (
                          <tr key={d.label}>
                            <td style={TD}>{d.label}</td>
                            <td style={NUM}>{d.people}</td>
                            <td style={NUM}>{d.clicks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <h3 style={{ fontSize: 14, color: '#666', margin: '0 0 8px' }}>
                Recipients · clickers first
                {quiet > 0 && (
                  <span style={{ color: '#999', fontWeight: 400 }}>
                    {' '}· {quiet} received it without opening
                  </span>
                )}
              </h3>
              {broadcastDetail.recipients.length === 0 ? (
                <p style={EMPTY}>No recipient events recorded for this dispatch.</p>
              ) : (
                <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH}>Recipient</th>
                        <th style={TH}>Clicked</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Opens</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Clicks</th>
                        <th style={{ ...TH, textAlign: 'right' }}>First opened</th>
                      </tr>
                    </thead>
                    <tbody>
                      {broadcastDetail.recipients.map((r) => {
                        const name = [r.first_name, r.last_name].filter(Boolean).join(' ')
                        return (
                          <tr key={r.email}>
                            <td style={TD}>
                              {r.subscriber_id ? (
                                <Link
                                  href={`/analytics?tab=dispatch&range=${rangeId}&reader=${r.subscriber_id}`}
                                  style={{ color: '#0A0A0A' }}
                                >
                                  {name || r.email}
                                </Link>
                              ) : (
                                <span>{name || r.email}</span>
                              )}
                              <div style={{ fontSize: 11, color: '#999' }}>
                                {name ? r.email : ''}{name && r.role ? ' · ' : ''}{r.role || ''}
                                {r.bounced ? ' · bounced' : ''}
                                {r.complained ? ' · marked spam' : ''}
                                {!r.subscriber_id ? ' · no longer on the list' : ''}
                              </div>
                            </td>
                            <td style={{ ...TD, fontSize: 12, color: '#555' }} title={r.clicked.join('\n')}>
                              {r.clicked.length
                                ? clickedSummary(r.clicked)
                                : <span style={{ color: '#ccc' }}>—</span>}
                            </td>
                            <td style={NUM}>{r.opens || ''}</td>
                            <td style={NUM}>{r.clicks || ''}</td>
                            <td style={{ ...NUM, fontSize: 12, color: '#666' }}>
                              {r.first_open
                                ? new Date(r.first_open).toLocaleString([], {
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                  })
                                : ''}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {broadcastDetail.truncated && (
                <p style={{ ...EMPTY, marginTop: 8, fontSize: 12 }}>
                  Showing the first {RECIPIENT_LIMIT} recipients.
                </p>
              )}
            </>
          )
        })()}

        {/* ---- one reader, in full ---- */}
        {readerDetail ? (
        <>
        <div style={{ marginTop: 40 }}>
          <Link href={readersHref} style={{ fontSize: 12, color: '#9A6B3F', textDecoration: 'none' }}>
            ← All readers
          </Link>
        </div>
        {(() => {
          const d = readerDetail
          const name = [d.profile.first_name, d.profile.last_name].filter(Boolean).join(' ')
          return (
            <>
              <h2 style={{ fontSize: 22, marginTop: 12, marginBottom: 2 }}>{name || d.profile.email}</h2>
              <p style={{ ...EMPTY, marginTop: 0, marginBottom: 16 }}>
                <a href={`mailto:${d.profile.email}`} style={{ color: '#9A6B3F' }}>{d.profile.email}</a>
                {d.profile.role ? ` · ${d.profile.role}` : ''}
                {d.profile.status !== 'subscribed' ? ` · ${d.profile.status}` : ''}
                {' · subscribed '}{new Date(d.profile.created_at).toLocaleDateString()}
              </p>

              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <Stat label="Page views" value={d.views.toLocaleString()} />
                <Stat label="Pages read" value={d.pages.toLocaleString()} />
                <Stat label="Opens" value={d.opens.toLocaleString()} />
                <Stat label="Clicks" value={d.clicks.toLocaleString()} />
                <Stat
                  label="First seen"
                  value={d.firstSeen ? new Date(d.firstSeen).toLocaleDateString() : '—'}
                />
              </div>

              <h3 style={{ fontSize: 14, color: '#666', margin: '0 0 8px' }}>
                Timeline · {windowNote}
              </h3>
              {d.timeline.length === 0 ? (
                <p style={EMPTY}>Nothing recorded for this reader in the {windowNote}.</p>
              ) : (
                <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {d.timeline.map((t, i) => (
                        <tr key={`${t.at}-${i}`}>
                          <td style={{ ...TD, width: 150, fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
                            {new Date(t.at).toLocaleString([], {
                              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                            })}
                          </td>
                          <td style={{ ...TD, width: 8, paddingRight: 0 }}>
                            <span
                              aria-hidden
                              style={{
                                display: 'inline-block', width: 7, height: 7, borderRadius: 999,
                                background: t.kind === 'view' ? '#9A6B3F' : t.kind === 'click' ? '#2F6F4E' : '#C4C4C4',
                              }}
                            />
                          </td>
                          <td style={TD}>
                            {t.kind === 'view' ? 'Read ' : ''}{t.label}
                            {t.detail ? (
                              <span style={{ fontSize: 11, color: '#999' }}> · {t.detail}</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {d.truncated && (
                <p style={{ ...EMPTY, marginTop: 8, fontSize: 12 }}>
                  Showing the {TIMELINE_LIMIT} most recent events.
                </p>
              )}
            </>
          )
        })()}
        </>
        ) : broadcastDetail ? null : (
        <>
        {/* ---- who read what ---- */}
        <h2 style={{ fontSize: 18, marginTop: 40, marginBottom: 4 }}>Reader activity</h2>
        <p style={{ ...EMPTY, marginTop: 0, marginBottom: 12 }}>
          Subscribers who clicked through from a dispatch, and what they read once they got here.
          Pick a name for their full timeline. Everyone else on the site stays anonymous.
        </p>
        {readers.length === 0 ? (
          <div style={{ background: '#FBF6EC', border: '1px solid #EADFC8', borderRadius: 8, padding: 16, fontSize: 14, color: '#555' }}>
            No named readers in the {windowNote} yet. Every dispatch link now carries the recipient&rsquo;s
            identity, so this fills in as soon as the <b>next dispatch</b> goes out and someone clicks through.
            Links sent before that are anonymous and can&rsquo;t be backfilled.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <Stat label="Named readers" value={readerTotals.readers.toLocaleString()} />
              <Stat label="Attributed reads" value={readerTotals.identified.toLocaleString()} />
              <Stat
                label="Of all reads"
                value={readerTotals.total ? `${Math.round((readerTotals.identified / readerTotals.total) * 100)}%` : '—'}
              />
            </div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Reader</th>
                    <th style={TH}>Last read</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Opens</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Clicks</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Pages</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Views</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {readers.map((r) => {
                    const name = [r.first_name, r.last_name].filter(Boolean).join(' ')
                    return (
                      <tr key={r.id}>
                        <td style={TD}>
                          <Link
                            href={`/analytics?tab=dispatch&range=${rangeId}&reader=${r.id}`}
                            style={{ color: '#0A0A0A' }}
                          >
                            {name || r.email}
                          </Link>
                          <div style={{ fontSize: 11, color: '#999' }}>
                            {name ? r.email : ''}{name && r.role ? ' · ' : ''}{r.role || ''}
                          </div>
                        </td>
                        <td style={{ ...TD, fontSize: 13 }}>{r.last_path}</td>
                        <td style={NUM}>{r.opens || ''}</td>
                        <td style={NUM}>{r.clicks || ''}</td>
                        <td style={NUM}>{r.pieces}</td>
                        <td style={NUM}>{r.views}</td>
                        <td style={{ ...NUM, fontSize: 12, color: '#666' }}>
                          {new Date(r.last_seen).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {readers.length === 200 && (
              <p style={{ ...EMPTY, marginTop: 8, fontSize: 12 }}>Showing the 200 most active readers.</p>
            )}
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
