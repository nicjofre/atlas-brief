'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPropertyAsset } from '@/lib/upload-image'

const MAX_SECONDARY = 3

type Slot = {
  index: number  // 0 = hero, 1..3 = secondary
  label: string
  pathPrefix: string
  current: { path: string; signedUrl: string | null } | null
}

export default function PhotosForm({
  listingId,
  hero,
  secondaries,
}: {
  listingId: string
  hero: { path: string; signedUrl: string | null } | null
  secondaries: ({ path: string; signedUrl: string | null } | null)[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const slots: Slot[] = [
    { index: 0, label: 'Hero', pathPrefix: `listing/${listingId}/hero`, current: hero },
    ...Array.from({ length: MAX_SECONDARY }, (_, i): Slot => ({
      index: i + 1,
      label: `Photo ${i + 1}`,
      pathPrefix: `listing/${listingId}/photo-${i + 1}`,
      current: secondaries[i] ?? null,
    })),
  ]

  async function handleFile(slot: Slot, file: File) {
    setBusy(slot.index)
    setError(null)
    try {
      const { path } = await uploadPropertyAsset(supabase, { file, pathPrefix: slot.pathPrefix })

      // Read current row, update the right field, write back
      const { data: row, error: fetchErr } = await supabase
        .from('listings')
        .select('hero_photo_url, photo_urls')
        .eq('id', listingId)
        .single()
      if (fetchErr || !row) throw new Error(fetchErr?.message ?? 'Listing not found')

      if (slot.index === 0) {
        // delete old hero from storage if present
        if (row.hero_photo_url) {
          await supabase.storage.from('property-assets').remove([row.hero_photo_url])
        }
        const { error: updErr } = await supabase
          .from('listings')
          .update({ hero_photo_url: path })
          .eq('id', listingId)
        if (updErr) throw new Error(updErr.message)
      } else {
        const arr = (row.photo_urls ?? []).slice()
        const oldPath = arr[slot.index - 1]
        if (oldPath) {
          await supabase.storage.from('property-assets').remove([oldPath])
        }
        // pad to length
        while (arr.length < slot.index) arr.push('')
        arr[slot.index - 1] = path
        const { error: updErr } = await supabase
          .from('listings')
          .update({ photo_urls: arr })
          .eq('id', listingId)
        if (updErr) throw new Error(updErr.message)
      }

      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(slot: Slot) {
    if (!slot.current) return
    setBusy(slot.index)
    setError(null)
    try {
      await supabase.storage.from('property-assets').remove([slot.current.path])

      const { data: row } = await supabase
        .from('listings')
        .select('hero_photo_url, photo_urls')
        .eq('id', listingId)
        .single()
      if (!row) throw new Error('Listing not found')

      if (slot.index === 0) {
        await supabase.from('listings').update({ hero_photo_url: null }).eq('id', listingId)
      } else {
        const arr = (row.photo_urls ?? []).slice()
        if (slot.index - 1 < arr.length) {
          arr[slot.index - 1] = ''
        }
        // trim trailing empties
        while (arr.length > 0 && (arr[arr.length - 1] === '' || arr[arr.length - 1] == null)) {
          arr.pop()
        }
        await supabase.from('listings').update({ photo_urls: arr.length > 0 ? arr : null }).eq('id', listingId)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {error && (
        <div style={{ padding: 12, background: '#fee', color: '#c0392b', borderRadius: 4, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
        {/* Hero slot — full width */}
        <PhotoSlot slot={slots[0]} busy={busy === 0} onFile={f => handleFile(slots[0], f)} onDelete={() => handleDelete(slots[0])} large />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {slots.slice(1).map(s => (
          <PhotoSlot key={s.index} slot={s} busy={busy === s.index} onFile={f => handleFile(s, f)} onDelete={() => handleDelete(s)} />
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: '#999', lineHeight: 1.6 }}>
        Images are resized to 1600px wide JPEGs in the browser before upload, so big originals are fine.
      </div>
    </div>
  )
}

function PhotoSlot({
  slot,
  busy,
  onFile,
  onDelete,
  large,
}: {
  slot: Slot
  busy: boolean
  onFile: (file: File) => void
  onDelete: () => void
  large?: boolean
}) {
  const [dragging, setDragging] = useState(false)
  const inputId = `photo-input-${slot.index}`
  const height = large ? 320 : 180

  function pickFile(file: File | undefined) {
    if (!file) return
    onFile(file)
  }

  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 6 }}>
        {slot.label}
      </div>
      <div
        onDragOver={e => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          pickFile(e.dataTransfer.files[0])
        }}
        onClick={() => document.getElementById(inputId)?.click()}
        style={{
          position: 'relative',
          height,
          border: `2px dashed ${dragging ? '#9A6B3F' : '#ddd'}`,
          borderRadius: 4,
          background: slot.current?.signedUrl ? `url(${slot.current.signedUrl}) center/cover no-repeat` : '#fff',
          cursor: busy ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: busy ? 0.5 : 1,
        }}
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => pickFile(e.target.files?.[0])}
        />
        {!slot.current?.signedUrl && (
          <div style={{ fontSize: 12, color: '#666' }}>{busy ? 'Uploading…' : 'Drag image here or click'}</div>
        )}
      </div>
      {slot.current && (
        <button
          onClick={e => {
            e.stopPropagation()
            onDelete()
          }}
          disabled={busy}
          style={{
            marginTop: 6,
            fontSize: 10,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: '#c0392b',
            background: 'none',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            padding: 0,
          }}
        >
          Remove
        </button>
      )}
    </div>
  )
}
