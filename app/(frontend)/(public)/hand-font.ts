import { Caveat } from 'next/font/google'

// The site's one handwritten face (Caveat), for the few lines that should read
// as David's own hand: the masthead tagline and the front page's notes.
// next/font self-hosts it, so the site still makes no request to Google.
export const hand = Caveat({ subsets: ['latin'], weight: ['500', '600'], display: 'swap' })
