import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/app/SignOutButton'
import ExploreClient from './ExploreClient'

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: savedReports } = await supabase
    .from('saved_reports')
    .select('id, name, question, sql, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <Header />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#111', margin: 0 }}>
            Explore
          </h1>
        </div>
        <ExploreClient savedReports={savedReports ?? []} />
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
        <Link href="/explore" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#111', textDecoration: 'none', borderBottom: '2px solid #111', paddingBottom: 2 }}>Explore</Link>
        <Link href="/dashboard" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#666', textDecoration: 'none' }}>Input</Link>
      </div>
      <SignOutButton />
    </div>
  )
}
