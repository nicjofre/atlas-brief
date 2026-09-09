// Single source of truth for the identity facts that search and answer engines
// read: canonical origin, publisher, author. Structured data is only useful if
// it agrees with the visible page, so everything here is drawn from what the
// site already states about itself (the masthead, About, Contact, the footer's
// LinkedIn link) rather than invented for the markup.

export const SITE_URL = 'https://atlasbrief.la'
export const SITE_NAME = 'Atlas Brief'

export const SITE_DESCRIPTION =
  'An owner-builder journal of Los Angeles real estate, development, and policy.'

// David is both the publication's author and the reason to trust it: an
// operator who builds and owns in LA, not a wire service. `sameAs` is the
// footer's LinkedIn — the only external profile the site actually links, and
// the anchor an answer engine uses to reconcile the byline with a real person.
export const AUTHOR = {
  name: 'David Safai',
  url: `${SITE_URL}/about`,
  linkedin: 'https://www.linkedin.com/in/david-safai-b7622113b/',
  jobTitle: 'Operator, developer and general contractor',
} as const

// Stable @id values so NewsArticle can point at the same Organization/Person
// nodes rather than restating them, which is what lets a crawler resolve
// "who published this" across pages.
export const ORG_ID = `${SITE_URL}/#organization`
export const PERSON_ID = `${SITE_URL}/#david-safai`
export const WEBSITE_ID = `${SITE_URL}/#website`

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
