import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getArticleBySlug } from '@/lib/db/articles'
import { HeadlineText, extractTOCFromHtml } from '@/lib/db/article-render'
import { resolveHeroUrl } from '@/lib/db/hero-url'
import { createClient } from '@/lib/supabase/server'
import './post.css'

type Takeaway = { bold: string; text: string }

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return { title: 'Atlas Brief' }
  const plainHeadline = (article.headline ?? '').replace(/\*/g, '')
  return {
    title: `${plainHeadline} — Atlas Brief`,
    description: article.deck ?? undefined,
  }
}

export default async function PostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const listing = article.listing
  const property = listing?.property
  const takeaways = (article.takeaways as Takeaway[] | null) ?? []
  const toc = extractTOCFromHtml(article.body_html)

  const sectionLabel =
    article.section_slug === 'broker-activity' ? 'Broker Activity' : article.section_slug
  // Per-article override for the eyebrow line; falls back to the section name
  // when an article doesn't override.
  const catLabel = article.cat_label ?? sectionLabel

  const dateline = [property?.city, property?.state].filter(Boolean).join(', ')

  // Resolve hero photo — handles local paths, full URLs, and Supabase storage
  // paths uniformly.
  const supabase = await createClient()
  const heroUrl = resolveHeroUrl(
    supabase,
    article.hero_photo_url ?? listing?.hero_photo_url ?? null
  )

  return (
    <>
      <header className="art-top">
        <div className="wrap">
          <nav className="crumb">
            <Link href="/">
              Atlas <span style={{ color: 'var(--accent)' }}>Home Pro</span>
            </Link>
            <span className="sep">/</span>
            <Link href="/atlas-brief">Atlas Brief</Link>
            <span className="sep">/</span>
            <Link href={`/atlas-brief/sections/${article.section_slug}`}>{sectionLabel}</Link>
            <span className="sep">/</span>
            <span>Entry № {String(article.entry_num).padStart(2, '0')}</span>
          </nav>
          <div className="cat">
            <span className={`badge-${badgeClass(listing?.status)}`}>{badgeLabel(listing?.status)}</span>
            <span>
              {catLabel} · Entry № {String(article.entry_num).padStart(2, '0')}
            </span>
          </div>
          <h1>
            <HeadlineText text={article.headline} />
          </h1>
          {article.deck && <p className="deck">{article.deck}</p>}
          {article.byline_html ? (
            <div className="byl" dangerouslySetInnerHTML={{ __html: article.byline_html }} />
          ) : (
            <div className="byl">
              <div><b>David Safai</b>Editor · Publisher</div>
              <div><b>Published</b>{formatDate(article.published_at)}</div>
              {article.status_tag && <div><b>Status</b>{article.status_tag}</div>}
              {dateline && <div><b>Dateline</b>{dateline}</div>}
            </div>
          )}
        </div>
      </header>

      {heroUrl && (
        <section className="art-lead">
          <div className="wrap">
            <figure className="lead-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroUrl}
                alt={`${property?.street_address ?? 'Listing'} hero photo`}
                width={1600}
                height={1067}
              />
              {article.hero_caption && (
                <figcaption className="cap">{renderHeroCaption(article.hero_caption)}</figcaption>
              )}
            </figure>
          </div>
        </section>
      )}

      {takeaways.length > 0 && (
        <section className="key-takeaways">
          <div className="wrap">
            <div className="kt-card">
              <div className="kt-head">
                {wordForCount(takeaways.length)} takeaways
                {article.takeaways_subhead && <b>{article.takeaways_subhead}</b>}
              </div>
              <ol className="kt-list">
                {takeaways.map((t, i) => (
                  <li key={i}>
                    <b>{t.bold}</b>{t.text}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {article.deal_stats_html && (
        <section className="deal-stats">
          <div className="wrap">
            <div className="stats-head">
              Deal Stats · {property?.street_address ?? '—'}
            </div>
            <div
              className="stats-grid"
              dangerouslySetInnerHTML={{ __html: article.deal_stats_html }}
            />
          </div>
        </section>
      )}

      <section className="art-body">
        <div className="wrap">
          <div className="body-grid">
            {toc.length > 0 && (
              <aside>
                <div className="k">In this piece</div>
                <ol>
                  {toc.map(item => (
                    <li key={item.id}>
                      <a href={`#${item.id}`}>{item.text}</a>
                    </li>
                  ))}
                </ol>
              </aside>
            )}

            <article
              className="prose"
              dangerouslySetInnerHTML={{ __html: article.body_html ?? '' }}
            />
          </div>
        </div>
      </section>

      <section className="author">
        <div className="wrap">
          <div className="author-in">
            <div>
              <div className="k">Written from the field</div>
              <h3>David Safai, operator, developer, GC.</h3>
              <p>
                Atlas Home Pro is a Los Angeles owner-operator and general contractor. If you are
                a broker with a listing you want an honest read on, send the OM and the T-12 to{' '}
                <a
                  href="mailto:David@AtlasHomePro.com"
                  style={{ borderBottom: '1px solid var(--accent)', color: 'var(--ink)' }}
                >
                  David@AtlasHomePro.com
                </a>
                .
              </p>
            </div>
            <div className="btns">
              <a href="mailto:David@AtlasHomePro.com">Send a Listing</a>
              <Link href={`/atlas-brief/sections/${article.section_slug}`}>Back to Board</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap">
          <div>
            &copy; 2026 Atlas Home Pro &middot; <Link href="/atlas-brief">Atlas Brief</Link>
          </div>
          <div>
            Entry № {String(article.entry_num).padStart(2, '0')} &middot; {sectionLabel} &middot;{' '}
            {formatDate(article.published_at)}
          </div>
          <div>
            Los Angeles &middot;{' '}
            <a href="mailto:David@AtlasHomePro.com">David@AtlasHomePro.com</a>
          </div>
        </div>
      </footer>
    </>
  )
}

function badgeClass(status: string | null | undefined): string {
  if (status === 'sold') return 'sold'
  if (status === 'for_sale') return 'forsale'
  return 'forsale'
}

function badgeLabel(status: string | null | undefined): string {
  if (status === 'sold') return 'Sold'
  if (status === 'for_sale') return 'For Sale'
  if (status === 'under_construction') return 'Under Construction'
  return 'Off Market'
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function wordForCount(n: number): string {
  const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  return words[n] ?? String(n)
}

function renderHeroCaption(caption: string) {
  const m = caption.match(/^(FIG\. ?\d+),?\s*(.*)$/i)
  if (!m) return caption
  return (
    <>
      <b>{m[1]}</b>, {m[2]}
    </>
  )
}
