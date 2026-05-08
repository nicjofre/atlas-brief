'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPropertyAsset } from '@/lib/upload-image'

export default function BrokerHeadshotUploader({
  brokerId,
  brokerName,
  currentSignedUrl,
  currentPath,
}: {
  brokerId: string
  brokerName: string | null
  currentSignedUrl: string | null
  currentPath: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const { path } = await uploadPropertyAsset(supabase, {
        file,
        pathPrefix: `broker/${brokerId}/headshot`,
      })

      // Delete old headshot
      if (currentPath) {
        await supabase.storage.from('property-assets').remove([currentPath])
      }

      const { error: updErr } = await supabase
        .from('brokers')
        .update({ headshot_url: path })
        .eq('id', brokerId)
      if (updErr) throw new Error(updErr.message)

      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setError(null)
    try {
      if (currentPath) {
        await supabase.storage.from('property-assets').remove([currentPath])
      }
      await supabase.from('brokers').update({ headshot_url: null }).eq('id', brokerId)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const inputId = `headshot-input-${brokerId}`

  return (
    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div
        onClick={() => !busy && document.getElementById(inputId)?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: '2px dashed #ddd',
          background: currentSignedUrl ? `url(${currentSignedUrl}) center/cover no-repeat` : '#f9f9f9',
          cursor: busy ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
        {!currentSignedUrl && (
          <div style={{ fontSize: 9, color: '#aaa', textAlign: 'center', padding: 4, lineHeight: 1.2 }}>
            {busy ? '...' : 'Drop photo'}
          </div>
        )}
      </div>
      <div style={{ flexGrow: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 4 }}>
          Headshot
        </div>
        <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>
          {currentSignedUrl ? `Photo of ${brokerName ?? 'broker'}.` : 'Drag a headshot onto the circle, or click to choose.'}
        </div>
        {currentPath && (
          <button
            onClick={handleDelete}
            disabled={busy}
            style={{
              marginTop: 4,
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
        {error && <div style={{ marginTop: 4, fontSize: 11, color: '#c0392b' }}>{error}</div>}
      </div>
    </div>
  )
}
