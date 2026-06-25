import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderRoundupHtml } from '@/lib/email/render-roundup'
import { formatDispatchDate } from '@/lib/email/build-roundup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Live preview of the assembled roundup. POST { slugs, intro } from the compose
// screen; returns the email HTML (with sample greeting + a no-op unsubscribe)
// for the iframe preview. Auth-gated — admin only.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let slugs: string[] = []
  let intro = ''
  try {
    const body = await req.json()
    slugs = Array.isArray(body?.slugs) ? body.slugs.filter((s: unknown) => typeof s === 'string') : []
    intro = typeof body?.intro === 'string' ? body.intro : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { html } = await renderRoundupHtml({
    slugs,
    intro,
    greeting: 'there',
    unsubscribeUrl: '#',
    dateline: formatDispatchDate(new Date()),
  })

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
