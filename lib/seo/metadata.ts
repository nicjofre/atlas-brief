import type { Metadata } from 'next'
import { SITE_NAME, absoluteUrl } from './site'

// Build a page's metadata so it describes ITSELF.
//
// Next.js does not deep-merge metadata: a page that sets `title` but omits
// `openGraph` inherits the parent layout's entire openGraph block, url and all.
// That's why About and Contact were advertising the homepage's og:url and
// og:title. Any page with its own identity should go through here.
export function pageMetadata(opts: {
  title: string
  description?: string
  /** Site-root-relative, e.g. '/about'. Becomes both canonical and og:url. */
  path: string
  images?: string[]
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  /**
   * Share-card headline, when it should differ from the search title. Briefs
   * lead their <title> with the street address because that's what people type
   * into Google; on LinkedIn nobody searches, they scan, so the share card
   * keeps David's editorial headline instead.
   */
  socialTitle?: string
}): Metadata {
  const { title, description, path, images, type = 'website' } = opts
  const url = absoluteUrl(path)
  const socialTitle = opts.socialTitle ?? title

  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: url },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title: socialTitle,
      ...(description ? { description } : {}),
      url,
      ...(images?.length ? { images } : {}),
      ...(type === 'article' && opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
      ...(type === 'article' && opts.modifiedTime ? { modifiedTime: opts.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      ...(description ? { description } : {}),
      ...(images?.length ? { images } : {}),
    },
  }
}
