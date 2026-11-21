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
    // Every reveal band — the navy intro and, since 2026-11-21, the cream
    // buildings band — gets .is-in once its top edge is above mid-screen.
    const io = new IntersectionObserver(
      entries => {
        // The root is the top half of the viewport, so a band "intersects"
        // once its top edge is above the centre line.
        for (const e of entries) e.target.classList.toggle('is-in', e.isIntersecting)
      },
      { rootMargin: '0px 0px -50% 0px', threshold: 0 }
    )
    document.querySelectorAll('.ab-reveal-band').forEach(b => io.observe(b))

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

    // Atlas Brief fades in once the band is halfway past the toolbar (Lucas,
    // 2026-11-21, second try): measured live against the nav's bottom edge,
    // which puts the section mid-screen. Hidden only once this script runs
    // (.ab-anim on <html>), so the text still shows if it never loads. Runs
    // once per visit. about.css .ab-anim .ab-side:first-child.
    const brief = sides[0]
    const root = document.documentElement
    if (brief) root.classList.add('ab-anim')
    // Reloads start at the top of this page. Safari otherwise puts you back
    // where you were, already past the trigger, so the section was shown
    // instantly and (being once-only then) never faded.
    const prevRestore = history.scrollRestoration
    history.scrollRestoration = 'manual'

    // The arrow goes as soon as the band has risen a few pixels.
    let frame = 0
    const check = () => {
      frame = 0
      const r = band.getBoundingClientRect()
      const start = r.top + window.scrollY // its top at scroll 0
      band.classList.toggle('arrow-gone', r.top < start - 8)
      // Both ways, not once: scrolling back up above the point hides it
      // again, so it fades in every time you scroll down past it.
      // All three sections now (Lucas, 2026-11-21, after Atlas Brief worked):
      // each fades in once the block above it is halfway past the toolbar —
      // the band for Atlas Brief, the previous section for the other two.
      if (brief) {
        const navBottom = document.querySelector('.nav')?.getBoundingClientRect().bottom ?? 68
        // Sooner (Lucas: "too late", all three): a quarter of the block above
        // past the toolbar, not half. One number for all three.
        const PAST = 0.25 // was 0.5
        // The buildings card briefly faded in here too; it now slides in on
        // its cream band instead (the .ab-reveal-band observer above).
        const seq = sides
        seq.forEach((s, i) => {
          const above = i === 0 ? r : seq[i - 1].getBoundingClientRect()
          s.classList.toggle('is-in', above.top + above.height * PAST <= navBottom)
        })
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      io.disconnect()
      root.classList.remove('ab-anim')
      history.scrollRestoration = prevRestore
      document.removeEventListener('click', onBannerClick)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
  return null
}
