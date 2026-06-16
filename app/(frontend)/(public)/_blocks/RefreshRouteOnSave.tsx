'use client'

import { RefreshRouteOnSave as PayloadRefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

// Mounted on public pages so that, when the page is shown inside Payload's
// Live Preview iframe, saving in the admin refreshes the preview in place.
export function RefreshRouteOnSave() {
  const router = useRouter()
  return <PayloadRefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />
}
