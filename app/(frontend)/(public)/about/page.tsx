import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { notFound } from 'next/navigation'
import Footer from '../Footer'
import RenderBlocks from '../_blocks/RenderBlocks'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { RefreshRouteOnSave } from '../_blocks/RefreshRouteOnSave'
import { getPageBySlug } from '@/lib/getPage'
import ArticleSubscribeBar from '../ArticleSubscribeBar'
import ArticleSubscribeModal from '../ArticleSubscribeModal'
import { createClient } from '@/lib/supabase/server'
import { hand } from '../hand-font'
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
  // Unused while the header is commented out (2026-11-19); kept for it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // The lede continues the title (2026-11-04, Lucas): "Atlas" is the h1, so a
  // leading "Atlas " comes off the sentence's first text node here and the
  // line reads "Atlas | is a Los Angeles real estate practice…". The CMS text
  // keeps its "Atlas"; if it ever stops starting with it, nothing is removed.
  const firstPara = kids[0]
  const firstText = firstPara?.children?.[0]
  const ledePara =
    firstText && typeof firstText.text === 'string' && /^Atlas\s+/.test(firstText.text)
      ? {
          ...firstPara,
          children: [
            { ...firstText, text: firstText.text.replace(/^Atlas\s+/, '') },
            ...firstPara.children.slice(1),
          ],
        }
      : firstPara
  const lead: any =
    kids.length > 1 && bodyContent
      ? { ...bodyContent, root: { ...bodyContent.root, children: [ledePara] } }
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
  // 2026-11-19 (Lucas): the three arms in columns, one each. The body is one
  // rich-text block in the CMS, so it's split here at each heading into its
  // own group; the CMS is untouched. Anything before the first heading stays
  // a group of its own at the start.
  const bodyKids: any[] = bodyIdx >= 0 ? ((middle[bodyIdx] as any).content?.root?.children ?? []) : []
  const armGroups: any[][] = []
  for (const node of bodyKids) {
    if (node?.type === 'heading' || armGroups.length === 0) armGroups.push([])
    armGroups[armGroups.length - 1].push(node)
  }
  const armsAsColumns = armGroups.length > 1 && bodyContent
  // 2026-11-19 (Lucas): the Atlas Brief arm moves into the cream panel, under
  // a ribbon with the site's Atlas Brief wordmark (replacing "From David"). It's
  // found by its heading text, so the order in the CMS doesn't matter; its own
  // heading is dropped since the ribbon names it. The other arms stay columns.
  const headingText = (n: any): string =>
    (n?.children ?? []).map((c: any) => c?.text ?? '').join('').trim()
  const briefIdx = armGroups.findIndex(g => g[0]?.type === 'heading' && /^Atlas Brief$/i.test(headingText(g[0])))
  const briefBodyRaw: any[] = briefIdx >= 0 ? armGroups[briefIdx].slice(1) : []
  // "The publication you are reading." taken off the front of the first
  // paragraph (Lucas, 2026-11-19); the CMS text is unchanged. If David rewords
  // it, nothing is stripped.
  const OPENER = /^The publication you are reading\.\s*/
  const firstNode = briefBodyRaw[0]
  const firstLeaf = firstNode?.children?.[0]
  const briefBody: any[] =
    firstLeaf && typeof firstLeaf.text === 'string' && OPENER.test(firstLeaf.text)
      ? [
          {
            ...firstNode,
            children: [{ ...firstLeaf, text: firstLeaf.text.replace(OPENER, '') }, ...firstNode.children.slice(1)],
          },
          ...briefBodyRaw.slice(1),
        ]
      : briefBodyRaw
  const otherArms = briefIdx >= 0 ? armGroups.filter((_, i) => i !== briefIdx) : armGroups
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <>
      {!user && <ArticleSubscribeBar />}
      {/* The pop-up too, as on the front page and articles. Contact is the one
          reader-facing page without it — interrupting someone mid-enquiry is
          the definition of intrusive. */}
      {!user && <ArticleSubscribeModal enabled slug="about" />}
      <RefreshRouteOnSave />
      {/* The masthead runs full width, then the body splits: the three arms of
          the practice on the left, the buildings on the right, the way the
          article and Contact pages divide copy from the thing it describes. The
          sign-off closes underneath, full width again. Partitioned here rather
          than in RenderBlocks so the block renderer stays a flat mapper. */}
      {/* .ab-headrow (2026-11-04): the title and the lede side by side, the
          Tape's header. Before, the two stacked centred, with no wrapper:
            <RenderBlocks blocks={hero} />
            {lead && (<section className="ab-lead">…</section>)} */}
      {/* COMMENTED OUT 2026-11-19 (Lucas: remove the "Atlas is a Los Angeles
          real estate practice with three sides." header for now, he has an
          idea for it). Uncomment to bring it back:
      <div className="ab-headrow">
        <RenderBlocks blocks={hero} />
        {lead && (
          <section className="ab-lead">
            <div className="wrap">
              <RichText data={lead as any} />
            </div>
          </section>
        )}
      </div>
      */}
      {/* David's sign-off opens the left column (2026-10-07) instead of closing
          the page under both columns: it's why the Brief exists, so it leads
          the arms rather than trailing the buildings. */}
      {middle.length > 0 && (
        // --hand carries the handwritten face to about.css for David's
        // signature (2026-11-04); the sign-off is CMS text, so CSS styles it.
        // 2026-11-19 (Lucas): stacked instead of split. David's note, then the
        // three arms as three columns, then the buildings along the bottom in
        // a row (about.css .ab-split.is-stacked). Was: the note and the arms in
        // the left column, the buildings stacked in the right.
        <div className="ab-split is-stacked" style={{ ['--hand' as string]: hand.style.fontFamily }}>
          <div className="ab-col">
            {/* David's note in the cream panel with the navy ribbon, "From
                David" (Lucas, 2026-11-19). Both moved here from the buildings,
                which now open with a plain heading (about.css). */}
            {/* 2026-11-19 (Lucas): the ribbon carries the Atlas Brief wordmark
                (was "From David"), and the panel holds the Atlas Brief arm's
                description above David's note. */}
            <div className="ab-from-david">
              <h2 className="ab-band ab-band-brand">
                <span><span className="ab-brand">Atlas <em>Brief</em></span></span>
              </h2>
              {armsAsColumns && briefBody.length > 0 && (
                <section className="ab-body ab-brief-body">
                  <div className="wrap">
                    <div className="prose">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <RichText data={{ ...bodyContent, root: { ...bodyContent.root, children: briefBody } } as any} />
                    </div>
                  </div>
                </section>
              )}
              <RenderBlocks blocks={tail} />
            </div>
            {armsAsColumns ? (
              <>
                <section className="ab-body ab-arms-cols">
                  <div className="wrap">
                    {otherArms.map((group, i) => (
                      <div className="prose ab-arm" key={i}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <RichText data={{ ...bodyContent, root: { ...bodyContent.root, children: group } } as any} />
                      </div>
                    ))}
                  </div>
                </section>
                <RenderBlocks blocks={middle.filter((b, i) => b.blockType !== 'projects' && i !== bodyIdx)} />
              </>
            ) : (
              <RenderBlocks blocks={middle.filter(b => b.blockType !== 'projects')} />
            )}
          </div>
          <RenderBlocks blocks={middle.filter(b => b.blockType === 'projects')} />
        </div>
      )}
      {middle.length === 0 && <RenderBlocks blocks={tail} />}
      <Footer />
    </>
  )
}
