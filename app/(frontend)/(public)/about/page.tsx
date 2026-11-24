import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { notFound } from 'next/navigation'
import Footer from '../Footer'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { RefreshRouteOnSave } from '../_blocks/RefreshRouteOnSave'
import { getPageBySlug } from '@/lib/getPage'
import ArticleSubscribeBar from '../ArticleSubscribeBar'
import ArticleSubscribeModal from '../ArticleSubscribeModal'
import { createClient } from '@/lib/supabase/server'
import type { Media } from '@/payload-types'
import './about.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'About · Atlas Brief',
  description:
    'Atlas is a Los Angeles real estate practice with three sides: Atlas Brief (publication), Atlas Home Builders, Inc. (general contractor), and Atlas Home Pro (acquisitions).',
  path: '/about',
})

// About, rebuilt "like the paper" (Lucas, 2026-11-23; approved as is). The
// home page's front (front-top.css .ft-grid): the Tape's header with the CMS
// subtitle, the lead sentence as a headline across both columns, the three
// sides in the wide left column, David's note right as "Author note", then
// the buildings as a card row. All content from the CMS except the building
// BLURBS below. Styles: about.css .ap-* (header, buildings) and .aq-*.
// Take 1 (three sides in a row, David in a staff box) was removed once
// Lucas chose; it's in commit c4b76e8. Main's layout is on main and
// backup/contact-about-2026-11-23.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Lexical = { root: { children: any[] } & Record<string, any> } & Record<string, any>
const withChildren = (doc: Lexical, children: any[]): Lexical => ({ ...doc, root: { ...doc.root, children } })

// Red in the titles, like the logo (Lucas, 2026-11-23): "Atlas" stays dark,
// everything after it is red ("Atlas Brief", "Atlas Home Pro"). A title
// without "Atlas" goes first word dark, the rest red ("Author note").
function TwoTone({ text }: { text: string }) {
  const m = text.match(/^(Atlas)\s+(.+)$/) || text.match(/^(\S+)\s+(.+)$/)
  if (!m) return <>{text}</>
  return <>{m[1]} <span className="ap-red">{m[2]}</span></>
}
// One side: its h2 drawn here (so it can be two-toned), the rest via RichText.
function Side({ doc, nodes }: { doc: Lexical; nodes: any[] }) {
  const [first, ...rest] = nodes
  const isHeading = first?.type === 'heading'
  const title = isHeading ? (first.children ?? []).map((c: any) => c.text ?? '').join('') : ''
  return (
    <>
      {isHeading && <h2><TwoTone text={title} /></h2>}
      <RichText data={withChildren(doc, isHeading ? rest : nodes) as any} />
    </>
  )
}

export default async function AboutPage() {
  const page = await getPageBySlug('about')
  if (!page) notFound()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const layout = page.layout ?? []
  const body = layout.find(b => b.blockType === 'prose' && b.variant !== 'tail') as any
  const tail = layout.find(b => b.blockType === 'prose' && b.variant === 'tail') as any
  const projects = layout.find(b => b.blockType === 'projects') as any

  // The body: a lead paragraph, then one h2 + text per side.
  const doc: Lexical | null = body?.content ?? null
  const kids: any[] = doc?.root?.children ?? []
  const firstHeading = kids.findIndex(n => n.type === 'heading')
  const leadNodes = firstHeading > 0 ? kids.slice(0, firstHeading) : []
  const leadText = leadNodes
    .flatMap(n => n.children ?? [])
    .map((c: any) => c.text ?? '')
    .join('')
    .trim()
  const sides: any[][] = []
  for (const n of firstHeading >= 0 ? kids.slice(firstHeading) : kids) {
    if (n.type === 'heading' || sides.length === 0) sides.push([n])
    else sides[sides.length - 1].push(n)
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // The building descriptions as Lucas rewrote them (commit 4d44343,
  // 2026-11-21; brought back 2026-11-23). In code, not the CMS; David to
  // approve. CMS text was: "A 43-unit, five-story residential building
  // developed, built, and held by Atlas. Designed around a single organizing
  // principle: no unit plan exists that the sponsor wouldn't live in." and
  // "Twelve for-sale homes in a mid-Wilshire infill. A thoughtful building
  // envelope with large units averaging 1,500-1,700 square feet."
  const BLURBS: Record<string, string> = {
    'The Felix on Fairfax':
      'The Felix is a 43-unit residential building developed, built and operated by Atlas. The five-story building was designed with one ideal in mind: every unit should be one the builder would love to live in.',
    'Olympic Towers':
      'A 12-unit building of large, comfortable homes, with units averaging 1,500 to 1,700 square feet.',
  }

  // The buildings. Stats (Units, Stories, ...) taken off (Lucas,
  // 2026-11-23); they're still in the CMS.
  const buildings = projects?.items?.length > 0 && (
    <section className="aq-build">
      {projects.heading && <h2 className="ap-build-hed">{projects.heading}</h2>}
      <div className="ap-projects">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {projects.items.map((item: any, i: number) => {
          const photo = item.photo && typeof item.photo === 'object' ? (item.photo as Media) : null
          return (
            <article key={item.id || i} className="ap-project">
              {photo?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt={photo.alt || ''} loading="lazy" width={1200} height={675} />
              )}
              <h3>{item.name}</h3>
              {/* Category line ("Multifamily, Ground-up") removed (Lucas,
                  2026-11-23); still in the CMS. Was:
                  <p className="ap-cat">{item.category}</p> */}
              {(BLURBS[item.name] || item.blurb) && (
                <p className="ap-blurb">{BLURBS[item.name] || item.blurb}</p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )

  // The header's description is the CMS subtitle; the lead sentence is the
  // headline, the sides the left column, David's note the right.
  const hero = layout.find(b => b.blockType === 'hero') as { subtitle?: string | null } | undefined
  return (
    <>
      {!user && <ArticleSubscribeBar />}
      {/* The pop-up too, as on the front page and articles. Contact is the one
          reader-facing page without it. */}
      {!user && <ArticleSubscribeModal enabled slug="about" />}
      <RefreshRouteOnSave />
      <header className="ap-head">
        <h1>About us</h1>
        {hero?.subtitle && <p className="ap-about">{hero.subtitle}</p>}
      </header>
      <main className="ap-main aq-main">
        <div className="aq-grid">
          {/* The headline spans both columns so it holds to one line (Lucas,
              2026-11-23); it sat in the lead column and wrapped. */}
          {leadText && <h2 className="aq-lead-hed">{leadText}</h2>}
          <article className="aq-lead">
            {/* Lucas's title (2026-11-23), set as a Times section head. */}
            {/* All navy with an underline (Lucas, 2026-11-23); was "note" in red. */}
            {tail?.content && <h2 className="ap-build-hed aq-note-hed">Author note</h2>}
            {tail?.content && (
              <div className="aq-dek">
                <RichText data={tail.content} />
              </div>
            )}
          </article>
          {doc && sides.length > 0 && (
            <section className="aq-news" aria-label="The three sides of Atlas">
              {sides.map((nodes, i) => (
                <article key={i} className="aq-item">
                  <Side doc={doc} nodes={nodes} />
                </article>
              ))}
            </section>
          )}
        </div>
        {buildings}
      </main>
      <Footer />
    </>
  )
}
