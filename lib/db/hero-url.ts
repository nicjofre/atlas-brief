import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type DB = SupabaseClient<Database>

/**
 * Resolve a hero_photo_url value into a browser-loadable URL.
 *
 * The same column holds three shapes:
 *  - A local /public/ path     ("/images/brief/foo.jpg") — render as-is
 *  - A full http(s) URL        (uploads via HeroPhotoEditor → getPublicUrl)
 *  - A Supabase storage path   ("listing/<id>/hero-123.jpg" from PhotosForm)
 *
 * We normalize storage paths to their public URL since the property-assets
 * bucket is public. Safe to call from server or client components — it's a
 * pure function that uses only the Supabase client's URL builder.
 */
export function resolveHeroUrl(db: DB, value: string | null | undefined): string | null {
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value
  }
  const { data: { publicUrl } } = db.storage.from('property-assets').getPublicUrl(value)
  return publicUrl
}
