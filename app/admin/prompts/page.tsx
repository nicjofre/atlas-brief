import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PromptsWorkspace, { type Prompt, type Surface } from './PromptsWorkspace'
import TestPanel from './TestPanel'
import InternalNav from '@/app/InternalNav'

export const dynamic = 'force-dynamic'

export default async function PromptsAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: prompts, error } = await supabase
    .from('prompts')
    .select('id, key, sort_order, description, body, category, surface, version_history')
    .order('sort_order', { ascending: true })

  if (error) {
    return (
      <PageShell>
        <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fee', border: '1px solid #fcc', borderRadius: 4, color: '#c0392b', fontSize: 13 }}>
          Error loading prompts: {error.message}
        </div>
      </PageShell>
    )
  }

  // Coerce the jsonb version_history into the typed shape the workspace expects.
  const validSurfaces: Surface[] = ['shared', 'tape_1', 'tape_2', 'tape_3', 'broker_email', 'system']
  const typed: Prompt[] = (prompts ?? []).map(p => ({
    id: p.id,
    key: p.key,
    sort_order: p.sort_order,
    description: p.description ?? '',
    body: p.body,
    category: (p.category === 'system' ? 'system' : 'content') as 'content' | 'system',
    surface: (validSurfaces.includes(p.surface as Surface) ? p.surface : 'shared') as Surface,
    version_history: Array.isArray(p.version_history)
      ? (p.version_history as Array<{ body: string; at: string; by: string | null }>)
      : [],
  }))

  // Listings dropdown for the test panel — newest first, capped so the
  // dropdown stays manageable.
  const { data: listingRows } = await supabase
    .from('listings_active')
    .select('id, property:properties (street_address, city)')
    .order('updated_at', { ascending: false })
    .limit(50)
  const listings = (listingRows ?? [])
    .filter((l): l is typeof l & { id: string } => !!l.id)
    .map(l => {
      const p = (l.property as { street_address: string | null; city: string | null } | null) ?? null
      const label = [p?.street_address, p?.city].filter(Boolean).join(', ') || l.id
      return { id: l.id, label }
    })

  return (
    <PageShell>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 64px' }}>
        <div style={{ marginBottom: 6, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F' }}>
          Admin · Prompts
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#111', margin: '0 0 6px' }}>
          Article generation prompts
        </h1>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.55, margin: '0 0 24px', maxWidth: '72ch' }}>
          Sections below are assembled, in order, into the system prompt sent to Claude. Edit any
          section and save; the next draft reflects the change. Each save snapshots the prior body
          to <code>version_history</code> so you can revert if a tweak goes wrong.
        </p>
        <PromptsWorkspace initial={typed} />
        <TestPanel listings={listings} />
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <InternalNav active="prompts" />
      {children}
    </div>
  )
}
