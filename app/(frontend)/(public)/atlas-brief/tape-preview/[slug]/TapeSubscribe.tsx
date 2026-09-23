'use client'

// Same trigger as the WSJ route's: asks the site's signup pop-up to open rather
// than owning a dialog of its own.
export default function TapeSubscribe({ variant }: { variant: 'tool' | 'foot' }) {
  return (
    <button
      type="button"
      className={variant === 'tool' ? 'tp-sub-tool' : 'tp-sub-foot'}
      onClick={() => window.dispatchEvent(new CustomEvent('atlas:open-subscribe'))}
    >
      {variant === 'tool' && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Zm2.2.5 6.8 5.1L18.8 7H5.2Z" />
        </svg>
      )}
      Subscribe
    </button>
  )
}
