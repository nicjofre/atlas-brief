'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPropertyAsset } from '@/lib/upload-image'
import { resolveHeroUrl } from '@/lib/db/hero-url'
import type { CollectionDef, CollectionItem, Pair } from '@/lib/content-registry'

type Status = 'idle' | 'saving' | 'saved' | 'error'

// Build a blank item from a collection's field defs: scalars -> '', pairs -> [].
function blankItem(def: CollectionDef): CollectionItem {
  const item: CollectionItem = {}
  for (const f of def.fields) item[f.key] = f.type === 'pairs' ? [] : ''
  return item
}

export default function CollectionEditor({
  def,
  initialItems,
  initiallyOverridden,
}: {
  def: CollectionDef
  initialItems: CollectionItem[]
  initiallyOverridden: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<CollectionItem[]>(initialItems)
  const [overridden, setOverridden] = useState(initiallyOverridden)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  // Snapshot for dirty-checking; reset on save/reset.
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialItems))
  const dirty = JSON.stringify(items) !== baseline

  function updateItem(idx: number, fieldKey: string, value: string | Pair[]) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [fieldKey]: value } : it)))
  }

  function addItem() {
    setItems(prev => [...prev, blankItem(def)])
  }

  function removeItem(idx: number) {
    if (!confirm(`Remove this ${def.itemLabel.toLowerCase()}?`)) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function move(idx: number, dir: -1 | 1) {
    setItems(prev => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  async function save() {
    setStatus('saving')
    setError(null)
    try {
      const { error: upErr } = await supabase
        .from('page_collections')
        .upsert(
          { key: def.key, page: def.page, items, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        )
      if (upErr) throw new Error(upErr.message)
      setOverridden(true)
      setBaseline(JSON.stringify(items))
      setStatus('saved')
      router.refresh()
      setTimeout(() => setStatus('idle'), 1800)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function reset() {
    if (!confirm(`Reset "${def.label}" to the default items? This deletes your edits.`)) return
    setStatus('saving')
    setError(null)
    try {
      const { error: delErr } = await supabase.from('page_collections').delete().eq('key', def.key)
      if (delErr) throw new Error(delErr.message)
      setItems(def.defaultItems)
      setBaseline(JSON.stringify(def.defaultItems))
      setOverridden(false)
      setStatus('saved')
      router.refresh()
      setTimeout(() => setStatus('idle'), 1800)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Reset failed')
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 4, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4, gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{def.label}</div>
        <span style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: overridden ? '#9A6B3F' : '#aaa' }}>
          {overridden ? 'edited' : 'default'}
        </span>
      </div>
      {def.hint && <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>{def.hint}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item, idx) => (
          <ItemCard
            key={idx}
            def={def}
            item={item}
            index={idx}
            count={items.length}
            supabase={supabase}
            onChange={(fk, v) => updateItem(idx, fk, v)}
            onRemove={() => removeItem(idx)}
            onMove={dir => move(idx, dir)}
          />
        ))}
      </div>

      <button onClick={addItem} style={addBtnStyle}>
        + Add {def.itemLabel.toLowerCase()}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid #eee' }}>
        <button
          onClick={save}
          disabled={!dirty || status === 'saving'}
          style={{
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            padding: '8px 16px',
            background: dirty && status !== 'saving' ? '#111' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: 2,
            cursor: dirty && status !== 'saving' ? 'pointer' : 'not-allowed',
          }}
        >
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
        {overridden && (
          <button onClick={reset} disabled={status === 'saving'} style={resetBtnStyle}>
            Reset to default
          </button>
        )}
        {status === 'saved' && <span style={{ fontSize: 11, color: '#0A5417' }}>✓ saved</span>}
        {error && <span style={{ fontSize: 11, color: '#A31414' }}>{error}</span>}
      </div>
    </div>
  )
}

function ItemCard({
  def,
  item,
  index,
  count,
  supabase,
  onChange,
  onRemove,
  onMove,
}: {
  def: CollectionDef
  item: CollectionItem
  index: number
  count: number
  supabase: ReturnType<typeof createClient>
  onChange: (fieldKey: string, value: string | Pair[]) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const title = (item.name as string) || (item.code as string) || `${def.itemLabel} ${index + 1}`
  return (
    <div style={{ background: '#FAFAF8', border: '1px solid #e5e5e5', borderRadius: 4, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>{title}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onMove(-1)} disabled={index === 0} style={iconBtnStyle(index === 0)} title="Move up">↑</button>
          <button onClick={() => onMove(1)} disabled={index === count - 1} style={iconBtnStyle(index === count - 1)} title="Move down">↓</button>
          <button onClick={onRemove} style={{ ...iconBtnStyle(false), color: '#A31414', borderColor: '#e3b3b3' }} title="Remove">✕</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {def.fields.map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>
              {f.label}
              {f.hint && <span style={{ fontWeight: 400, color: '#aaa', marginLeft: 8 }}>{f.hint}</span>}
            </label>
            {f.type === 'text' && (
              <input
                type="text"
                value={(item[f.key] as string) ?? ''}
                onChange={e => onChange(f.key, e.target.value)}
                style={inputStyle}
              />
            )}
            {f.type === 'textarea' && (
              <textarea
                value={(item[f.key] as string) ?? ''}
                onChange={e => onChange(f.key, e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
              />
            )}
            {f.type === 'image' && (
              <ImageField
                supabase={supabase}
                value={(item[f.key] as string) ?? ''}
                pathPrefix={`pages/${def.key}/${f.key}`}
                onChange={v => onChange(f.key, v)}
              />
            )}
            {f.type === 'pairs' && (
              <PairsField
                value={Array.isArray(item[f.key]) ? (item[f.key] as Pair[]) : []}
                onChange={v => onChange(f.key, v)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ImageField({
  supabase,
  value,
  pathPrefix,
  onChange,
}: {
  supabase: ReturnType<typeof createClient>
  value: string
  pathPrefix: string
  onChange: (v: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const display = resolveHeroUrl(supabase, value)

  async function handleFile(file: File) {
    setUploading(true)
    setErr(null)
    try {
      const { path } = await uploadPropertyAsset(supabase, { file, pathPrefix })
      const { data: { publicUrl } } = supabase.storage.from('property-assets').getPublicUrl(path)
      onChange(publicUrl)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {display ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={display} alt="" style={{ width: 120, height: 68, objectFit: 'cover', border: '1px solid #ddd', borderRadius: 3, opacity: uploading ? 0.5 : 1 }} />
        ) : (
          <div style={{ width: 120, height: 68, background: '#f0efe9', border: '1px dashed #ccc', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#aaa' }}>
            no photo
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={smallBtnStyle}>
            {uploading ? 'Uploading…' : display ? 'Replace photo' : 'Upload photo'}
          </button>
          {display && (
            <button onClick={() => onChange('')} disabled={uploading} style={{ ...smallBtnStyle, color: '#A31414', borderColor: '#e3b3b3' }}>
              Remove
            </button>
          )}
        </div>
      </div>
      {err && <div style={{ fontSize: 11, color: '#A31414', marginTop: 6 }}>{err}</div>}
    </div>
  )
}

function PairsField({ value, onChange }: { value: Pair[]; onChange: (v: Pair[]) => void }) {
  function update(i: number, key: keyof Pair, v: string) {
    onChange(value.map((p, idx) => (idx === i ? { ...p, [key]: v } : p)))
  }
  function add() {
    onChange([...value, { label: '', value: '' }])
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...value]
    const t = i + dir
    if (t < 0 || t >= next.length) return
    ;[next[i], next[t]] = [next[t], next[i]]
    onChange(next)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {value.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text"
            value={p.label}
            placeholder="Label"
            onChange={e => update(i, 'label', e.target.value)}
            style={{ ...inputStyle, flex: '0 0 38%' }}
          />
          <input
            type="text"
            value={p.value}
            placeholder="Value"
            onChange={e => update(i, 'value', e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => move(i, -1)} disabled={i === 0} style={iconBtnStyle(i === 0)} title="Move up">↑</button>
          <button onClick={() => move(i, 1)} disabled={i === value.length - 1} style={iconBtnStyle(i === value.length - 1)} title="Move down">↓</button>
          <button onClick={() => remove(i)} style={{ ...iconBtnStyle(false), color: '#A31414', borderColor: '#e3b3b3' }} title="Remove">✕</button>
        </div>
      ))}
      <button onClick={add} style={{ ...smallBtnStyle, alignSelf: 'flex-start' }}>+ Add row</button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 13,
  fontFamily: 'Georgia, serif',
  lineHeight: 1.5,
  padding: '8px 10px',
  border: '1px solid #ddd',
  borderRadius: 3,
  color: '#111',
  background: '#fff',
  boxSizing: 'border-box',
}

const smallBtnStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.5,
  padding: '6px 10px',
  background: '#fff',
  color: '#333',
  border: '1px solid #ccc',
  borderRadius: 2,
  cursor: 'pointer',
}

const addBtnStyle: React.CSSProperties = {
  marginTop: 14,
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
  padding: '9px 14px',
  background: 'transparent',
  color: '#9A6B3F',
  border: '1px dashed #c9a87f',
  borderRadius: 3,
  cursor: 'pointer',
  width: '100%',
}

const resetBtnStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  padding: '8px 16px',
  background: 'transparent',
  color: '#9A6B3F',
  border: '1px solid #9A6B3F',
  borderRadius: 2,
  cursor: 'pointer',
}

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    fontSize: 12,
    width: 26,
    height: 26,
    lineHeight: '1',
    background: '#fff',
    color: disabled ? '#ccc' : '#666',
    border: '1px solid #ddd',
    borderRadius: 2,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}
