import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// The editorial app. Requesting one of these without a session bounces to
// /login; everything else falls through to Next, so an unknown URL 404s like it
// should instead of leaking the login screen to crawlers.
//
// This is a deny-list rather than the allow-list it used to be, which matters
// for search and answer engines: /robots.txt, /sitemap.xml and any typo'd URL
// now return real files and real 404s. The safety of the inversion rests on
// every private page and API route running its own auth check — they all do
// (each calls supabase.auth.getUser() and redirects). This gate is
// defence-in-depth, not the only lock, so a new admin route accidentally
// omitted here is still protected by its own check.
const PRIVATE_PREFIXES = [
  '/account', '/admin', '/analytics', '/articles', '/dashboard',
  '/development', '/dispatch', '/explore', '/image-check', '/listings',
]

// Public POST endpoints: `/api/subscribe` (signup), `/api/track/view` (the
// reader-analytics beacon from the public article page), and
// `/api/webhooks/resend` (Resend posts email events, verified by signature).
// Every other /api/* route is admin-only and stays gated.
const PUBLIC_API = new Set([
  '/api/subscribe', '/api/track/view', '/api/webhooks/resend',
  '/api/tax-appeals/waitlist', '/api/deals/submit', '/api/white-paper/lead',
  '/api/rso-briefing/lead',
])

function isPrivatePath(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return !PUBLIC_API.has(pathname)
  return PRIVATE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  // Canonicalize the host: send www.* and the raw *.vercel.app deployment alias
  // to the primary domain so the whole site lives on one origin. Without this,
  // multiple hosts serve the app, which splits referrers (the Google Maps
  // JavaScript API rejects any host not in the key's allowlist — e.g. the
  // vercel.app URL — with RefererNotAllowedMapError), cookies, and analytics.
  const CANONICAL_HOST = 'atlasbrief.la'
  const host = request.headers.get('host') ?? ''
  if (host !== CANONICAL_HOST && (host.startsWith('www.') || host.endsWith('.vercel.app'))) {
    const dest = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `https://${CANONICAL_HOST}`)
    return NextResponse.redirect(dest, 308)
  }

  // Payload CMS (admin at /cms, REST/GraphQL at /cms-api) handles its own
  // authentication, separate from Supabase. Let those routes through
  // untouched so the proxy doesn't bounce them to the Supabase /login.
  if (request.nextUrl.pathname.startsWith('/cms')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (!user && !pathname.startsWith('/login') && isPrivatePath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Skip the proxy entirely for Next's static output and for anything with a
  // file extension (robots.txt, sitemap.xml, PDFs, images, fonts). Crawlers
  // fetch robots.txt and sitemap.xml before anything else; running an auth
  // round-trip on them was what redirected both to /login.
  matcher: [
    '/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)',
  ],
}
