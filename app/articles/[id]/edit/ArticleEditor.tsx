'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HeroPhotoEditor from './HeroPhotoEditor'

export type AIDraftShape = {
  gaps?: string[]
  tier_recommendation?: { tier: 1 | 2 | 3; reason: string }
  tape_1?: { text: string }
  tape_2?: { headline: string; deck: string; body_html: string }
  tape_3?: {
    headline: string
    deck: string
    status_tag: string
    hero_caption: string
    takeaways_subhead: string
    takeaways: Array<{ bold: string; text: string }>
    deal_stats_html: string
    body_html: string
    byline_html: string
  }
  broker_outreach_email?: string
}

const PLACEHOLDER_RE = /\[(ATLAS HEADLINE|ATLAS READ(?::[^\]]*)?|BROKER TAG NOTE|TRADE RANGE(?::[^\]]*)?)\]/g

export default function ArticleEditor({
  articleId,
  slug: initialSlug,
  status,
  tapeTier: initialTier,
  aiDraft,
  articleHeroPhotoUrl,
  listingHeroPhotoUrl,
  listingAddress,
  listingCity,
  listingState,
}: {
  articleId: string
  slug: string
  status: string
  tapeTier: number
  aiDraft: AIDraftShape | null
  articleHeroPhotoUrl: string | null
  listingHeroPhotoUrl: string | null
  listingAddress: string | null
  listingCity: string | null
  listingState: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [draft, setDraft] = useState<AIDraftShape>(aiDraft ?? {})
  const [tier, setTier] = useState<1 | 2 | 3>(initialTier as 1 | 2 | 3)
  const [slug, setSlug] = useState(initialSlug)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSavedAt, setJustSavedAt] = useState<number | null>(null)
  const [editingSlug, setEditingSlug] = useState(false)

  async function saveDraft() {
    setSaving(true)
    setError(null)
    try {
      const { error: updErr } = await supabase
        .from('articles')
        .update({
          ai_draft: draft as unknown as never,
          tape_tier: tier,
          slug,
          headline: pickHeadline(draft, tier),
          deck: pickDeck(draft, tier),
        })
        .eq('id', articleId)
      if (updErr) throw new Error(updErr.message)
      setJustSavedAt(Date.now())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    if (!confirm(`Publish this article as /atlas-brief/${slug}? It will go live immediately.`)) return
    setPublishing(true)
    setError(null)
    try {
      const fields = projectTapeToColumns(draft, tier)
      const { error: updErr } = await supabase
        .from('articles')
        .update({
          ...fields,
          ai_draft: draft as unknown as never,
          tape_tier: tier,
          slug,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', articleId)
      if (updErr) throw new Error(updErr.message)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  if (!aiDraft) {
    return (
      <div style={{ marginTop: 24, padding: 24, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 4 }}>
        <p style={{ color: '#666', fontSize: 14 }}>This article was created without an AI draft. Manual editing only.</p>
      </div>
    )
  }

  // Editor surface needs the same prose typography rules the published post has
  // (paragraph spacing, list spacing, H2 numbering, etc.) so what David sees
  // while editing matches what readers see. Injected scoped so it only affects
  // editor blocks.
  const proseRuleStyles = `
    .atlas-editor-surface p { margin: 0 0 1.2em; }
    .atlas-editor-surface p:last-child { margin-bottom: 0; }
    .atlas-editor-surface ol, .atlas-editor-surface ul { margin: 0 0 1.2em 1.5em; padding: 0; }
    .atlas-editor-surface li { margin-bottom: 0.4em; line-height: 1.6; }
    .atlas-editor-surface blockquote { margin: 1.6em 0; padding: 16px 0; border-top: 1px solid #0A0A0A; border-bottom: 1px solid #0A0A0A; font-style: italic; }
    .atlas-editor-surface .speculation { background: #FFF8EE; border: 1px solid #8B5A2B; padding: 18px 22px; margin: 1.6em 0; font-size: 16px; line-height: 1.55; }
    .atlas-editor-surface .speculation .tag { display: block; font-family: ui-monospace, Menlo, monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #8B5A2B; margin-bottom: 8px; font-weight: 500; }
    .atlas-editor-surface .table-fig { margin: 1.6em 0; padding-top: 16px; border-top: 1px solid #0A0A0A; }
    .atlas-editor-surface .table-fig .cap { font-family: ui-monospace, Menlo, monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #4F4F4B; margin-bottom: 14px; }
    .atlas-editor-surface .table-fig table { width: 100%; border-collapse: collapse; font-family: ui-monospace, Menlo, monospace; font-size: 13px; }
    .atlas-editor-surface .table-fig th, .atlas-editor-surface .table-fig td { text-align: left; padding: 10px 12px 10px 0; border-bottom: 1px dotted #D6CBB3; }
    .atlas-editor-surface .table-fig th { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #4F4F4B; font-weight: 500; padding-bottom: 10px; border-bottom: 1px solid #0A0A0A; }
    .atlas-editor-surface .table-fig td.n, .atlas-editor-surface .table-fig th.n { text-align: right; }
    .atlas-editor-surface .brokers { margin: 2em 0 0; padding: 20px 0 4px; border-top: 1px solid #0A0A0A; }
    .atlas-editor-surface .brokers-head { font-family: ui-monospace, Menlo, monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #8B5A2B; margin-bottom: 18px; }
    .atlas-editor-surface .broker-name { font-family: "Newsreader", Georgia, serif; font-weight: 500; font-size: 20px; color: #0A0A0A; margin-bottom: 2px; }
    .atlas-editor-surface .broker-firm { font-family: "Newsreader", Georgia, serif; font-style: italic; font-size: 14px; color: #1F1F1D; margin-bottom: 12px; }
    .atlas-editor-surface .broker-meta { list-style: none; padding: 0; margin: 0; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #4F4F4B; line-height: 1.7; }
    .atlas-editor-surface .broker-side { font-family: ui-monospace, Menlo, monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #4F4F4B; margin-bottom: 8px; }
    .atlas-editor-surface strong, .atlas-editor-surface b { color: #0A0A0A; }
  `

  return (
    <div style={{ maxWidth: 920, margin: '16px auto 0' }}>
      <style dangerouslySetInnerHTML={{ __html: proseRuleStyles }} />
      {/* Main visual editor */}
      <div>
        {/* Tape tier tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: 4 }}>
          {[1, 2, 3].map(t => {
            const active = tier === t
            const isRec = draft.tier_recommendation?.tier === t
            return (
              <button
                key={t}
                onClick={() => setTier(t as 1 | 2 | 3)}
                style={{
                  padding: '8px 16px',
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  background: active ? '#111' : 'transparent',
                  color: active ? '#fff' : '#666',
                  border: active ? '1px solid #111' : '1px solid transparent',
                  borderRadius: 2,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Tape {t}
                {isRec && <span style={{ fontSize: 9, color: active ? '#FFE4B0' : '#9A6B3F' }}>★</span>}
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, letterSpacing: 1, color: '#888' }}>
            Click any text to edit
          </span>
        </div>

        {/* Visual surface — loads atlas-v2.css to match the rendered post */}
        <div className="atlas-editor-surface">
          {tier === 1 && (
            <Tape1Surface
              tape={draft.tape_1 ?? { text: '' }}
              onChange={t => setDraft(d => ({ ...d, tape_1: t }))}
            />
          )}
          {tier === 2 && (
            <Tape2Surface
              tape={draft.tape_2 ?? { headline: '', deck: '', body_html: '' }}
              onChange={t => setDraft(d => ({ ...d, tape_2: t }))}
              listingAddress={listingAddress}
              listingCity={listingCity}
              listingState={listingState}
            />
          )}
          {tier === 3 && (
            <Tape3Surface
              tape={draft.tape_3 ?? blankTape3()}
              onChange={t => setDraft(d => ({ ...d, tape_3: t }))}
              articleId={articleId}
              listingAddress={listingAddress}
              listingCity={listingCity}
              listingState={listingState}
              articleHeroPhotoUrl={articleHeroPhotoUrl}
              listingHeroPhotoUrl={listingHeroPhotoUrl}
            />
          )}
        </div>

        {/* Sticky action bar */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            marginTop: 16,
            padding: '12px 16px',
            background: '#111',
            color: '#fff',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
            zIndex: 50,
          }}
        >
          <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999' }}>
            Tape {tier} · /atlas-brief/
          </span>
          {editingSlug ? (
            <input
              autoFocus
              value={slug}
              onChange={e => setSlug(e.target.value)}
              onBlur={() => setEditingSlug(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingSlug(false) }}
              style={{
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: 12,
                padding: '4px 8px',
                background: '#222',
                color: '#fff',
                border: '1px solid #9A6B3F',
                borderRadius: 2,
                minWidth: 280,
              }}
            />
          ) : (
            <button
              onClick={() => setEditingSlug(true)}
              title="Click to edit slug"
              style={{
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: 12,
                color: '#fff',
                background: 'transparent',
                border: '1px dashed transparent',
                padding: '4px 8px',
                cursor: 'pointer',
                borderRadius: 2,
              }}
              onMouseEnter={e => (e.currentTarget.style.border = '1px dashed #444')}
              onMouseLeave={e => (e.currentTarget.style.border = '1px dashed transparent')}
            >
              {slug}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={saveDraft}
            disabled={saving}
            style={actionButtonStyle('ghost', saving)}
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            onClick={publish}
            disabled={publishing}
            style={actionButtonStyle('primary', publishing)}
          >
            {publishing ? 'Publishing…' : status === 'published' ? 'Re-publish' : 'Publish'}
          </button>
          {justSavedAt && Date.now() - justSavedAt < 4000 && (
            <span style={{ fontSize: 11, color: '#7FB77E', letterSpacing: 1 }}>✓ saved</span>
          )}
          {error && <span style={{ fontSize: 11, color: '#E5A04F' }}>{error}</span>}
        </div>
      </div>

      {/* Broker outreach email — collapsible, sits below the action bar */}
      {draft.broker_outreach_email && (
        <details
          style={{
            marginTop: 16,
            padding: 14,
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: 4,
          }}
        >
          <summary style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9A6B3F', cursor: 'pointer' }}>
            Broker outreach email (for CRM, not published)
          </summary>
          <pre style={{ marginTop: 10, fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace', whiteSpace: 'pre-wrap', color: '#444', lineHeight: 1.55 }}>
            {draft.broker_outreach_email}
          </pre>
        </details>
      )}
    </div>
  )
}

// ============================================================================
// Tape surfaces — each renders the actual post structure with editable nodes
// ============================================================================

function Tape1Surface({ tape, onChange }: { tape: { text: string }; onChange: (t: { text: string }) => void }) {
  return (
    <div
      style={{
        padding: 32,
        background: '#FFF4E3',
        border: '1px solid #D6CBB3',
        borderRadius: 4,
        fontFamily: '"Newsreader", Georgia, serif',
        fontSize: 19,
        lineHeight: 1.55,
        color: '#1F1F1D',
      }}
    >
      <div style={{ fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8B5A2B', marginBottom: 16 }}>
        Tape 1 · One-liner
      </div>
      <EditableText
        value={tape.text}
        onChange={v => onChange({ text: v })}
        multiline
        placeholder="[STATUS] · Address — N units · ... Atlas read: ..."
        style={{ display: 'block', minHeight: 80, whiteSpace: 'pre-wrap' }}
      />
    </div>
  )
}

function Tape2Surface({
  tape,
  onChange,
  listingAddress,
  listingCity,
  listingState,
}: {
  tape: { headline: string; deck: string; body_html: string }
  onChange: (t: { headline: string; deck: string; body_html: string }) => void
  listingAddress: string | null
  listingCity: string | null
  listingState: string | null
}) {
  return (
    <div style={postSurfaceStyle}>
      <div style={topMetaStyle}>
        <span>{listingAddress ?? '—'} · {[listingCity, listingState].filter(Boolean).join(', ')}</span>
      </div>
      <h1 style={headlineStyle}>
        <EditableText value={tape.headline} onChange={v => onChange({ ...tape, headline: v })} placeholder="[ATLAS HEADLINE]" />
      </h1>
      <p style={deckStyle}>
        <EditableText value={tape.deck} onChange={v => onChange({ ...tape, deck: v })} multiline placeholder="One-sentence deck" />
      </p>
      <hr style={hrStyle} />
      <EditableHTML
        value={tape.body_html}
        onChange={v => onChange({ ...tape, body_html: v })}
        style={proseStyle}
        placeholder="<p>Body paragraphs…</p>"
      />
    </div>
  )
}

function Tape3Surface({
  tape,
  onChange,
  articleId,
  listingAddress,
  listingCity,
  listingState,
  articleHeroPhotoUrl,
  listingHeroPhotoUrl,
}: {
  tape: NonNullable<AIDraftShape['tape_3']>
  onChange: (t: NonNullable<AIDraftShape['tape_3']>) => void
  articleId: string
  listingAddress: string | null
  listingCity: string | null
  listingState: string | null
  articleHeroPhotoUrl: string | null
  listingHeroPhotoUrl: string | null
}) {
  const takeaways = tape.takeaways ?? []
  return (
    <div style={postSurfaceStyle}>
      {/* Eyebrow */}
      <div style={eyebrowStyle}>
        For Sale / Sold · Entry № — · Broker Activity
      </div>
      {/* Headline */}
      <h1 style={headlineStyle}>
        <EditableText
          value={tape.headline}
          onChange={v => onChange({ ...tape, headline: v })}
          placeholder="[ATLAS HEADLINE]"
        />
      </h1>
      {/* Deck */}
      <p style={deckStyle}>
        <EditableText
          value={tape.deck}
          onChange={v => onChange({ ...tape, deck: v })}
          multiline
          placeholder="One-sentence deck naming the controversy"
        />
      </p>
      {/* Byline row */}
      <BylineRow value={tape.byline_html} onChange={v => onChange({ ...tape, byline_html: v })} />

      <hr style={hrStyle} />

      {/* Hero photo + caption */}
      <HeroPhotoEditor
        articleId={articleId}
        articleHeroUrl={articleHeroPhotoUrl}
        listingHeroUrl={listingHeroPhotoUrl}
        caption={tape.hero_caption}
        onCaptionChange={v => onChange({ ...tape, hero_caption: v })}
      />

      {/* Status tag */}
      <div style={{ marginBottom: 20, fontSize: 11, fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4F4F4B' }}>
        Status tag: <EditableText value={tape.status_tag} onChange={v => onChange({ ...tape, status_tag: v })} placeholder="For Sale · Just Listed" />
      </div>

      {/* Key takeaways */}
      <div style={{ padding: 24, background: '#F7E9CE', border: '1px solid #0A0A0A', marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8B5A2B', marginBottom: 10 }}>
          {takeaways.length} takeaways
        </div>
        <div style={{ fontFamily: '"Newsreader", Georgia, serif', fontStyle: 'italic', fontSize: 22, color: '#0A0A0A', marginBottom: 16, lineHeight: 1.3 }}>
          <EditableText value={tape.takeaways_subhead} onChange={v => onChange({ ...tape, takeaways_subhead: v })} placeholder="Subhead synthesizing the takeaways" />
        </div>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {takeaways.map((t, i) => (
            <li key={i} style={{ paddingLeft: 36, position: 'relative', marginBottom: 14, fontFamily: '"Newsreader", Georgia, serif', fontSize: 17, lineHeight: 1.55, color: '#1F1F1D' }}>
              <span style={{ position: 'absolute', left: 0, top: 2, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#8B5A2B' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <b style={{ color: '#0A0A0A' }}>
                <EditableText
                  value={t.bold}
                  onChange={v => {
                    const next = [...takeaways]
                    next[i] = { ...t, bold: v }
                    onChange({ ...tape, takeaways: next })
                  }}
                  placeholder="bold lede"
                />
              </b>{' '}
              <EditableText
                value={t.text}
                onChange={v => {
                  const next = [...takeaways]
                  next[i] = { ...t, text: v }
                  onChange({ ...tape, takeaways: next })
                }}
                placeholder="rest of takeaway"
              />
            </li>
          ))}
        </ol>
      </div>

      {/* Deal stats */}
      <DealStatsGrid
        html={tape.deal_stats_html}
        onChange={v => onChange({ ...tape, deal_stats_html: v })}
        propertyLabel={listingAddress ?? ''}
      />

      {/* Body — block per section */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 11, fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8B5A2B', marginBottom: 16 }}>
          Body sections
        </div>
        <BodyBlocks
          html={tape.body_html}
          onChange={v => onChange({ ...tape, body_html: v })}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Block-based body editor
// ============================================================================

type BodyBlock =
  | { id: string; type: 'intro'; html: string }
  | { id: string; type: 'section'; sectionId: string; heading: string; html: string }
  | { id: string; type: 'brokers'; html: string }

function BodyBlocks({ html, onChange }: { html: string; onChange: (v: string) => void }) {
  // parseBodyBlocks uses DOMParser which is browser-only. During SSR we render
  // a placeholder, then re-parse for real on mount.
  const [blocks, setBlocks] = useState<BodyBlock[]>(() =>
    typeof window !== 'undefined' ? parseBodyBlocks(html) : []
  )
  useEffect(() => {
    if (blocks.length === 0 && html.trim()) {
      setBlocks(parseBodyBlocks(html))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function commit(next: BodyBlock[]) {
    setBlocks(next)
    onChange(serializeBodyBlocks(next))
  }

  function updateBlock(idx: number, patch: Partial<BodyBlock>) {
    const next = blocks.map((b, i): BodyBlock => {
      if (i !== idx) return b
      // Keep the discriminated union happy: spread per-type so TS knows which fields are valid.
      if (b.type === 'intro') return { ...b, ...patch } as BodyBlock
      return { ...b, ...patch } as BodyBlock
    })
    commit(next)
  }

  function deleteBlock(idx: number) {
    if (!confirm('Delete this block?')) return
    commit(blocks.filter((_, i) => i !== idx))
  }

  function insertSectionAfter(idx: number) {
    const newBlock: BodyBlock = {
      id: `new-${Date.now()}`,
      type: 'section',
      sectionId: 'new-section',
      heading: 'New section',
      html: '<p></p>',
    }
    const next = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)]
    commit(next)
  }

  function insertIntroBlock() {
    const introExists = blocks.some(b => b.type === 'intro')
    if (introExists) return
    const newBlock: BodyBlock = { id: `intro-${Date.now()}`, type: 'intro', html: '<p class="drop"></p>' }
    commit([newBlock, ...blocks])
  }

  function moveSection(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= blocks.length) return
    // Only re-order sections among themselves; intro stays at position 0.
    if (blocks[idx].type !== 'section' || blocks[target].type !== 'section') return
    const next = [...blocks]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    commit(next)
  }

  const hasIntro = blocks.some(b => b.type === 'intro')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!hasIntro && (
        <InsertBar onAddSection={() => insertSectionAfter(-1)} onAddIntro={insertIntroBlock} />
      )}
      {blocks.map((block, idx) => (
        <BlockCard
          key={block.id}
          block={block}
          index={idx}
          totalSections={blocks.filter(b => b.type === 'section').length}
          sectionPosition={blocks.slice(0, idx + 1).filter(b => b.type === 'section').length}
          onPatch={patch => updateBlock(idx, patch)}
          onDelete={() => deleteBlock(idx)}
          onInsertAfter={() => insertSectionAfter(idx)}
          onMoveUp={() => moveSection(idx, -1)}
          onMoveDown={() => moveSection(idx, 1)}
        />
      ))}
      {blocks.length === 0 && (
        <InsertBar onAddSection={() => insertSectionAfter(-1)} onAddIntro={insertIntroBlock} />
      )}
    </div>
  )
}

function BlockCard({
  block,
  totalSections,
  sectionPosition,
  onPatch,
  onDelete,
  onInsertAfter,
  onMoveUp,
  onMoveDown,
}: {
  block: BodyBlock
  index: number
  totalSections: number
  sectionPosition: number
  onPatch: (patch: Partial<BodyBlock>) => void
  onDelete: () => void
  onInsertAfter: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const isIntro = block.type === 'intro'
  const isBrokers = block.type === 'brokers'
  const label = isBrokers
    ? 'Listing broker'
    : isIntro
    ? 'Intro'
    : `Section ${String(sectionPosition).padStart(2, '0')} / ${String(totalSections).padStart(2, '0')}`
  const toolbarBg = isBrokers ? '#FFF8E7' : '#F7E9CE'
  const toolbarColor = isBrokers ? '#8B6914' : '#8B5A2B'
  return (
    <div>
      <div
        style={{
          border: '1px solid #D6CBB3',
          background: '#FFF',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {/* Block toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            background: toolbarBg,
            borderBottom: '1px solid #D6CBB3',
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: toolbarColor,
          }}
        >
          <span>{label}</span>
          <div style={{ flex: 1 }} />
          {!isIntro && !isBrokers && (
            <>
              <button onClick={onMoveUp} title="Move up" style={iconButtonStyle}>↑</button>
              <button onClick={onMoveDown} title="Move down" style={iconButtonStyle}>↓</button>
            </>
          )}
          <button onClick={onDelete} title="Delete" style={{ ...iconButtonStyle, color: '#c0392b' }}>×</button>
        </div>

        {/* Block content */}
        <div style={{ padding: '16px 20px' }}>
          {block.type === 'section' && (
            <h2
              style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontWeight: 500,
                fontSize: 'clamp(24px, 2.6vw, 32px)',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: '#0A0A0A',
                margin: '0 0 14px',
              }}
            >
              <EditableText
                value={block.heading}
                onChange={v => {
                  // Slugify the heading into the section id so TOC anchors track.
                  const sectionId = slugify(v) || 'section'
                  onPatch({ heading: v, sectionId } as Partial<BodyBlock>)
                }}
                placeholder="Section heading"
              />
            </h2>
          )}
          <EditableHTML
            value={block.html}
            onChange={v => onPatch({ html: v } as Partial<BodyBlock>)}
            style={proseStyle}
            placeholder={isBrokers ? "<div class='brokers'>…</div>" : "<p>Content…</p>"}
          />
        </div>
      </div>

      {/* Insert section after — but not after the brokers block (it should stay last) */}
      {!isBrokers && <InsertBar onAddSection={onInsertAfter} />}
    </div>
  )
}

function InsertBar({ onAddSection, onAddIntro }: { onAddSection: () => void; onAddIntro?: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        padding: '4px 0',
        opacity: 0.5,
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
    >
      <button onClick={onAddSection} style={addButtonStyle}>+ Add section</button>
      {onAddIntro && <button onClick={onAddIntro} style={addButtonStyle}>+ Add intro</button>}
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: '2px 6px',
  color: '#8B5A2B',
  lineHeight: 1,
}

const addButtonStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, Menlo, monospace',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  padding: '4px 12px',
  background: 'transparent',
  border: '1px dashed #D6CBB3',
  borderRadius: 2,
  color: '#8B5A2B',
  cursor: 'pointer',
}

function parseBodyBlocks(html: string): BodyBlock[] {
  if (!html.trim()) return []
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement | null
  if (!root) return []

  const blocks: BodyBlock[] = []
  let brokersBlock: BodyBlock | null = null
  let pendingIntro: HTMLElement[] = []
  let currentSection: { heading: string; sectionId: string; nodes: HTMLElement[] } | null = null

  function flushIntro() {
    if (pendingIntro.length === 0) return
    const html = pendingIntro.map(n => n.outerHTML).join('\n')
    blocks.push({ id: `intro-0`, type: 'intro', html })
    pendingIntro = []
  }

  function flushSection() {
    if (!currentSection) return
    // If the section's content ends with a brokers block, peel it out.
    const lastNode = currentSection.nodes[currentSection.nodes.length - 1]
    if (lastNode && lastNode.classList?.contains('brokers')) {
      brokersBlock = { id: 'brokers', type: 'brokers', html: lastNode.outerHTML }
      currentSection.nodes = currentSection.nodes.slice(0, -1)
    }
    const html = currentSection.nodes.map(n => n.outerHTML).join('\n')
    blocks.push({
      id: `section-${blocks.length}`,
      type: 'section',
      sectionId: currentSection.sectionId,
      heading: currentSection.heading,
      html,
    })
    currentSection = null
  }

  Array.from(root.children).forEach(child => {
    const el = child as HTMLElement
    // Brokers block detected as a top-level child — promote out.
    if (el.classList?.contains('brokers')) {
      brokersBlock = { id: 'brokers', type: 'brokers', html: el.outerHTML }
      return
    }
    if (el.tagName === 'H2') {
      flushIntro()
      flushSection()
      currentSection = {
        heading: el.textContent ?? '',
        sectionId: el.id || slugify(el.textContent ?? '') || 'section',
        nodes: [],
      }
    } else if (currentSection) {
      currentSection.nodes.push(el)
    } else {
      pendingIntro.push(el)
    }
  })
  flushIntro()
  flushSection()
  if (brokersBlock) blocks.push(brokersBlock)
  return blocks
}

function serializeBodyBlocks(blocks: BodyBlock[]): string {
  return blocks
    .map(b => {
      if (b.type === 'intro') return b.html
      if (b.type === 'brokers') return b.html
      const headingEscaped = b.heading
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return `<h2 id="${b.sectionId}">${headingEscaped}</h2>\n${b.html}`
    })
    .join('\n\n')
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

// ============================================================================
// Small editable primitives
// ============================================================================

function EditableText({
  value,
  onChange,
  multiline = false,
  placeholder = '',
  style,
}: {
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  placeholder?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [focused, setFocused] = useState(false)

  // contentEditable nodes don't play well with React's reconciliation, so we
  // leave the span empty in JSX and own the text via useEffect. suppressHydrationWarning
  // tells React not to compare server vs client innerHTML on first render.
  useEffect(() => {
    if (ref.current && !focused && ref.current.innerText !== value) {
      ref.current.innerText = value
    }
  }, [value, focused])

  const placeholderHit = PLACEHOLDER_RE.test(value)
  PLACEHOLDER_RE.lastIndex = 0

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      suppressHydrationWarning
      onFocus={() => setFocused(true)}
      onBlur={e => {
        setFocused(false)
        onChange(e.currentTarget.innerText)
      }}
      onKeyDown={e => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).blur()
        }
      }}
      data-placeholder={placeholder}
      style={{
        outline: 'none',
        borderRadius: 2,
        padding: '1px 4px',
        margin: '-1px -4px',
        transition: 'background 0.1s, box-shadow 0.1s',
        background: focused ? 'rgba(154,107,63,0.08)' : placeholderHit ? 'rgba(192,140,42,0.08)' : 'transparent',
        boxShadow: focused
          ? 'inset 0 0 0 1px #9A6B3F'
          : placeholderHit
          ? 'inset 0 0 0 1px rgba(192,140,42,0.5)'
          : 'inset 0 0 0 1px transparent',
        cursor: 'text',
        ...style,
      }}
    />
  )
}

function EditableHTML({
  value,
  onChange,
  placeholder = '',
  style,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)

  // Hydrate the editor from the current value when it differs (e.g. tier switch).
  useEffect(() => {
    if (ref.current && !focused && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || `<p style="color:#999;font-style:italic;">${placeholder}</p>`
    }
  }, [value, focused, placeholder])

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      suppressHydrationWarning
      onFocus={() => setFocused(true)}
      onBlur={e => {
        setFocused(false)
        onChange(e.currentTarget.innerHTML)
      }}
      style={{
        outline: 'none',
        borderRadius: 2,
        padding: '8px 12px',
        margin: '-8px -12px',
        transition: 'background 0.1s, box-shadow 0.1s',
        background: focused ? 'rgba(154,107,63,0.04)' : 'transparent',
        boxShadow: focused ? 'inset 0 0 0 1px #9A6B3F' : 'inset 0 0 0 1px transparent',
        cursor: 'text',
        ...style,
      }}
    />
  )
}

function BylineRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const items = useMemo(() => parseByline(value), [value])

  function update(i: number, next: { label: string; val: string }) {
    const out = [...items]
    out[i] = next
    onChange(stringifyByline(out))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto) 1fr', gap: 32, paddingTop: 18, borderTop: '1px solid #D6CBB3', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4F4F4B', marginBottom: 24 }}>
      {items.map((it, i) => (
        <div key={i}>
          <div style={{ color: '#0A0A0A', marginBottom: 4 }}>
            <EditableText value={it.label} onChange={v => update(i, { ...it, label: v })} />
          </div>
          <div>
            <EditableText value={it.val} onChange={v => update(i, { ...it, val: v })} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DealStatsGrid({
  html,
  onChange,
  propertyLabel,
}: {
  html: string
  onChange: (v: string) => void
  propertyLabel: string
}) {
  const stats = useMemo(() => parseDealStats(html), [html])

  function update(i: number, next: { k: string; v: string; s: string }) {
    const out = [...stats]
    out[i] = next
    onChange(stringifyDealStats(out))
  }

  return (
    <div style={{ marginBottom: 32, padding: '24px 0', background: '#F7E9CE', borderTop: '1px solid #0A0A0A', borderBottom: '1px solid #0A0A0A' }}>
      <div style={{ fontSize: 11, fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8B5A2B', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #0A0A0A' }}>
        Deal Stats · {propertyLabel}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ padding: '16px 20px', background: '#FFF4E3', borderRight: '1px dotted #D6CBB3' }}>
            <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4F4F4B', marginBottom: 6 }}>
              <EditableText value={stat.k} onChange={v => update(i, { ...stat, k: v })} placeholder="LABEL" />
            </div>
            <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 22, color: '#0A0A0A', fontWeight: 500, marginBottom: 4 }}>
              <EditableText value={stat.v} onChange={v => update(i, { ...stat, v: v })} placeholder="value" />
            </div>
            <div style={{ fontFamily: '"Newsreader", Georgia, serif', fontSize: 13, color: '#4F4F4B', fontStyle: 'italic' }}>
              <EditableText value={stat.s} onChange={v => update(i, { ...stat, s: v })} placeholder="sub-label" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RailCard({
  label,
  children,
  bg = '#fff',
  border = '#e5e5e5',
  labelColor = '#9A6B3F',
}: {
  label: string
  children: React.ReactNode
  bg?: string
  border?: string
  labelColor?: string
}) {
  return (
    <div style={{ padding: 14, background: bg, border: `1px solid ${border}`, borderRadius: 4 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: labelColor, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

// ============================================================================
// HTML <-> structured conversions for byline + deal stats
// (using DOMParser so we tolerate whatever the AI produced)
// ============================================================================

function parseByline(html: string): Array<{ label: string; val: string }> {
  if (!html) return []
  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
    const items: Array<{ label: string; val: string }> = []
    doc.querySelectorAll('div > div').forEach(div => {
      const b = div.querySelector('b')
      const label = b?.textContent ?? ''
      // value = the rest of the div's text, minus the bold part
      const fullText = div.textContent ?? ''
      const val = fullText.slice(label.length).trim()
      items.push({ label, val })
    })
    return items.length ? items : [{ label: '', val: '' }]
  } catch {
    return [{ label: '', val: '' }]
  }
}

function stringifyByline(items: Array<{ label: string; val: string }>): string {
  return items.map(it => `<div><b>${escapeHTML(it.label)}</b>${escapeHTML(it.val)}</div>`).join('\n')
}

function parseDealStats(html: string): Array<{ k: string; v: string; s: string }> {
  if (!html) return []
  try {
    const doc = new DOMParser().parseFromString(`<div class="stats-grid">${html}</div>`, 'text/html')
    const stats: Array<{ k: string; v: string; s: string }> = []
    doc.querySelectorAll('.stat').forEach(stat => {
      // Preferred shape: <div class="k">…</div><div class="v">…</div><div class="s">…</div>
      const kDiv = stat.querySelector('.k')
      const vDiv = stat.querySelector('.v')
      const sDiv = stat.querySelector('.s')
      if (kDiv || vDiv || sDiv) {
        stats.push({
          k: kDiv?.textContent ?? '',
          v: vDiv?.textContent ?? '',
          s: sDiv?.textContent ?? '',
        })
        return
      }
      // Compact fallback: <div class="stat"><b>Label</b>Value</div>
      // The AI drifts to this format. We read it, render normally, and on
      // re-save the stringifier writes the proper 3-div structure back.
      const bTag = stat.querySelector('b, strong')
      if (bTag) {
        const k = bTag.textContent ?? ''
        const full = stat.textContent ?? ''
        const v = full.startsWith(k) ? full.slice(k.length).trim() : full.trim()
        stats.push({ k, v, s: '' })
        return
      }
      // Last resort: stuff everything into the value cell so the user can fix it.
      stats.push({ k: '', v: stat.textContent?.trim() ?? '', s: '' })
    })
    return stats
  } catch {
    return []
  }
}

function stringifyDealStats(stats: Array<{ k: string; v: string; s: string }>): string {
  return stats
    .map(
      stat =>
        `<div class="stat"><div class="k">${escapeHTML(stat.k)}</div><div class="v">${escapeHTML(stat.v)}</div><div class="s">${escapeHTML(stat.s)}</div></div>`
    )
    .join('\n')
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ============================================================================
// Visual styles — these intentionally mirror post.css so the editor surface
// looks like the rendered post. We don't import atlas-v2.css here because
// that would also affect the chrome of /listings, /dashboard, etc.
// ============================================================================

const postSurfaceStyle: React.CSSProperties = {
  padding: 'clamp(28px, 4vw, 56px)',
  background: '#FFF4E3',
  border: '1px solid #D6CBB3',
  borderRadius: 4,
  color: '#1F1F1D',
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, Menlo, monospace',
  fontSize: 11,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#8B5A2B',
  marginBottom: 18,
}

const headlineStyle: React.CSSProperties = {
  fontFamily: '"Newsreader", Georgia, serif',
  fontWeight: 500,
  fontSize: 'clamp(34px, 5vw, 64px)',
  lineHeight: 1.0,
  letterSpacing: '-0.025em',
  margin: '0 0 24px',
  color: '#0A0A0A',
}

const deckStyle: React.CSSProperties = {
  fontFamily: '"Newsreader", Georgia, serif',
  fontWeight: 300,
  fontSize: 'clamp(17px, 1.8vw, 22px)',
  lineHeight: 1.45,
  color: '#1F1F1D',
  margin: '0 0 28px',
  maxWidth: '54ch',
}

const captionStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, Menlo, monospace',
  fontSize: 11,
  letterSpacing: '0.1em',
  color: '#4F4F4B',
  textTransform: 'uppercase',
  paddingTop: 12,
  borderTop: '1px dotted #D6CBB3',
  marginTop: 14,
}

const proseStyle: React.CSSProperties = {
  fontFamily: '"Newsreader", Georgia, serif',
  fontSize: 17,
  lineHeight: 1.7,
  color: '#1F1F1D',
  minHeight: 200,
}

const hrStyle: React.CSSProperties = {
  border: 0,
  borderTop: '1px solid #D6CBB3',
  margin: '0 0 24px',
}

const topMetaStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, Menlo, monospace',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#4F4F4B',
  marginBottom: 16,
}

function actionButtonStyle(variant: 'primary' | 'ghost' | 'disabled', busy: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '8px 18px',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    border: 'none',
    borderRadius: 2,
    cursor: busy || variant === 'disabled' ? 'not-allowed' : 'pointer',
  }
  if (variant === 'primary') return { ...base, background: '#9A6B3F', color: '#fff' }
  if (variant === 'ghost') return { ...base, background: 'transparent', color: '#fff', border: '1px solid #444' }
  return { ...base, background: '#333', color: '#666' }
}

function blankTape3(): NonNullable<AIDraftShape['tape_3']> {
  return {
    headline: '',
    deck: '',
    status_tag: '',
    hero_caption: '',
    takeaways_subhead: '',
    takeaways: [],
    deal_stats_html: '',
    body_html: '',
    byline_html: '',
  }
}

function pickHeadline(d: AIDraftShape, tier: 1 | 2 | 3): string {
  if (tier === 3) return d.tape_3?.headline ?? '[ATLAS HEADLINE]'
  if (tier === 2) return d.tape_2?.headline ?? '[ATLAS HEADLINE]'
  return d.tape_1?.text?.split('\n')[0]?.slice(0, 200) ?? '[ATLAS HEADLINE]'
}

function pickDeck(d: AIDraftShape, tier: 1 | 2 | 3): string | null {
  if (tier === 3) return d.tape_3?.deck ?? null
  if (tier === 2) return d.tape_2?.deck ?? null
  return null
}

function projectTapeToColumns(d: AIDraftShape, tier: 1 | 2 | 3) {
  if (tier === 3 && d.tape_3) {
    const t = d.tape_3
    return {
      headline: t.headline,
      deck: t.deck,
      excerpt: t.deck,
      status_tag: t.status_tag,
      hero_caption: t.hero_caption,
      takeaways_subhead: t.takeaways_subhead,
      takeaways: t.takeaways as unknown as never,
      deal_stats_html: t.deal_stats_html,
      body_html: t.body_html,
      byline_html: t.byline_html,
    }
  }
  if (tier === 2 && d.tape_2) {
    return {
      headline: d.tape_2.headline,
      deck: d.tape_2.deck,
      excerpt: d.tape_2.deck,
      body_html: d.tape_2.body_html,
      status_tag: null,
      hero_caption: null,
      takeaways_subhead: null,
      takeaways: null,
      deal_stats_html: null,
      byline_html: null,
    }
  }
  return {
    headline: d.tape_1?.text?.split('\n')[0]?.slice(0, 200) ?? '[ATLAS HEADLINE]',
    deck: null,
    excerpt: d.tape_1?.text ?? null,
    body_html: `<p>${(d.tape_1?.text ?? '').replace(/\n/g, '</p><p>')}</p>`,
    status_tag: null,
    hero_caption: null,
    takeaways_subhead: null,
    takeaways: null,
    deal_stats_html: null,
    byline_html: null,
  }
}
