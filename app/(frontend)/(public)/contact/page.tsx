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
import ContactReveal from './ContactReveal'
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
      {/* Pins the titles and form while David's navy band slides up over
          them (Lucas, 2026-11-22). Renders nothing. */}
      <ContactReveal />
      {/* --hand carries the handwritten face to contact.css for David's name
          (2026-11-06), the same way About's signature gets it. */}
      <div className="c-page" style={{ ['--hand' as string]: hand.style.fontFamily }}>
        {/* "Contact us" (Lucas, 2026-11-19): bold navy, set and placed like the
            Tape's and Owner's Notes' titles (contact.css .c-title). */}
        <header className="c-title">
          <h1>Contact us</h1>
        </header>
        {/* The header ("Atlas  Los Angeles, California. Operator, Developer,
            GC", the CMS hero block) left out (Lucas, 2026-11-19). The block is
            still in the CMS; pass page.layout unfiltered to bring it back. */}
        <RenderBlocks blocks={(page.layout ?? []).filter(b => b.blockType !== 'hero')} />
      </div>
      <Footer />
    </>
  )
}
