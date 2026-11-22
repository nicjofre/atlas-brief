'use client'

import { useEffect } from 'react'

// The contact page's scroll moment (Lucas, 2026-11-22), the About page's
// treatment (about/IntroReveal.tsx): the titles and form (.c-main) stay pinned
// while the navy band with David's details (.c-band) scrolls up over them.
//   - Once the band's top edge passes mid-screen it gets .is-in and David's
//     photo and card slide up into place; scrolling back above takes it off.
//   - The white arrow at the top of the band goes (.arrow-gone) as soon as
//     the band starts to move.
//   - --c-stick is where .c-main pins: under the nav, or higher if it's
//     taller than the screen, so its bottom (the Submit button) can still be
//     scrolled into view before the band covers it.
// Renders nothing. Styles in contact.css (.c-band).
export default function ContactReveal() {
  useEffect(() => {
    const band = document.querySelector<HTMLElement>('.c-band')
    const main = document.querySelector<HTMLElement>('.c-page .c-main')
    if (!band || !main) return

    const io = new IntersectionObserver(
      entries => {
        // The root is the top half of the viewport, so the band "intersects"
        // once its top edge is above the centre line.
        for (const e of entries) e.target.classList.toggle('is-in', e.isIntersecting)
      },
      { rootMargin: '0px 0px -50% 0px', threshold: 0 }
    )
    io.observe(band)

    let frame = 0
    const NAV = 68
    const measure = () => {
      main.style.setProperty('--c-stick', `${Math.min(NAV, window.innerHeight - main.offsetHeight)}px`)
    }
    // The band itself never pins, so it has started to move as soon as the
    // page has scrolled a few pixels.
    const check = () => {
      frame = 0
      band.classList.toggle('arrow-gone', window.scrollY > 8)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check) }
    const onResize = () => { measure(); onScroll() }
    measure()
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      io.disconnect()
      main.style.removeProperty('--c-stick')
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
  return null
}
