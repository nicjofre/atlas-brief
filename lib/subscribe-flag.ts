// Client-side memory of whether this browser has already subscribed or
// dismissed a capture prompt. There's no login for public readers, so this is
// the only signal we have — a per-browser flag, set the moment anyone signs up
// through any form. Not authoritative (clears with cookies, doesn't cross
// devices), but enough to avoid nagging someone who just subscribed.

const SUB_KEY = 'atlas_subscribed'
const DISMISS_KEY = 'atlas_capture_dismissed'

export function captureSuppressed(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(SUB_KEY) === '1' || localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function markSubscribed(): void {
  try { localStorage.setItem(SUB_KEY, '1') } catch { /* private mode */ }
}

export function markCaptureDismissed(): void {
  try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode */ }
}
