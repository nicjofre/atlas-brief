'use client'

import { useEffect } from 'react'

// The About page's scroll moment (Lucas, 2026-11-21, after the Toll Brothers
// page). The title is pinned under the nav (about.css .ab-stage) and the navy
// band scrolls up over it. Once the band's top edge passes the middle of the
// screen, this adds .is-in to the band and its text slides up into place;
// scrolling back above that point takes it off again.
// It also hides the white arrow at the top of the band (.arrow-gone) as soon
// as the band starts to move. Renders nothing.
// The three sides' sections no longer fade in (scrapped 2026-11-21, Lucas).
export default function IntroReveal() {
  useEffect(() => {
    const band = document.querySelector<HTMLElement>('.ab-intro')
    if (!band) return
    const io = new IntersectionObserver(
      ([entry]) => {
        // The root is the top half of the viewport, so the band "intersects"
        // once its top edge is above the centre line.
        band.classList.toggle('is-in', entry.isIntersecting)
      },
      { rootMargin: '0px 0px -50% 0px', threshold: 0 }
    )
    io.observe(band)

    // Banner links scroll to their section without putting "#atlas-home-pro"
    // etc. in the address bar (2026-11-21 bug: after clicking one, every
    // reload jumped straight back down to that section). And if a page loads
    // with one of those leftovers, it's cleared and the page starts at the top.
    const sides = Array.from(document.querySelectorAll<HTMLElement>('.ab-side'))
    const onBannerClick = (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement).closest<HTMLAnchorElement>('.ab-arms-banner a[href^="#"]')
      if (!a) return
      const target = document.getElementById(a.hash.slice(1))
      if (!target) return
      ev.preventDefault()
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    document.addEventListener('click', onBannerClick)
    if (location.hash && sides.some(s => `#${s.id}` === location.hash)) {
      history.replaceState(null, '', location.pathname + location.search)
      window.scrollTo(0, 0)
    }

    // The arrow goes as soon as the band has risen a few pixels.
    let frame = 0
    const check = () => {
      frame = 0
      const top = band.getBoundingClientRect().top
      const start = top + window.scrollY // its top at scroll 0
      band.classList.toggle('arrow-gone', top < start - 8)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      io.disconnect()
      document.removeEventListener('click', onBannerClick)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
  return null
}
