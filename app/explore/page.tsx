import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'
import ExploreClient from './ExploreClient'

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: savedReportsRaw } = await supabase
    .from('saved_reports')
    .select('id, name, question, sql, viz, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  const savedReports = (savedReportsRaw ?? []).map(r => ({
    id: r.id,
    name: r.name,
    question: r.question,
    sql: r.sql,
    viz: r.viz as { type: 'bar' | 'line' | 'kpi' | 'table'; x?: string | null; y?: string | null } | null,
    created_at: r.created_at,
  }))

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <Header />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#111', margin: 0 }}>
            Explore
          </h1>
        </div>
        <ExploreClient savedReports={savedReports} />
      </div>
    </div>
  )
}

function Header() {
  return <InternalNav active="explore" />
}
