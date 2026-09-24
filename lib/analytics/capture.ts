// Client beacon for capture-prompt events (see app/api/track/capture). Fire and
// forget: sendBeacon survives the page unloading, which matters for a
// "dismissed" that is immediately followed by the reader leaving.

export type CaptureEvent = {
  event: 'shown' | 'dismissed' | 'submitted'
  surface: 'popup'
  trigger?: 'scroll' | 'nav'
  how?: 'close' | 'skip' | 'backdrop' | 'escape'
  slug?: string
}

export function trackCapture(e: CaptureEvent): void {
  try {
    const body = JSON.stringify({ ...e, path: location.pathname })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track/capture', new Blob([body], { type: 'application/json' }))
    } else {
      void fetch('/api/track/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    }
  } catch {
    // analytics must never break the page
  }
}
