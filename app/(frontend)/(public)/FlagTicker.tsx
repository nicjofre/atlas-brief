// The strip under the masthead: taglines sliding right to left, somewhere David
// can try lines without committing one to the wordmark. No JavaScript — the
// track is the list twice over and CSS translates it by half its width, so the
// loop is seamless and nothing runs on the main thread.
//
// To change the lines, edit this array. If it ever needs to be David's to edit
// rather than ours, it becomes a Payload global — until then a code change is
// cheaper than a schema change.
const TAGLINES = [
  'An owner-builder journal, published from Los Angeles.',
  'What traded, what it really sold for, and what the numbers say.',
  'Written by someone who has operated a building, pulled a permit, and done ground-up construction.',
  'Read it like a trade journal, not a brochure.',
  'The Friday Dispatch — one operator’s read on LA multifamily, weekly.',
]

export default function FlagTicker() {
  // Twice: the second copy is what the first slides away to reveal.
  const run = [...TAGLINES, ...TAGLINES]
  return (
    <div className="ticker" role="marquee" aria-label="Atlas Brief">
      <div className="ticker-track">
        {run.map((line, i) => (
          <span className="ticker-item" key={i} aria-hidden={i >= TAGLINES.length}>
            {line}
          </span>
        ))}
      </div>
    </div>
  )
}
