'use client'

// ADDED BY ATLAS BRIEF (2026-09-16) — not part of Nic's original route.
// Subscribe triggers for the WSJ template: a small one in the byline toolbar,
// a larger one beside the sign-off. Neither owns a dialog — both ask for the
// site's own signup pop-up (ArticleSubscribeModal) by dispatching
// `atlas:open-subscribe`, so the form, its fields, its styling and its fade are
// the ones the rest of the site already uses.

export default function WsjSubscribe({ variant }: { variant: 'tool' | 'foot' }) {
  function open() {
    window.dispatchEvent(new CustomEvent('atlas:open-subscribe'))
  }

  return (
    <button
      type="button"
      className={variant === 'tool' ? 'wsj-sub-tool' : 'wsj-sub-foot'}
      onClick={open}
    >
      {variant === 'tool' && (
        /* The toolbar's controls are all icon + label; this one matches them
           rather than sitting in as a filled pill. */
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Zm2.2.5 6.8 5.1L18.8 7H5.2Z" />
        </svg>
      )}
      Subscribe
    </button>
  )
}
