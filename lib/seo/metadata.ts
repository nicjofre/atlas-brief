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
}): Metadata {
  const { title, description, path, images, type = 'website' } = opts
  const url = absoluteUrl(path)

  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: url },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title,
      ...(description ? { description } : {}),
      url,
      ...(images?.length ? { images } : {}),
      ...(type === 'article' && opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
      ...(type === 'article' && opts.modifiedTime ? { modifiedTime: opts.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      ...(description ? { description } : {}),
      ...(images?.length ? { images } : {}),
    },
  }
}
