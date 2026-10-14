'use client'

import { useEffect, useRef } from 'react'

// "Also in the diary" as a single line partway through an essay, the way The
// Atlantic drops a "Read:" link between paragraphs. Rendered after the essay,
// then moved on mount to sit after the paragraph about a third of the way in,
// since the body is CMS blocks we don't want to split on the server.
export default function DiaryAside({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    const text = el?.parentElement?.querySelector('.essay-text')
    if (!el || !text) return
    const paras = Array.from(text.querySelectorAll('p')).filter(p => (p.textContent ?? '').trim().length > 40)
    if (paras.length < 6) return
    const after = paras[Math.floor(paras.length / 3)]
    after.after(el)
    el.hidden = false
  }, [])
  return <div ref={ref} className="essay-aside" hidden>{children}</div>
}
