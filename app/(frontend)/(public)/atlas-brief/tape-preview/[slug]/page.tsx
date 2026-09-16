import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getArticleBySlug, getArticles } from '@/lib/db/articles'
import { HeadlineText, stripBrokersBlock, statusBadgeKey, statusKicker } from '@/lib/db/article-render'
import { calmHeadline } from '@/lib/db/headline-case'
import { resolveHeroUrl } from '@/lib/db/hero-url'
import { createClient } from '@/lib/supabase/server'
import Footer from '../../../Footer'
import ArticleSubscribeModal from '../../../ArticleSubscribeModal'
import TapeSubscribe from './TapeSubscribe'
import BrokerBlock from '../../[slug]/BrokerBlock'
import { buildBrokerGroups } from '@/lib/db/brokers'
import './tape.css'

// PREVIEW ONLY — the Tape treatment for listing-backed briefs, so it can be
// judged on real deals before it replaces the shared template. Unlinked and
// noindexed, the same way Nic's WSJ preview works.
//
// The two are meant to be siblings: same header shape, same byline row and
// toolbar, same rail, so a reader moving between a dispatch and a brief stays
// in one publication. Where they diverge is the deal itself — a brief opens on
// the numbers an operator scans for, which a dispatch has none of.

export const metadata = { robots: { index: false, follow: false } }

const MONTHS_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']

function apDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS_AP[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

const fmtMoney = (n: number | null | undefined) =>
  n == null ? null : `$${Math.round(n).toLocaleString('en-US')}`
const fmtPct = (n: number | null | undefined) =>
  n == null ? null : `${(n > 1 ? n : n * 100).toFixed(2)}%`

function countHtmlWords(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
}

// Stored captions carry their credit after a middot or "Photo:".
function splitCaption(raw: string | null | undefined): { caption: string | null; credit: string | null } {
  if (!raw) return { caption: null, credit: null }
  const m = raw.match(/^(.*?)(?:\s*[·|]\s*|\s*Photo:\s*)([^·|]+)$/i)
  if (!m) return { caption: raw, credit: null }
  return { caption: m[1].trim() || null, credit: m[2].trim() || null }
}

// Toolbar icons, copied from the dispatch template so the two rows are the same
// controls rather than two drawings of the same idea.
function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11 1.5a2 2 0 1 1 .4 1.2L6 5.6a2 2 0 0 1 0 .8l5.4 2.9a2 2 0 1 1-.5.9L5.5 7.3a2 2 0 1 1 0-2.6L11 1.8v-.3Z"/></svg>
  )
}
function TextIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 3h9v2H6.5v9h-2V5H1V3Zm9.5 4H15v1.6h-1.8V14h-1.7V8.6h-2V7Z"/></svg>
  )
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 1.4a5.6 5.6 0 1 0 0 11.2A5.6 5.6 0 0 0 8 2.4ZM7.3 4h1.4v3.7l2.6 1.5-.7 1.2-3.3-1.9V4Z"/></svg>
  )
}

// David's deal-stats table is the source of truth for the glance. He writes it
// per article — with the sub-lines that give a figure meaning ("closed May 11,
// 2026", "15 x 2BD, 13 x 3BD") — and those are worth more than anything derived
// from the listing columns. The listing is the fallback for briefs with no table.
type Cell = { k: string; v: string; s?: string }

function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

function parseDealStats(html: string | null | undefined): Cell[] {
  if (!html) return []
  const out: Cell[] = []
  for (const chunk of html.split(/<div class="stat">/).slice(1)) {
    const k = /<div class="k">([\s\S]*?)<\/div>/.exec(chunk)?.[1]
    const v = /<div class="v">([\s\S]*?)<\/div>/.exec(chunk)?.[1]
    const sub = /<div class="s">([\s\S]*?)<\/div>/.exec(chunk)?.[1]
    if (!k || !v) continue
    out.push({ k: textOf(k), v: textOf(v), s: sub ? textOf(sub) : undefined })
  }
  return out
}

export default async function TapePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const supabase = await createClient()
  const listing = article.listing
  const p = listing?.property
  const body = stripBrokersBlock(article.body_html)
  const heroUrl = resolveHeroUrl(supabase, article.hero_photo_url ?? listing?.hero_photo_url ?? null)
  const { caption, credit } = splitCaption(article.hero_caption)
  const date = apDate(article.published_at)
  const minutes = Math.max(1, Math.round(countHtmlWords(body) / 230))

  // The glance: David's figures where he's written them, the listing record
  // where he hasn't. Six cells at most — past that it stops being a glance.
  const sold = listing?.status === 'sold'
  const fallback: Cell[] = []
  const add = (k: string, v: string | null | undefined) => { if (v) fallback.push({ k, v }) }
  add(sold ? 'Sale price' : 'Asking', fmtMoney(listing?.sale_price ?? listing?.list_price))
  add('Units', p?.unit_count != null ? String(p.unit_count) : null)
  if ((p?.unit_count ?? 0) > 1) {
    add('Per unit', fmtMoney(listing?.price_per_unit))
    add('Cap rate', fmtPct(listing?.cap_rate_current))
    add('GRM', listing?.grm_current != null ? listing.grm_current.toFixed(1) : null)
  }
  add('Year built', p?.year_built != null ? String(p.year_built) : null)

  const authored = parseDealStats(article.deal_stats_html)
  const ribbon = (authored.length > 0 ? authored : fallback).slice(0, 6)

  type Takeaway = { bold: string; text: string }
  const takeaways = (article.takeaways as Takeaway[] | null) ?? []
  const brokerGroups = buildBrokerGroups(listing, supabase)

  const others = (await getArticles()).filter(c => c.slug !== slug)
  const popular = others.slice(0, 5)
  // Deal cards fill the rail below Most Popular, which runs out long before the
  // article does. Briefs only — a dispatch has no deal to card — and each needs
  // a photo to be worth the space.
  const popularSlugs = new Set(popular.map(c => c.slug))
  const moreDeals = others
    .filter(c => c.kind !== 'post' && c.heroUrl && !popularSlugs.has(c.slug))
    .slice(0, 4)

  return (
    <>
      <ArticleSubscribeModal enabled={false} slug={slug} />
      <div className="tp">
        <header className="tp-head">
          {/* The Tape on the left, the deal's identity on the right: what the
              building is and whether it's traded. */}
          <div className="tp-flag">
            <Link href={`/atlas-brief/sections/${article.section_slug}`}>The Tape</Link>
            <div className="tp-flag-deal">
              {p?.street_address && <span className="tp-address">{p.street_address}</span>}
              {listing?.status && (
                <span className={`tp-badge tp-badge-${statusBadgeKey(listing.status)}`}>
                  {statusKicker(listing.status)}
                </span>
              )}
            </div>
          </div>
          <h1 className="tp-hed"><HeadlineText text={article.headline} /></h1>
          {article.deck && <p className="tp-dek">{article.deck}</p>}

          <div className="tp-byline">
            <div className="tp-by">
              <span>By <b>David Safai</b></span>
              <a href="mailto:David@AtlasBrief.La" className="tp-follow">Follow</a>
            </div>
            {date && <time dateTime={article.published_at ?? undefined}>{date}</time>}
            <div className="tp-tools">
              <TapeSubscribe variant="tool" />
              <button type="button"><ShareIcon />Share</button>
              <button type="button"><TextIcon />Text</button>
              <button type="button"><ClockIcon />{minutes} min read</button>
            </div>
          </div>
        </header>

        {ribbon.length > 0 && (
          <section className="tp-ribbon-wrap">
            <h2 className="tp-ribbon-head">At a glance</h2>
            <div className="tp-ribbon">
              {ribbon.map(f => (
                <div key={f.k}>
                  <dt>{f.k}</dt>
                  <dd>{f.v}</dd>
                  {f.s && <p className="tp-ribbon-sub">{f.s}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="tp-grid">
          {/* First in the DOM, placed into the rail column on desktop. Stacked
              on a phone the rail lands after the article, and the takeaways are
              the one part of it that belongs beside the glance rather than
              after everything. */}
          {takeaways.length > 0 && (
            <section className="tp-takeaways">
              <h2>What matters</h2>
              <ol>
                {takeaways.map((t, i) => (
                  <li key={i}>
                    {t.bold && <b>{t.bold}</b>}
                    {t.text}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="tp-main">
            {heroUrl && (
              <figure className="tp-hero">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroUrl} alt={`${p?.street_address ?? 'Listing'} photo`} width={1600} height={1067} />
                {(caption || credit) && (
                  <figcaption>
                    {caption && <span className="tp-cap">{caption}</span>}
                    {credit && <span className="tp-credit">Photo: {credit}</span>}
                  </figcaption>
                )}
              </figure>
            )}

            {/* The full table, under the photo. The glance up top shows the
                first six of the same figures; this is all of them, in David's
                own markup. Deliberately both — the glance is for someone
                scanning, this is for someone reading. */}
            {article.deal_stats_html && (
              <section className="tp-stats">
                <h2>Deal stats</h2>
                <div
                  className="tp-stats-grid"
                  dangerouslySetInnerHTML={{ __html: article.deal_stats_html }}
                />
              </section>
            )}

            <div className="tp-text" dangerouslySetInnerHTML={{ __html: body }} />


            <div className="tp-signoff">
              <div>
                <p className="tp-writeto">
                  Write to David Safai at <a href="mailto:David@AtlasBrief.La">David@AtlasBrief.La</a>
                </p>
                {date && <p className="tp-appeared">Appeared in the {date} edition of The Tape.</p>}
              </div>
              <TapeSubscribe variant="foot" />
            </div>
          </div>

          <aside className="tp-rail">
            {/* The brokers sit between the takeaways and Most Popular: on a deal
                page they're reference, which is what the rail is for. */}
            {brokerGroups.length > 0 && (
              <section className="tp-brokers">
                <BrokerBlock groups={brokerGroups} />
              </section>
            )}

            {popular.length > 0 && (
              <section className="tp-popular">
                <h2>Most Popular</h2>
                <ol>
                  {popular.map(c => (
                    <li key={c.id}>
                      <Link href={`/atlas-brief/${c.slug}`}>{calmHeadline(c.headline)}</Link>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {moreDeals.length > 0 && (
              <section className="tp-more">
                <h2>More on The Tape</h2>
                <ul>
                  {moreDeals.map(c => {
                    const cp = c.listing?.property
                    return (
                      <li key={c.id}>
                        <Link href={`/atlas-brief/${c.slug}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.heroUrl!} alt="" width={120} height={80} loading="lazy" />
                          <div>
                            <span className="tp-more-kicker">
                              {[statusKicker(c.listing?.status), cp?.neighborhood ?? cp?.city]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                            <span className="tp-more-hed">{calmHeadline(c.headline)}</span>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
      <Footer />
    </>
  )
}
