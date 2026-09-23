import { permanentRedirect } from 'next/navigation'

// /atlas-brief is retired — 308 to the homepage.
//
// It used to be a third feed page: <h1>Atlas Brief</h1>, the title "Atlas Brief
// · LA Real Estate, Construction, and Policy", and 108 article links. That is
// the homepage's job, and two pages carrying the site's own name meant they
// competed for it — the sitemap listed this one at priority 0.9, second only to
// "/", with a self-canonical, so Google was being told to index a near-duplicate
// and left to pick a winner.
//
// The information architecture settled on 2026-09-22 has no room for it:
//
//   Atlas Brief  = the site
//   /            = its front page
//   The Tape     = the deals archive     (/atlas-brief/sections/broker-activity)
//   Dispatch     = the essays archive    (/atlas-brief/dispatch)
//
// 308 rather than 307, and a redirect rather than a delete, because the URL has
// been published and indexed: a permanent redirect passes whatever link equity
// it holds to the homepage, where the same content lives. It is also out of
// app/sitemap.ts now — advertising a redirect is its own small penalty.
//
// The feed it used to render is recoverable in one paste:
//     git show ed100c7:'app/(frontend)/(public)/atlas-brief/page.tsx'
// Nothing else imported it, and its stylesheet (./feed.css) is still used by the
// section route, so nothing was orphaned by this.

export default function AtlasBriefIndex(): never {
  permanentRedirect('/')
}
