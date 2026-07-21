import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Footer from '../Footer'
import RenderBlocks from '../_blocks/RenderBlocks'
import { RefreshRouteOnSave } from '../_blocks/RefreshRouteOnSave'
import { getPageBySlug } from '@/lib/getPage'
import ArticleSubscribeBar from '../ArticleSubscribeBar'
import { createClient } from '@/lib/supabase/server'
import './contact.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contact · Atlas Brief',
  description: 'Atlas Home Builders, Inc. — based in Los Angeles. Editorial, construction, and acquisition inquiries.',
}

export default async function ContactPage() {
  const page = await getPageBySlug('contact')
  if (!page) notFound()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <>
      {!user && <ArticleSubscribeBar />}
      <RefreshRouteOnSave />
      <RenderBlocks blocks={page.layout} />
      <Footer />
    </>
  )
}
