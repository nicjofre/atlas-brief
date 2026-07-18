import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'
import ImageCheck, { type Prop } from './ImageCheck'

export const dynamic = 'force-dynamic'

// Internal tool to eyeball what Google's Street View / Satellite APIs return for
// real properties, before we lean on them as a hero-image source. Needs
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (referrer-restricted).
export default async function ImageCheckPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('listings_active')
    .select('property:properties(street_address, city, state, lat, lng)')
    .order('updated_at', { ascending: false })
    .limit(18)

  const props: Prop[] = (data ?? [])
    .map((r) => (r.property as unknown as { street_address: string | null; city: string | null; state: string | null; lat: number | null; lng: number | null } | null))
    .filter((p): p is NonNullable<typeof p> => !!p?.street_address)
    .map((p) => ({
      address: [p.street_address, p.city, p.state].filter(Boolean).join(', '),
      lat: p.lat,
      lng: p.lng,
    }))

  const hasKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  return (
    <>
      <InternalNav />
      <ImageCheck props={props} hasKey={hasKey} />
    </>
  )
}
