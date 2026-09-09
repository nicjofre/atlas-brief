import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'

// Served at /robots.txt. The editorial app (dashboard, listings, analytics,
// the Payload admin) is disallowed so crawlers don't burn budget on pages that
// bounce to /login. Everything reader-facing is open.
//
// No separate rule set for GPTBot/PerplexityBot/ClaudeBot: the point of this
// site is to be the thing an answer engine cites when someone asks about an LA
// address, so the AI crawlers get the same access as Google.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/admin',
          '/analytics',
          '/articles',
          '/api/',
          '/cms',
          '/cms-api',
          '/dashboard',
          '/development',
          '/dispatch',
          '/explore',
          '/image-check',
          '/listings',
          '/login',
          '/next/preview',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
