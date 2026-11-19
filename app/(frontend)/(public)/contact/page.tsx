import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { notFound } from 'next/navigation'
import Footer from '../Footer'
import RenderBlocks from '../_blocks/RenderBlocks'
import { RefreshRouteOnSave } from '../_blocks/RefreshRouteOnSave'
import { getPageBySlug } from '@/lib/getPage'
import ArticleSubscribeBar from '../ArticleSubscribeBar'
import { createClient } from '@/lib/supabase/server'
import { hand } from '../hand-font'
import './contact.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Contact · Atlas Brief',
  description: 'Atlas Home Builders, Inc. — based in Los Angeles. Editorial, construction, and acquisition inquiries.',
  path: '/contact',
})

export default async function ContactPage() {
  const page = await getPageBySlug('contact')
  if (!page) notFound()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <>
      {!user && <ArticleSubscribeBar />}
      <RefreshRouteOnSave />
      {/* --hand carries the handwritten face to contact.css for David's name
          (2026-11-06), the same way About's signature gets it. */}
      <div className="c-page" style={{ ['--hand' as string]: hand.style.fontFamily }}>
        <RenderBlocks blocks={page.layout} />
      </div>
      <Footer />
    </>
  )
}
