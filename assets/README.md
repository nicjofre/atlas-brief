# assets/

Files read at runtime by `readFile(join(process.cwd(), 'assets/...'))` — the
pattern Next's opengraph-image docs specify. Not `public/`: nothing here is
served to browsers, it's only read server-side when generating an image.

## Newsreader-SemiBold.ttf, Newsreader-SemiBoldItalic.ttf

The site's serif, for the Open Graph card's wordmark. `next/og` ships only a
system sans, so the lockup ("Atlas" roman + "Brief" italic) needs the real
faces bundled.

Static 600-weight instances pulled from Google Fonts, not the variable font —
Satori renders static instances reliably and variable axes it does not.

Licensed SIL Open Font License 1.1, which permits bundling and redistribution.
Upstream: https://fonts.google.com/specimen/Newsreader
