import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'
import ListingsTable from './ListingsTable'

export const dynamic = 'force-dynamic'

const LISTINGS_SELECT = `
  id,
  created_at,
  status,
  list_price,
  sale_price,
  sale_date,
  list_date,
  expected_delivery_date,
  expected_delivery_note,
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
`

export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams
  const view: 'active' | 'trash' = sp.view === 'trash' ? 'trash' : 'active'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rowsQuery = supabase
    .from('listings')
    .select(LISTINGS_SELECT)
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: rows, error } =
    view === 'active'
      ? await rowsQuery.is('deleted_at', null)
      : await rowsQuery.not('deleted_at', 'is', null)

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

        <ListingsTable rows={rows ?? []} view={view} />
      </div>
    </div>
  )
}

function Header() {
  return <InternalNav active="listings" />
}
