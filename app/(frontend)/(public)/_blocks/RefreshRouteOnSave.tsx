'use client'

import { RefreshRouteOnSave as PayloadRefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'

// Mounted on public pages so that, when the page is shown inside Payload's
// Live Preview iframe, saving in the admin refreshes the preview in place.
// Use the current origin so the postMessage origin check works on any domain
// (localhost, production, branch previews) without an env var.
export function RefreshRouteOnSave() {
  const router = useRouter()
  const serverURL = typeof window !== 'undefined' ? window.location.origin : ''
  return <PayloadRefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />
}
