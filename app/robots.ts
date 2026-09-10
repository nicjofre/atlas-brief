import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'

// Served at /robots.txt. The editorial app (dashboard, listings, analytics,
// the Payload admin) is disallowed so crawlers don't burn budget on pages that
// bounce to /login. Everything reader-facing is open.
//
// No separate rule set for GPTBot/PerplexityBot/ClaudeBot: the point of this
// site is to be the thing an answer engine cites when someone asks about an LA
// address, so the AI crawlers get the same access as Google.
// Payload serves uploaded media under /cms-api/media. Blanket-blocking
// /cms-api therefore blocks every essay's og:image, so the media path is
// allowed back explicitly — a more specific Allow beats a broader Disallow.
const ALLOW = ['/', '/cms-api/media']

// Named explicitly rather than left to the '*' group. They inherit the same
// access either way, but spelling them out records the decision: this site
// wants to be cited by answer engines, and Google-Extended in particular is
// the token that governs Gemini's use of the content.
const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'Google-Extended',
  'PerplexityBot',
  'ClaudeBot',
  'Claude-User',
  'CCBot',
]

export default function robots(): MetadataRoute.Robots {
  const disallow = [
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
  ]

  return {
    rules: [
      { userAgent: '*', allow: ALLOW, disallow },
      { userAgent: AI_CRAWLERS, allow: ALLOW, disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}

// Note: /llms.txt is served by app/llms.txt/route.ts. It isn't referenced here
// because robots.txt has no field for it — models are expected to fetch it by
// convention at the site root.
