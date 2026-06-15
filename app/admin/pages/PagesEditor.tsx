'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ContentField, CollectionDef, CollectionItem, PageSlug } from '@/lib/content-registry'
import CollectionEditor from './CollectionEditor'

type Status = 'idle' | 'saving' | 'saved' | 'error'

const PAGE_LABELS: Record<PageSlug, string> = {
  about: 'About',
  contact: 'Contact',
  build: 'Build',
}

export default function PagesEditor({
  groups,
  initialValues,
  initialOverridden,
  collectionGroups,
  initialItems,
  initialCollectionOverridden,
}: {
  groups: Record<PageSlug, ContentField[]>
  initialValues: Record<string, string>
  initialOverridden: Record<string, boolean>
  collectionGroups: Record<PageSlug, CollectionDef[]>
  initialItems: Record<string, CollectionItem[]>
  initialCollectionOverridden: Record<string, boolean>
}) {
  const [tab, setTab] = useState<PageSlug>('about')

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #e5e5e5' }}>
        {(Object.keys(PAGE_LABELS) as PageSlug[]).map(slug => (
          <button
            key={slug}
            onClick={() => setTab(slug)}
            style={{
              padding: '10px 16px',
              fontSize: 12,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              background: 'transparent',
              color: tab === slug ? '#111' : '#888',
              border: 'none',
              borderBottom: tab === slug ? '2px solid #9A6B3F' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {PAGE_LABELS[slug]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups[tab].map(field => (
          <FieldEditor
            key={field.key}
            field={field}
            initialValue={initialValues[field.key]}
            initiallyOverridden={initialOverridden[field.key]}
          />
        ))}

        {collectionGroups[tab].map(def => (
          <CollectionEditor
            key={def.key}
            def={def}
            initialItems={initialItems[def.key]}
            initiallyOverridden={initialCollectionOverridden[def.key]}
          />
        ))}
      </div>
    </div>
  )
}

function FieldEditor({
  field,
  initialValue,
  initiallyOverridden,
}: {
  field: ContentField
  initialValue: string
  initiallyOverridden: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [value, setValue] = useState(initialValue)
  const [overridden, setOverridden] = useState(initiallyOverridden)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const dirty = value !== initialValue
  const matchesDefault = value.trim() === field.defaultText.trim()

  async function save() {
    setStatus('saving')
    setError(null)
    try {
      const { error: upErr } = await supabase
        .from('content_blocks')
        .upsert({ key: field.key, body: value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (upErr) throw new Error(upErr.message)
      setOverridden(true)
      setStatus('saved')
      router.refresh()
      setTimeout(() => setStatus('idle'), 1800)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function reset() {
    if (!confirm(`Reset "${field.label}" to the default copy? This deletes your override.`)) return
    setStatus('saving')
    setError(null)
    try {
      const { error: delErr } = await supabase.from('content_blocks').delete().eq('key', field.key)
      if (delErr) throw new Error(delErr.message)
      setValue(field.defaultText)
      setOverridden(false)
      setStatus('saved')
      router.refresh()
      setTimeout(() => setStatus('idle'), 1800)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Reset failed')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 14,
    fontFamily: 'Georgia, serif',
    lineHeight: 1.5,
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: 3,
    color: '#111',
    background: '#fff',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 4, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
        <label htmlFor={`f-${field.key}`} style={{ fontSize: 12, fontWeight: 600, color: '#111', letterSpacing: 0.3 }}>
          {field.label}
        </label>
        <span style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: overridden ? '#9A6B3F' : '#aaa' }}>
          {overridden ? 'edited' : 'default'}
        </span>
      </div>
      <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, color: '#aaa', marginBottom: 8 }}>
        {field.key}
      </div>

      {field.multiline ? (
        <textarea
          id={`f-${field.key}`}
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={Math.max(3, Math.ceil(value.length / 90))}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
        />
      ) : (
        <input
          id={`f-${field.key}`}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          style={inputStyle}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button
          onClick={save}
          disabled={!dirty || status === 'saving'}
          style={{
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            padding: '7px 14px',
            background: dirty && status !== 'saving' ? '#111' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: 2,
            cursor: dirty && status !== 'saving' ? 'pointer' : 'not-allowed',
          }}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {overridden && (
          <button
            onClick={reset}
            disabled={status === 'saving'}
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              padding: '7px 14px',
              background: 'transparent',
              color: '#9A6B3F',
              border: '1px solid #9A6B3F',
              borderRadius: 2,
              cursor: status === 'saving' ? 'not-allowed' : 'pointer',
            }}
          >
            Reset to default
          </button>
        )}
        {status === 'saved' && <span style={{ fontSize: 11, color: '#0A5417' }}>✓ saved</span>}
        {error && <span style={{ fontSize: 11, color: '#A31414' }}>{error}</span>}
        {!dirty && matchesDefault && overridden && (
          <span style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>matches default — reset to clear</span>
        )}
      </div>
    </div>
  )
}
