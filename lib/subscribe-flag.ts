// Client-side memory of whether this browser has already subscribed or
// dismissed a capture prompt. There's no login for public readers, so this is
// the only signal we have — a per-browser flag, set the moment anyone signs up
// through any form. Not authoritative (clears with cookies, doesn't cross
// devices), but enough to avoid nagging someone who just subscribed.

const SUB_KEY = 'atlas_subscribed'
const DISMISS_KEY = 'atlas_capture_dismissed'
const MODAL_DISMISS_KEY = 'atlas_modal_dismissed_at'

// How long a modal dismissal sticks. The bar's dismissal is permanent (it's
// ambient, so nagging is the only failure mode); the modal interrupts, so a
// "no" has to be honoured for a good while — but not forever, since a reader
// who declined in March is a different prospect by autumn.
const MODAL_DISMISS_DAYS = 45

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

// The modal has its own dismissal clock. Dismissing the *bar* deliberately does
// NOT suppress the modal: the bar's × is often just "get this off my masthead",
// not "never ask me again", and the two asks land at very different moments.
// Subscribing, of course, silences both.
export function modalSuppressed(): boolean {
  if (typeof window === 'undefined') return true
  try {
    if (localStorage.getItem(SUB_KEY) === '1') return true
    const at = Number(localStorage.getItem(MODAL_DISMISS_KEY))
    if (!Number.isFinite(at) || at <= 0) return false
    return Date.now() - at < MODAL_DISMISS_DAYS * 86400_000
  } catch {
    return false
  }
}

export function markModalDismissed(): void {
  try { localStorage.setItem(MODAL_DISMISS_KEY, String(Date.now())) } catch { /* private mode */ }
}
