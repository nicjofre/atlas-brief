// Server-side helper for the editable content_blocks system. Each public page
// (about/contact/build) calls getPageContent(slug) at render time; the helper
// fetches every saved override for that page in one query and merges them
// with the registry defaults from lib/content-registry.

import { createClient } from '@/lib/supabase/server'
import { CONTENT_FIELDS, fieldsForPage, type PageSlug } from '@/lib/content-registry'

export async function getPageContent(page: PageSlug): Promise<Record<string, string>> {
  const fields = fieldsForPage(page)
  if (fields.length === 0) return {}

  const supabase = await createClient()
  const { data } = await supabase
    .from('content_blocks')
    .select('key, body')
    .in('key', fields.map(f => f.key))

  const saved = new Map<string, string>((data ?? []).map(r => [r.key as string, r.body as string]))
  const result: Record<string, string> = {}
  for (const f of fields) {
    result[f.key] = saved.get(f.key) ?? f.defaultText
  }
  return result
}

// Used by the admin page to show current saved values across every field.
export async function getAllSavedContent(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('content_blocks').select('key, body')
  const result: Record<string, string> = {}
  for (const row of data ?? []) {
    result[row.key as string] = row.body as string
  }
  return result
}

export { CONTENT_FIELDS, fieldsForPage }
