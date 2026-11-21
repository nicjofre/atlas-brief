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
import IntroReveal from './IntroReveal'
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
  // The description beside "About us" (2026-11-20) is the whole sentence, so
  // it keeps its leading "Atlas" — the unstripped first paragraph.
  // The three arms' names for the cream banner under the title (2026-11-20),
  // read off the CMS headings so they always match the sections below.
  const arms: string[] = kids
    .filter((n: any) => n?.type === 'heading' && n?.tag === 'h2')
    .map((n: any) => (n.children ?? []).map((c: any) => c?.text ?? '').join('').trim())
    .filter(Boolean)
  // Spruce-up (2026-11-20, Lucas: "free rein"). The headline is rendered as
  // plain text so its closing "three sides." can take the brand red, the way
  // the logo sets "Brief" — it points at the banner of three underneath. If
  // David rewrites the sentence and the phrase goes, it renders all navy.
  const aboutText: string = (firstPara?.children ?? [])
    .map((c: any) => c?.text ?? '')
    .join('')
    .trim()
  const accent = aboutText.match(/^(.*?)(three sides\.?)$/i)
  // What each part does, under its name in the banner. Same wording as the
  // page's meta description; matched on the name so a reorder can't misplace it.
  const role = (name: string) =>
    /brief/i.test(name) ? 'The publication'
    : /builders/i.test(name) ? 'General contractor'
    : /pro\b/i.test(name) ? 'Acquisitions'
    : null
  // One section per side (Lucas, 2026-11-20): the CMS body after its opening
  // sentence is cut at each h2, so every side gets its own heading and the
  // paragraphs under it. A section's slug is its anchor, which the banner links to.
  const sides: { name: string; slug: string; content: any }[] = []
  for (const n of kids.slice(1)) {
    if (n?.type === 'heading' && n?.tag === 'h2') {
      const name = (n.children ?? []).map((c: any) => c?.text ?? '').join('').trim()
      sides.push({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        content: { ...bodyContent, root: { ...bodyContent.root, children: [] } },
      })
    } else if (sides.length) {
      sides[sides.length - 1].content.root.children.push(n)
    }
  }
  const slugOf = (name: string) => sides.find(s => s.name === name)?.slug
  const projects = middleRaw.filter(b => b.blockType === 'projects')
  // Any other blocks between the hero and the sign-off besides the body text
  // and the buildings (none today) still render, after the sides.
  const otherMiddle = middleRaw.filter((b, i) => i !== bodyIdx && b.blockType !== 'projects')
  const about: any =
    kids.length > 1 && bodyContent
      ? { ...bodyContent, root: { ...bodyContent.root, children: [firstPara] } }
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
      {/* "About us" (Lucas, 2026-11-20): the Tape's and Owner's Notes' title —
          bold navy Times on the left, the one-line description beside it
          (about.css .ab-title). The CMS hero ("Atlas") is left out, as on
          Contact; it's still in the CMS.
          BACKUP — the header it replaced ("Atlas | is a Los Angeles…" as one
          sentence). Paste back to restore; delete only after Lucas confirms:
            <div className="ab-headrow">
              <RenderBlocks blocks={hero} />
              {lead && (
                <section className="ab-lead">
                  <div className="wrap">
                    <RichText data={lead as any} />
                  </div>
                </section>
              )}
            </div> */}
      {/* 2026-11-21 (Lucas): the sentence and the names are their own section
          now, on a full-width navy band with white space above it; the page's
          real title section will go in that space later. about.css .ab-intro. */}
      {/* The title section (Lucas, 2026-11-21): "About us at Atlas" in navy,
          centred in the white space above the navy band. about.css .ab-page-title. */}
      {/* .ab-stage (2026-11-21): the title and the navy band share one box so
          the title can stay pinned while the band scrolls up over it.
          IntroReveal slides the band's text in once it's past mid-screen. */}
      <IntroReveal />
      <div className="ab-stage">
      <header className="ab-page-title">
        {/* Lucas, 2026-11-21: framed as a question. Was, in turn: About us at
            Atlas / …and what we do / About us at Atlas and our business */}
        {/* Two lines (Lucas). Was one line. */}
        <h1>What is Atlas?<br />And what is our business?</h1>
      </header>
      <section className="ab-intro ab-reveal-band">
      {/* White up arrow in the navy (Lucas, 2026-11-21); fades as the band
          rises (IntroReveal sets --ab-arrow). Decorative only. */}
      {/* Just the tip, no shaft (Lucas). Was: <path d="M12 20V5M5.5 11.5 12 5l6.5 6.5" /> */}
      <svg className="ab-arrow" viewBox="0 0 24 14" aria-hidden="true">
        <path d="M3 11.5 12 3l9 8.5" />
      </svg>
      <header className="ab-title">
        {/* "About us" off the page (Lucas: "looks out of place"); the page's h1
            is "About us at Atlas" above now. Was: <h1>About us</h1>, then
            briefly a visually hidden <h1 className="ab-sr">About us</h1>. */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {/* Was the CMS paragraph through RichText:
              {about && <div className="ab-about"><RichText data={about as any} /></div>} */}
        {aboutText && (
          <div className="ab-about">
            <p>
              {accent ? <>{accent[1]}<em>{accent[2]}</em></> : aboutText}
            </p>
          </div>
        )}
      </header>
      {/* The three parts in a cream banner under the title (Lucas, 2026-11-20),
          set like their headings further down the page (about.css .ab-arms-banner). */}
      {arms.length > 0 && (
        <div className="ab-arms-banner">
          <ul>
            {/* Was: {arms.map(name => <li key={name}>{name}</li>)} */}
            {/* Each part links down to its section (2026-11-20). */}
            {arms.map(name => {
              const slug = slugOf(name)
              const inner = (
                <>
                  <span className="ab-arm-name">{name}</span>
                  {/* Role line removed (Lucas, 2026-11-20: "they read AI"). Was:
                      {role(name) && <span className="ab-arm-role">{role(name)}</span>} */}
                </>
              )
              return <li key={name}>{slug ? <a href={`#${slug}`}>{inner}</a> : inner}</li>
            })}
          </ul>
        </div>
      )}
      </section>
      </div>
      {/* 2026-11-20 (Lucas): the page as the intro above, then one section per
          side, then the buildings full width at the bottom. Each side: its name
          and role on the left, its text on the right. David's note (the CMS
          sign-off) sits in the Atlas Brief section, since it's about why the
          Brief exists. about.css .ab-sides / .ab-bottom.
          BACKUP — the two-column split it replaces is kept below, switched
          off with `false &&`; delete only after Lucas confirms. */}
      {sides.length > 0 ? (
        <div className="ab-sides" style={{ ['--hand' as string]: hand.style.fontFamily }}>
          {sides.map((s, i) => (
            <section className="ab-side" id={s.slug} key={s.slug || i}>
              <header className="ab-side-head">
                <h2>{s.name}</h2>
                {/* Role line removed (Lucas, 2026-11-20), as in the banner. Was:
                    {role(s.name) && <p className="ab-side-role">{role(s.name)}</p>} */}
              </header>
              <div className="ab-side-body">
                <div className="ab-side-text">
                  <RichText data={s.content} />
                </div>
                {i === 0 && tail.length > 0 && (
                  <div className="ab-side-note">
                    {tail.map((b, j) =>
                      b.blockType === 'prose' && b.content
                        ? <RichText key={j} data={b.content} />
                        : null
                    )}
                  </div>
                )}
              </div>
            </section>
          ))}
          {otherMiddle.length > 0 && <RenderBlocks blocks={otherMiddle} />}
        </div>
      ) : (
        <RenderBlocks blocks={[...tail, ...middle.filter(b => b.blockType !== 'projects')]} />
      )}
      {projects.length > 0 && (
        // The buildings get the intro's treatment (Lucas, 2026-11-21): the
        // heading pinned on white, a full-width CREAM band sliding up over it
        // (a contrast to the navy footer), the card sliding in once the band
        // passes mid-screen. IntroReveal handles every .ab-reveal-band.
        // The heading is not CMS text; David should see it before it ships.
        // Was: <div className="ab-split ab-bottom"> with the h2 above the card,
        // fading in with it.
        <div className="ab-stage">
          {/* The heading moved INTO the cream band, on two lines (Lucas,
              2026-11-21). It was pinned on white above the band:
                <header className="ab-bldgs-title"><h2>We&rsquo;re a part of the
                market, and this is our read of it.</h2></header> */}
          <section className="ab-cream ab-reveal-band">
            <div className="ab-split ab-bottom">
              <h2 className="ab-cream-head">
                We&rsquo;re a part of the market,<br />and this is our read of it.
              </h2>
              <RenderBlocks blocks={projects} />
            </div>
          </section>
        </div>
      )}
      {/* David's sign-off opens the left column (2026-10-07) instead of closing
          the page under both columns: it's why the Brief exists, so it leads
          the arms rather than trailing the buildings. */}
      {false && middle.length > 0 && (
        // --hand carries the handwritten face to about.css for David's
        // signature (2026-11-04); the sign-off is CMS text, so CSS styles it.
        <div className="ab-split" style={{ ['--hand' as string]: hand.style.fontFamily }}>
          <div className="ab-col">
            <RenderBlocks blocks={tail} />
            <RenderBlocks blocks={middle.filter(b => b.blockType !== 'projects')} />
          </div>
          <RenderBlocks blocks={middle.filter(b => b.blockType === 'projects')} />
        </div>
      )}
      {false && middle.length === 0 && <RenderBlocks blocks={tail} />}
      <Footer />
    </>
  )
}
