import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  AUTHOR,
  ORG_ID,
  PERSON_ID,
  WEBSITE_ID,
  absoluteUrl,
} from './site'

// Structured data. This is the part answer engines lean on hardest: it tells
// them what a page IS, who wrote it, and when it changed, without asking them to
// infer any of it from prose.
//
// Rendered as a plain <script type="application/ld+json"> in the server-rendered
// markup, so it's present for crawlers that never run JavaScript.

// JSON.stringify escaped for safe embedding in a <script> block. The only
// sequence that can break out is "</script"; escaping the "<" neutralises it
// while keeping the JSON valid.
function serialize(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  )
}

// Sitewide identity: the publication, the person behind it, and the site
// itself. Emitted once from the public layout. Every article's JSON-LD refers
// back to these by @id instead of repeating them, which is what lets a crawler
// join "this article" to "this publisher" to "this author".
export function siteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        founder: { '@id': PERSON_ID },
        publishingPrinciples: `${SITE_URL}/about`,
        areaServed: {
          '@type': 'City',
          name: 'Los Angeles',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Los Angeles',
            addressRegion: 'CA',
            addressCountry: 'US',
          },
        },
      },
      {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: AUTHOR.name,
        url: AUTHOR.url,
        jobTitle: AUTHOR.jobTitle,
        sameAs: [AUTHOR.linkedin],
        worksFor: { '@id': ORG_ID },
        knowsAbout: [
          'Los Angeles multifamily real estate',
          'Rent stabilization',
          'California AB 1482',
          'Los Angeles Rent Stabilization Ordinance',
          'Los Angeles County Rent Stabilization and Tenant Protections Ordinance',
          'Real estate development',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { '@id': ORG_ID },
      },
    ],
  }
}

// Mirrors the crumb trail already rendered at the top of an article. Search
// results use it for the path shown under the title instead of a bare URL, and
// it tells a crawler where a page sits in the publication rather than leaving
// it to infer that from the URL.
//
// Must match the visible breadcrumb: structured data that disagrees with the
// page is worse than none.
export function breadcrumbGraph(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  }
}

export type ArticleJsonLdInput = {
  headline: string
  description?: string | null
  path: string
  datePublished?: string | null
  dateModified?: string | null
  images?: (string | null | undefined)[]
  // Street address the piece covers, when there is one. Naming the place in
  // structured data is the whole game here: it's how a query for an address
  // resolves to our note rather than to a listing portal.
  address?: {
    streetAddress?: string | null
    locality?: string | null
    region?: string | null
  } | null
  section?: string | null
}

export function articleGraph(input: ArticleJsonLdInput) {
  const url = absoluteUrl(input.path)
  const images = (input.images ?? []).filter((i): i is string => !!i).map(absoluteUrl)

  const about =
    input.address?.streetAddress
      ? {
          '@type': 'Residence',
          name: input.address.streetAddress,
          address: {
            '@type': 'PostalAddress',
            streetAddress: input.address.streetAddress,
            addressLocality: input.address.locality ?? 'Los Angeles',
            addressRegion: input.address.region ?? 'CA',
            addressCountry: 'US',
          },
        }
      : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: input.headline,
    ...(input.description ? { description: input.description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    // Fall back to publication date so dateModified is never absent — crawlers
    // treat a missing dateModified as "unknown freshness".
    dateModified: input.dateModified ?? input.datePublished ?? undefined,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: 'en-US',
    ...(input.section ? { articleSection: input.section } : {}),
    ...(about ? { about } : {}),
  }
}
