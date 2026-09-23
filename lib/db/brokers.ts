import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArticleWithJoins } from '@/lib/db/articles'
import type { Database, Tables } from '@/lib/db/types'
import { resolveHeroUrl } from '@/lib/db/hero-url'
import type { BrokerCard, BrokerGroup } from '@/app/(frontend)/(public)/atlas-brief/[slug]/BrokerBlock'

// Moved out of the article page (2026-09-16) so the Tape preview template can
// build the same roster from the same rules rather than growing a second
// implementation that drifts.

export function toBrokerCard(
  b: Tables<'brokers'>,
  supabase: SupabaseClient<Database>
): BrokerCard {
  return {
    name: b.name,
    title: b.title,
    firm: b.firm,
    phone: b.phone ?? b.cell,
    email: b.email,
    dre: b.dre_license,
    headshotUrl: resolveHeroUrl(supabase, b.headshot_url),
    logoUrl: resolveHeroUrl(supabase, b.firm_logo_url),
  }
}

// Build the labeled broker groups for the article card from the listing's
// roster. Dual agency (a broker on both sides) collapses into a single
// "Buyer & Listing Broker" group so the same person isn't shown twice.
export function buildBrokerGroups(
  listing: ArticleWithJoins['listing'] | null | undefined,
  supabase: SupabaseClient<Database>
): BrokerGroup[] {
  // Prefer the join table; fall back to the FK columns for listings not yet
  // backfilled (and so new parses that only set the FKs still render).
  let rows = (listing?.listing_brokers ?? [])
    .filter(r => r.broker)
    .map(r => ({ role: r.role, order: r.sort_order, broker: r.broker as Tables<'brokers'> }))

  if (rows.length === 0 && listing) {
    if (listing.listing_broker) rows.push({ role: 'listing', order: 0, broker: listing.listing_broker })
    if (listing.buyer_broker) rows.push({ role: 'buyer', order: 0, broker: listing.buyer_broker })
  }

  // Roles per broker → detect dual agency (both sides).
  const roleSets = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!roleSets.has(r.broker.id)) roleSets.set(r.broker.id, new Set())
    roleSets.get(r.broker.id)!.add(r.role)
  }

  const seen = new Set<string>()
  const dual: typeof rows = []
  const listingOnly: typeof rows = []
  const buyerOnly: typeof rows = []
  for (const r of rows) {
    const roles = roleSets.get(r.broker.id)!
    const isDual = roles.has('listing') && roles.has('buyer')
    if (isDual) {
      if (seen.has(r.broker.id)) continue // one card for a dual-agency broker
      seen.add(r.broker.id)
      dual.push(r)
    } else if (r.role === 'listing') listingOnly.push(r)
    else buyerOnly.push(r)
  }

  const sortAndMap = (list: typeof rows) =>
    list
      .sort((a, b) => a.order - b.order)
      .map(r => toBrokerCard(r.broker, supabase))
      .filter(b => b.name || b.firm)

  const label = (base: string, n: number) => (n > 1 ? `${base}s` : base)

  const groups: BrokerGroup[] = []
  if (dual.length) groups.push({ key: 'dual', label: label('Buyer & Listing Broker', dual.length), brokers: sortAndMap(dual) })
  if (listingOnly.length) groups.push({ key: 'listing', label: label('Listing Broker', listingOnly.length), brokers: sortAndMap(listingOnly) })
  if (buyerOnly.length) groups.push({ key: 'buyer', label: label('Buyer Broker', buyerOnly.length), brokers: sortAndMap(buyerOnly) })
  return groups.filter(g => g.brokers.length > 0)
}
