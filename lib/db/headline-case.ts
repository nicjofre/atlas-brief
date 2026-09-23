// Some titles and subheads are typed entirely in capitals in the CMS. A
// newspaper never sets a headline that way, so any string that is all caps is
// lowered to sentence case at render time, keeping the shorthand an LA real
// estate reader expects. Mixed-case input is returned untouched.
const KEEP_CAPS = new Set(['LA', 'DTLA', 'HUD', 'RSO', 'REAP', 'ULA', 'AI', 'SF', 'NOI', 'CAP', 'GRM', 'IRR', 'LLC', 'REIT', 'ADU', 'TOC', 'HOA', 'DRE', 'MLS', 'OM', 'T-12', 'NYC', 'US', 'USC', 'UCLA', 'CA', 'II', 'III', 'IV'])

export function isAllCaps(text: string): boolean {
  return /[A-Z]/.test(text) && text === text.toUpperCase()
}

// Lowercase every word except known acronyms; `first` restores the capital on
// the opening word and after each full stop ("62 units…", not "62 Units…").
export function sentenceCase(text: string, first = true): string {
  const words = text.split(/(\s+)/).map(w => {
    if (!/[A-Z]/.test(w)) return w
    const bare = w.replace(/[^A-Z0-9-]/gi, '')
    return KEEP_CAPS.has(bare.toUpperCase()) ? w.toUpperCase() : w.toLowerCase()
  })
  let out = words.join('')
  if (first) out = out.replace(/(^[^A-Za-z0-9]*|[.!?]["”']?\s+)([a-z])/g, (_, pre, c) => pre + c.toUpperCase())
  return out
}

// Sentence-case a headline only when the whole thing is shouting.
export function calmHeadline(text: string | null | undefined): string {
  const t = (text ?? '').replace(/\*/g, '')
  return isAllCaps(t) ? sentenceCase(t) : t
}
