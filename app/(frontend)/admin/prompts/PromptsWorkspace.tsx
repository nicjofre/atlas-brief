'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Version = { body: string; at: string; by: string | null }

export type Surface = 'shared' | 'tape_3' | 'broker_email' | 'system'

export type Prompt = {
  id: string
  key: string
  sort_order: number
  description: string
  body: string
  category: 'content' | 'system'
  surface: Surface
  version_history: Version[]
}

// Display order + labels for sidebar grouping. System is last and toggled.
const SURFACE_GROUPS: { surface: Surface; label: string; tagline: string }[] = [
  { surface: 'shared', label: 'Shared', tagline: 'Voice and rules that apply to every article' },
  { surface: 'tape_3', label: 'Article', tagline: 'Full brief — 1,000-1,200 words' },
  { surface: 'broker_email', label: 'Broker email', tagline: 'Outreach template (CRM)' },
  { surface: 'system', label: 'System', tagline: 'Structural — editing can break the editor' },
]

export default function PromptsWorkspace({ initial }: { initial: Prompt[] }) {
  const router = useRouter()
  const supabase = createClient()

  // Server-side state of each prompt (what's in the DB).
  const [serverPrompts, setServerPrompts] = useState<Prompt[]>(initial)
  // In-memory drafts keyed by prompt id. A prompt only has an entry here while
  // the user has typed unsaved changes; switching tabs keeps them around.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  // Default-select the first non-system prompt so David lands on something safe.
  const firstContent = initial.find(p => p.surface !== 'system') ?? initial[0]
  const [selectedId, setSelectedId] = useState<string>(firstContent?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSavedAt, setJustSavedAt] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showSystem, setShowSystem] = useState(false)

  const selected = serverPrompts.find(p => p.id === selectedId)
  const isSystem = selected?.surface === 'system'
  // Group prompts by surface for the sidebar. Each visible group renders its
  // prompts nested underneath. System group is gated by the toggle.
  const grouped = useMemo(() => {
    return SURFACE_GROUPS
      .filter(g => g.surface !== 'system' || showSystem)
      .map(g => ({
        ...g,
        prompts: serverPrompts
          .filter(p => p.surface === g.surface)
          .sort((a, b) => a.sort_order - b.sort_order),
      }))
      .filter(g => g.prompts.length > 0)
  }, [serverPrompts, showSystem])

  useEffect(() => {
    setShowHistory(false)
    setError(null)
  }, [selectedId])

  const currentBody = useMemo(() => {
    if (!selected) return ''
    return drafts[selected.id] ?? selected.body
  }, [drafts, selected])

  const dirty = selected ? currentBody !== selected.body : false

  const dirtyIds = useMemo(() => {
    const set = new Set<string>()
    for (const p of serverPrompts) {
      if (drafts[p.id] != null && drafts[p.id] !== p.body) set.add(p.id)
    }
    return set
  }, [drafts, serverPrompts])

  function onChangeBody(next: string) {
    if (!selected) return
    setDrafts(d => ({ ...d, [selected.id]: next }))
  }

  async function save() {
    if (!selected || !dirty) return
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const newHistory: Version[] = [
        { body: selected.body, at: new Date().toISOString(), by: user?.id ?? null },
        ...selected.version_history,
      ]
      const { error: updErr } = await supabase
        .from('prompts')
        .update({
          body: currentBody,
          version_history: newHistory as unknown as never,
          updated_by: user?.id ?? null,
        })
        .eq('id', selected.id)
      if (updErr) throw new Error(updErr.message)
      setServerPrompts(prev =>
        prev.map(p => (p.id === selected.id ? { ...p, body: currentBody, version_history: newHistory } : p))
      )
      setDrafts(d => {
        const { [selected.id]: _, ...rest } = d
        return rest
      })
      setJustSavedAt(Date.now())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function revert() {
    if (!selected || selected.version_history.length === 0) return
    if (!confirm('Restore the previous version? The current body will be archived to history.')) return
    setSaving(true)
    setError(null)
    try {
      const [previous, ...rest] = selected.version_history
      const { data: { user } } = await supabase.auth.getUser()
      const newHistory: Version[] = [
        { body: selected.body, at: new Date().toISOString(), by: user?.id ?? null },
        ...rest,
      ]
      const { error: updErr } = await supabase
        .from('prompts')
        .update({
          body: previous.body,
          version_history: newHistory as unknown as never,
          updated_by: user?.id ?? null,
        })
        .eq('id', selected.id)
      if (updErr) throw new Error(updErr.message)
      setServerPrompts(prev =>
        prev.map(p => (p.id === selected.id ? { ...p, body: previous.body, version_history: newHistory } : p))
      )
      setDrafts(d => {
        const { [selected.id]: _, ...rest } = d
        return rest
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revert failed')
    } finally {
      setSaving(false)
    }
  }

  if (!selected) {
    return (
      <div style={{ padding: 24, color: '#666', fontSize: 13 }}>No prompts found.</div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: 24,
        alignItems: 'start',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          position: 'sticky',
          top: 16,
          background: '#fff',
          border: '1px solid #e5e5e5',
          borderRadius: 4,
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #eee', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F' }}>
          Surfaces · {grouped.reduce((n, g) => n + g.prompts.length, 0)}
        </div>
        {grouped.map(g => (
          <div key={g.surface}>
            <div
              style={{
                padding: '14px 14px 6px',
                background: g.surface === 'system' ? '#FFF8E7' : 'transparent',
                borderTop: '1px solid #eee',
              }}
            >
              <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: g.surface === 'system' ? '#8B6914' : '#9A6B3F' }}>
                {g.surface === 'system' && '⚙ '}{g.label}
              </div>
              <div style={{ fontSize: 10.5, color: '#888', marginTop: 2, lineHeight: 1.4 }}>
                {g.tagline}
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {g.prompts.map(p => {
                const active = p.id === selectedId
                const isDirty = dirtyIds.has(p.id)
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedId(p.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 14px 8px 28px',
                        border: 'none',
                        borderBottom: '1px solid #f6f6f6',
                        background: active ? '#FAFAF8' : 'transparent',
                        borderLeft: active ? '3px solid #9A6B3F' : '3px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: active ? '#111' : '#555', flex: 1 }}>
                        {p.key}
                      </span>
                      {isDirty && <span title="Unsaved changes" style={{ width: 6, height: 6, borderRadius: '50%', background: '#c08c2a' }} />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {/* Show/hide system surface toggle */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #eee', background: '#FAFAF8' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#666', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showSystem}
              onChange={e => setShowSystem(e.target.checked)}
            />
            Show system surface ({serverPrompts.filter(p => p.surface === 'system').length})
          </label>
        </div>
      </aside>

      {/* Main editor */}
      <main style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#9A6B3F' }}>
              § {String(selected.sort_order).padStart(2, '0')}
            </span>
            <code style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>{selected.key}</code>
            {isSystem && (
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  background: '#FFF8E7',
                  border: '1px solid #e8d49a',
                  color: '#8B6914',
                  borderRadius: 2,
                }}
              >
                ⚙ System
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#999', letterSpacing: 1 }}>
            {currentBody.length.toLocaleString()} chars · {selected.version_history.length} prior version{selected.version_history.length === 1 ? '' : 's'}
          </div>
        </div>
        {isSystem && (
          <div style={{ padding: '10px 14px', background: '#FFF8E7', border: '1px solid #e8d49a', borderRadius: 3, fontSize: 12, color: '#8B6914', marginBottom: 12, lineHeight: 1.5 }}>
            <strong>Heads up:</strong> this is a system prompt. It&apos;s coupled to the editor&apos;s
            placeholder regex and the AI&apos;s expected JSON output shape. Editing the framing or
            placeholder names can break the article editor. Voice and policy are safer to play with
            in the &quot;content&quot; prompts.
          </div>
        )}
        {selected.description && (
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.55, margin: '0 0 16px', maxWidth: '72ch' }}>
            {selected.description}
          </p>
        )}

        <textarea
          value={currentBody}
          onChange={e => onChangeBody(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 480,
            padding: 16,
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: 13,
            lineHeight: 1.6,
            color: '#111',
            background: '#fff',
            border: dirty ? '1px solid #c08c2a' : '1px solid #ddd',
            borderRadius: 4,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={save}
            disabled={!dirty || saving}
            style={{
              padding: '8px 18px',
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              background: dirty ? '#111' : '#eee',
              color: dirty ? '#fff' : '#999',
              border: 'none',
              borderRadius: 2,
              cursor: !dirty || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
          {selected.version_history.length > 0 && (
            <button
              onClick={revert}
              disabled={saving}
              style={{
                padding: '8px 16px',
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                background: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: 2,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Revert to previous
            </button>
          )}
          {selected.version_history.length > 0 && (
            <button
              onClick={() => setShowHistory(v => !v)}
              style={{
                padding: '8px 12px',
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                background: 'transparent',
                color: '#9A6B3F',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {showHistory ? 'Hide' : 'View'} history
            </button>
          )}
          {justSavedAt && Date.now() - justSavedAt < 4000 && (
            <span style={{ fontSize: 11, color: '#7FB77E', letterSpacing: 1 }}>✓ saved</span>
          )}
          {dirty && <span style={{ fontSize: 11, color: '#c08c2a', letterSpacing: 1 }}>unsaved changes</span>}
          {error && <span style={{ fontSize: 11, color: '#c0392b' }}>{error}</span>}
        </div>

        {showHistory && selected.version_history.length > 0 && (
          <div style={{ marginTop: 20, padding: 16, background: '#F0F4FA', border: '1px dashed #5b87b5', borderRadius: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#5b87b5', marginBottom: 10 }}>
              Prior versions (newest first)
            </div>
            {selected.version_history.map((v, i) => (
              <details key={i} style={{ marginBottom: 8 }}>
                <summary style={{ fontSize: 12, cursor: 'pointer', color: '#385878' }}>
                  {new Date(v.at).toLocaleString()} · {v.body.length.toLocaleString()} chars
                </summary>
                <pre style={{ fontSize: 12, background: '#fff', padding: 10, marginTop: 6, border: '1px solid #ddd', borderRadius: 2, maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                  {v.body}
                </pre>
              </details>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
