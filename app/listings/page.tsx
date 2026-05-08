import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { compactDollars, date, num, pct } from '@/lib/format'
import SignOutButton from '@/app/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function ListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows, error } = await supabase
    .from('listings')
    .select(`
      id,
      created_at,
      status,
      list_price,
      sale_price,
      sale_date,
      list_date,
      cap_rate_current,
      grm_current,
      price_per_unit,
      property:properties (
        id,
        street_address,
        city,
        state,
        zip,
        submarket,
        year_built,
        unit_count
      ),
      listing_broker:brokers!listing_broker_id (
        id,
        name,
        firm
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <Header />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#111', margin: 0 }}>
            Database
          </h1>
          <Link href="/dashboard" style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', textDecoration: 'none' }}>
            + New Input
          </Link>
        </div>

        {error && (
          <div style={{ padding: 16, background: '#fee', color: '#c0392b', borderRadius: 4, fontSize: 13, marginBottom: 24 }}>
            Error loading listings: {error.message}
          </div>
        )}

        {!rows || rows.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 4 }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>No listings parsed yet.</div>
            <Link href="/dashboard" style={{ padding: '10px 20px', background: '#111', color: '#fff', textDecoration: 'none', borderRadius: 4, fontSize: 13 }}>
              Parse your first deal
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #eee', borderRadius: 4, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #111', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Address</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Submarket</th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>Year</th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>Units</th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>Price</th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>$/Door</th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>CAP</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Broker</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const p = r.property
                const b = r.listing_broker
                const headlinePrice = r.sale_price ?? r.list_price
                const headlineDate = r.sale_date ?? r.list_date ?? r.created_at
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusPill status={r.status} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/listings/${r.id}`} style={{ color: '#111', textDecoration: 'none', fontWeight: 500 }}>
                        {p?.street_address ?? '—'}
                      </Link>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        {[p?.city, p?.state, p?.zip].filter(Boolean).join(', ')}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#444' }}>{p?.submarket ?? '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p?.year_built ?? '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{num(p?.unit_count)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>{compactDollars(headlinePrice)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{compactDollars(r.price_per_unit)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{pct(r.cap_rate_current)}</td>
                    <td style={{ padding: '12px 16px', color: '#666', fontSize: 12 }}>{date(headlineDate)}</td>
                    <td style={{ padding: '12px 16px', color: '#666', fontSize: 12 }}>
                      {b?.name ?? '—'}
                      {b?.firm && <div style={{ fontSize: 11, color: '#999' }}>{b.firm}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Header() {
  return (
    <div style={{ borderBottom: '1px solid #ddd', padding: '16px 32px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <Link href="/listings" style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#111', textDecoration: 'none' }}>
          Atlas <em>Brief</em>
        </Link>
        <Link href="/listings" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#666', textDecoration: 'none' }}>Database</Link>
        <Link href="/dashboard" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#666', textDecoration: 'none' }}>Input</Link>
      </div>
      <SignOutButton />
    </div>
  )
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: '#bbb' }}>—</span>
  const bg = status === 'sold' ? '#c0392b' : status === 'for_sale' ? '#27ae60' : '#7f8c8d'
  const label = status === 'sold' ? 'Sold' : status === 'for_sale' ? 'For Sale' : 'Off Market'
  return (
    <span style={{ padding: '3px 8px', borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', background: bg, color: '#fff' }}>
      {label}
    </span>
  )
}
