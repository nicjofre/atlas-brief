import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'
import BackfillButton from './BackfillButton'

export const dynamic = 'force-dynamic'

// One-time admin action: default every stale brief's hero to a Google image.
export default async function BackfillPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <InternalNav />
      <div style={{ maxWidth: 720, margin: '32px auto', padding: '0 24px 80px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#111', margin: 0 }}>Backfill Street View heroes</h1>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7, marginTop: 12 }}>
          Sets a default Google hero on every article brief not edited in the last 18 hours:
          Street View where there&rsquo;s coverage (north-facing &mdash; David refines the angle by hand),
          satellite otherwise. This <b>overwrites</b> the current hero, and is reversible per-article via
          &ldquo;Revert to listing photo.&rdquo; Safe to run more than once &mdash; it skips briefs already backfilled.
        </p>
        <BackfillButton />
      </div>
    </div>
  )
}
