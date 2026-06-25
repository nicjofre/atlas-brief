import { redirect } from 'next/navigation'
import { Client } from 'pg'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'

export const dynamic = 'force-dynamic'

type PostRow = {
  headline: string
  slug: string
  total: number
  uniques: number
  last7: number
  email_src: number
  direct_src: number
  social_src: number
  other_src: number
}
type Totals = { total_views: number; unique_readers: number; last7: number }
type BroadcastRow = { broadcast_id: string; first_seen: string; delivered: number; opens: number; clicks: number }
type LinkRow = { link: string; clicks: number }
type EmailTotals = { delivered: number; opens: number; clicks: number; untracked: number }

async function loadAnalytics() {
  const c = new Client({ connectionString: process.env.DATABASE_URI })
  await c.connect()
  try {
    const [posts, totals, broadcasts, links, emailCount, emailTotals] = await Promise.all([
      c.query<PostRow>(`
        select coalesce(a.headline, pv.slug) as headline, pv.slug,
          count(*)::int total,
          count(distinct pv.visitor_hash)::int uniques,
          count(*) filter (where pv.viewed_at > now() - interval '7 days')::int last7,
          count(*) filter (where pv.source = 'email')::int email_src,
          count(*) filter (where pv.source = 'direct')::int direct_src,
          count(*) filter (where pv.source = 'social')::int social_src,
          count(*) filter (where pv.source = 'other' or pv.source is null)::int other_src
        from post_views pv
        left join articles a on a.slug = pv.slug
        group by pv.slug, a.headline
        order by total desc
        limit 100`),
      c.query<Totals>(`
        select count(*)::int total_views,
          count(distinct visitor_hash)::int unique_readers,
          count(*) filter (where viewed_at > now() - interval '7 days')::int last7
        from post_views`),
      c.query<BroadcastRow>(`
        select broadcast_id, min(created_at) first_seen,
          count(*) filter (where type = 'delivered')::int delivered,
          count(distinct email) filter (where type = 'opened')::int opens,
          count(distinct email) filter (where type = 'clicked')::int clicks
        from email_events where broadcast_id is not null
        group by broadcast_id order by min(created_at) desc limit 50`),
      c.query<LinkRow>(`
        select link, count(*)::int clicks from email_events
        where type = 'clicked' and link is not null
        group by link order by clicks desc limit 30`),
      c.query<{ n: number }>(`select count(*)::int n from email_events`),
      c.query<EmailTotals>(`
        select
          count(*) filter (where type = 'delivered')::int delivered,
          count(distinct email) filter (where type = 'opened')::int opens,
          count(distinct email) filter (where type = 'clicked')::int clicks,
          count(*) filter (where broadcast_id is null)::int untracked
        from email_events`),
    ])
    return {
      posts: posts.rows,
      totals: totals.rows[0] ?? { total_views: 0, unique_readers: 0, last7: 0 },
      broadcasts: broadcasts.rows,
      links: links.rows,
      hasEmail: (emailCount.rows[0]?.n ?? 0) > 0,
      emailTotals: emailTotals.rows[0] ?? { delivered: 0, opens: 0, clicks: 0, untracked: 0 },
    }
  } finally {
    await c.end().catch(() => {})
  }
}

function dealFromLink(link: string): string {
  const m = link.match(/\/atlas-brief\/([a-z0-9-]+)/i)
  return m ? m[1] : link
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

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { posts, totals, broadcasts, links, hasEmail, emailTotals } = await loadAnalytics()

  return (
    <>
      <InternalNav active="analytics" />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', fontFamily: 'Georgia, serif' }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Analytics</h1>

        {/* Reader top-line */}
        <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
          <Stat label="Total reads" value={totals.total_views.toLocaleString()} />
          <Stat label="Unique readers" value={totals.unique_readers.toLocaleString()} />
          <Stat label="Reads, last 7 days" value={totals.last7.toLocaleString()} />
        </div>

        {/* Posts */}
        <h2 style={{ fontSize: 18, marginTop: 36, marginBottom: 8 }}>By post</h2>
        {posts.length === 0 ? (
          <p style={{ color: '#999', fontSize: 14 }}>No reads recorded yet. Views start counting once the new build is live.</p>
        ) : (
          <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Post</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Reads</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Unique</th>
                  <th style={{ ...TH, textAlign: 'right' }}>7d</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Email</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Direct</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Social</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Other</th>
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
                    <td style={NUM}>{p.last7}</td>
                    <td style={NUM}>{p.email_src || ''}</td>
                    <td style={NUM}>{p.direct_src || ''}</td>
                    <td style={NUM}>{p.social_src || ''}</td>
                    <td style={NUM}>{p.other_src || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Email engagement */}
        <h2 style={{ fontSize: 18, marginTop: 36, marginBottom: 8 }}>Dispatch engagement</h2>
        {!hasEmail ? (
          <div style={{ background: '#FBF6EC', border: '1px solid #EADFC8', borderRadius: 8, padding: 16, fontSize: 14, color: '#555' }}>
            No email engagement yet. This fills in once the <b>Resend webhook</b> is connected (in Resend: Webhooks → add{' '}
            <code>https://atlasbrief.la/api/webhooks/resend</code>, then set <code>RESEND_WEBHOOK_SECRET</code>) and a dispatch goes out.
          </div>
        ) : (
          <>
            {/* Email top-line — counts every event, including one-off test sends
                that have no broadcast_id and so never reach the table below. */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <Stat label="Delivered" value={emailTotals.delivered.toLocaleString()} />
              <Stat label="Opens" value={emailTotals.opens.toLocaleString()} />
              <Stat label="Clicks" value={emailTotals.clicks.toLocaleString()} />
            </div>

            {broadcasts.length === 0 ? (
              <p style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>
                No full dispatches sent yet — the per-dispatch breakdown fills in once you
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
                        <tr key={l.link}>
                          <td style={TD}>{dealFromLink(l.link)}</td>
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
      </div>
    </>
  )
}
