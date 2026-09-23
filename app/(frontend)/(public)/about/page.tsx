import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { notFound } from 'next/navigation'
import Footer from '../Footer'
import RenderBlocks from '../_blocks/RenderBlocks'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { RefreshRouteOnSave } from '../_blocks/RefreshRouteOnSave'
import { getPageBySlug } from '@/lib/getPage'
import ArticleSubscribeBar from '../ArticleSubscribeBar'
import { createClient } from '@/lib/supabase/server'
import './about.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'About · Atlas Brief',
  description:
    'Atlas is a Los Angeles real estate practice with three sides: Atlas Brief (publication), Atlas Home Builders, Inc. (general contractor), and Atlas Home Pro (acquisitions).',
  path: '/about',
})

export default async function AboutPage() {
  const page = await getPageBySlug('about')
  if (!page) notFound()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  type Block = NonNullable<typeof page.layout>[number]
  const isTail = (b: Block) => b.blockType === 'prose' && b.variant === 'tail'
  const layout: Block[] = page.layout ?? []
  const hero = layout.filter(b => b.blockType === 'hero')
  const tail = layout.filter(isTail)
  // Everything between the masthead and the sign-off: the arms and the
  // buildings, which the split lays out side by side.
  const middleRaw = layout.filter(b => b.blockType !== 'hero' && !isTail(b))
  const bodyIdx = middleRaw.findIndex(b => b.blockType === 'prose' && !!b.content)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const bodyContent: any =
    bodyIdx >= 0 ? (middleRaw[bodyIdx] as any).content ?? null : null
  const kids: any[] = bodyContent?.root?.children ?? []
  const lead: any =
    kids.length > 1 && bodyContent
      ? { ...bodyContent, root: { ...bodyContent.root, children: kids.slice(0, 1) } }
      : null
  const middle: Block[] =
    lead && bodyContent
      ? middleRaw.map((b: Block, i: number) =>
          i === bodyIdx
            ? ({
                ...b,
                content: { ...bodyContent, root: { ...bodyContent.root, children: kids.slice(1) } },
              } as Block)
            : b
        )
      : middleRaw
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <>
      {!user && <ArticleSubscribeBar />}
      <RefreshRouteOnSave />
      {/* The masthead runs full width, then the body splits: the three arms of
          the practice on the left, the buildings on the right, the way the
          article and Contact pages divide copy from the thing it describes. The
          sign-off closes underneath, full width again. Partitioned here rather
          than in RenderBlocks so the block renderer stays a flat mapper. */}
      <RenderBlocks blocks={hero} />
      {lead && (
        <section className="ab-lead">
          <div className="wrap">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <RichText data={lead as any} />
          </div>
        </section>
      )}
      {middle.length > 0 && (
        <div className="ab-split">
          <RenderBlocks blocks={middle} />
        </div>
      )}
      <RenderBlocks blocks={tail} />
      <Footer />
    </>
  )
}
