'use client'

import { useEffect, useState } from 'react'
import DispatchForm from './DispatchForm'
import { captureSuppressed, markCaptureDismissed } from '@/lib/subscribe-flag'

// The Friday Dispatch signup as a banner pinned to the bottom of the viewport:
// it rides along as the reader scrolls the Tape and stays until they close it.
//
// Pinned to the BOTTOM rather than the top because the navy nav already owns the
// top edge — two stacked bars there would eat the masthead.
//
// Wraps DispatchForm rather than reimplementing it, so the two-step signup
// (email inline -> name/role modal -> one insert) is unchanged. Dismissal and
// the already-subscribed check reuse the same localStorage flags as
// ArticleSubscribeBar, so closing it here doesn't get re-asked elsewhere.
export default function DispatchBanner() {
  const [mounted, setMounted] = useState(false)
  const [hidden, setHidden] = useState(true)

  // Read the flag after mount — localStorage isn't available during SSR, and
  // rendering it server-side then hiding it would flash the banner.
  useEffect(() => {
    setMounted(true)
    setHidden(captureSuppressed())
  }, [])

  useEffect(() => {
    // Reserve space so the pinned banner never covers the footer.
    document.body.classList.toggle('has-dispatch-banner', mounted && !hidden)
    return () => document.body.classList.remove('has-dispatch-banner')
  }, [mounted, hidden])

  if (!mounted || hidden) return null

  function dismiss() {
    markCaptureDismissed()
    setHidden(true)
  }

  return (
    <aside className="dispatch-banner" aria-label="Subscribe to the Friday Dispatch">
      <div className="db-inner">
        {/* Hold the confirmation briefly so the reader sees it, then retire. */}
        <DispatchForm variant="banner" onSubscribed={() => setTimeout(() => setHidden(true), 2600)} />
        <button type="button" className="db-close" onClick={dismiss} aria-label="Dismiss">
          &times;
        </button>
      </div>
    </aside>
  )
}
