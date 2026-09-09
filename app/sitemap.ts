import type { MetadataRoute } from 'next'
import { getArticles } from '@/lib/db/articles'
import { SITE_URL } from '@/lib/seo/site'

// Served at /sitemap.xml.
//
// getArticles() reads BOTH content stores — Tape briefs from Supabase and
// freeform posts from Payload, bridged in at lib/db/articles.ts. That matters
// here: a sitemap built off either store alone would silently omit the other
// half of the catalogue. If this file ever emits only the brief count or only
// the post count, the bridge is what broke.
//
// Revalidate hourly: this reads two databases, and crawlers refetch the sitemap
// far more often than the catalogue changes.
export const revalidate = 3600

// Reader-facing routes that aren't articles. The editorial app is excluded
// here and disallowed in robots.ts.
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/atlas-brief', priority: 0.9, changeFrequency: 'daily' },
  { path: '/about', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/contact', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/tax-appeals', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/survival-guide', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/rso-briefing', priority: 0.6, changeFrequency: 'monthly' },
]

function toDate(value: string | null | undefined): Date {
  if (!value) return new Date()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getArticles()

  const articleEntries: MetadataRoute.Sitemap = articles
    .filter(a => a.slug)
    .map(a => ({
      url: `${SITE_URL}/atlas-brief/${a.slug}`,
      // Prefer the edit date so a corrected piece gets recrawled; fall back to
      // publication for anything never touched since.
      lastModified: toDate(a.updated_at ?? a.published_at),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))

  // Section landing pages, derived from the sections briefs actually use, so
  // we never advertise an empty one.
  const sectionSlugs = Array.from(
    new Set(articles.map(a => a.section_slug).filter((s): s is string => !!s))
  ).sort()
  const sectionEntries: MetadataRoute.Sitemap = sectionSlugs.map(slug => ({
    url: `${SITE_URL}/atlas-brief/sections/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(r => ({
    url: `${SITE_URL}${r.path === '/' ? '' : r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  return [...staticEntries, ...sectionEntries, ...articleEntries]
}
