import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes anyone can read without a session. Everything else requires auth.
// Public POST endpoints: `/api/subscribe` (signup), `/api/track/view` (the
// reader-analytics beacon from the public article page), and
// `/api/webhooks/resend` (Resend posts email events, verified by signature).
// The admin-only `/api/dispatch/*` routes deliberately stay gated.
const PUBLIC_PREFIXES = ['/atlas-brief', '/about', '/build', '/contact']
const PUBLIC_EXACT = new Set(['/', '/api/subscribe', '/api/track/view', '/api/webhooks/resend'])

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
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

  if (!user && !pathname.startsWith('/login') && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|favicon-32.png|apple-touch-icon.png|images/).*)',
  ],
}
