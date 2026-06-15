import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CONTENT_FIELDS, CONTENT_COLLECTIONS, type PageSlug, type CollectionItem } from '@/lib/content-registry'
import { getAllSavedContent, getAllSavedCollections } from '@/lib/db/content'
import InternalNav from '@/app/InternalNav'
import PagesEditor from './PagesEditor'

export const dynamic = 'force-dynamic'

export default async function PagesAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [saved, savedCollections] = await Promise.all([
    getAllSavedContent(),
    getAllSavedCollections(),
  ])

  // Build the initial value map: for each registered field, prefer the saved
  // override; fall back to the registry default. PagesEditor takes this as its
  // starting state and a parallel "isOverridden" map so David can tell at a
  // glance which fields he's already touched.
  const initialValues: Record<string, string> = {}
  const overridden: Record<string, boolean> = {}
  for (const f of CONTENT_FIELDS) {
    initialValues[f.key] = saved[f.key] ?? f.defaultText
    overridden[f.key] = saved[f.key] !== undefined
  }

  // Same idea for collections: prefer saved items, fall back to registry defaults.
  const initialItems: Record<string, CollectionItem[]> = {}
  const collectionOverridden: Record<string, boolean> = {}
  for (const col of CONTENT_COLLECTIONS) {
    initialItems[col.key] = savedCollections[col.key] ?? col.defaultItems
    collectionOverridden[col.key] = savedCollections[col.key] !== undefined
  }

  // Group fields by page for the tabbed UI.
  const groups: Record<PageSlug, typeof CONTENT_FIELDS> = {
    about: [],
    contact: [],
    build: [],
  }
  for (const f of CONTENT_FIELDS) {
    groups[f.page].push(f)
  }

  // Group collections by page too.
  const collectionGroups: Record<PageSlug, typeof CONTENT_COLLECTIONS> = {
    about: [],
    contact: [],
    build: [],
  }
  for (const col of CONTENT_COLLECTIONS) {
    collectionGroups[col.page].push(col)
  }

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <InternalNav active="pages" />
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 24px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 6 }}>
            Admin
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#111', margin: 0 }}>
            Edit page content
          </h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 8, maxWidth: 640 }}>
            Update the copy on the About, Contact, and Build pages. Each field saves on its own when you
            click Save. Leave a field as the default text (or click Reset) to keep the page&apos;s built-in
            copy.
          </p>
        </div>

        <PagesEditor
          groups={groups}
          initialValues={initialValues}
          initialOverridden={overridden}
          collectionGroups={collectionGroups}
          initialItems={initialItems}
          initialCollectionOverridden={collectionOverridden}
        />
      </div>
    </div>
  )
}
