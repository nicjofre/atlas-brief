import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getArticles } from '@/lib/db/articles'
import InternalNav from '@/app/InternalNav'
import DispatchComposer, { type ArticleItem } from './DispatchComposer'

export const dynamic = 'force-dynamic'

export default async function DispatchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const articles = await getArticles()
  const { count } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'subscribed')

  const items: ArticleItem[] = articles.map((a) => ({
    slug: a.slug,
    headline: a.headline,
    deck: a.deck,
    publishedAt: a.published_at,
    status: a.listing?.status ?? null,
    catLabel: a.cat_label,
  }))

  return (
    <>
      <InternalNav active="dispatch" />
      <DispatchComposer articles={items} subscriberCount={count ?? 0} />
    </>
  )
}
