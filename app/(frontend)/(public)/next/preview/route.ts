import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// Enables Next.js draft mode so the requested page renders the latest (possibly
// unpublished) draft. Called by Payload's Live Preview iframe and Preview
// button. Secured by the Payload admin session on the request — only a
// logged-in CMS user can turn on draft mode.
export async function GET(req: NextRequest) {
  const path = new URL(req.url).searchParams.get('path') || '/'
  if (!path.startsWith('/')) {
    return new Response('Invalid path', { status: 400 })
  }

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) {
    return new Response('Unauthorized — log in to the CMS first.', { status: 401 })
  }

  const dm = await draftMode()
  dm.enable()
  redirect(path)
}
