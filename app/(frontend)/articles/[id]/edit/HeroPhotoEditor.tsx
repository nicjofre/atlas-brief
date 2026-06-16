'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPropertyAsset } from '@/lib/upload-image'
import { resolveHeroUrl } from '@/lib/db/hero-url'

export default function HeroPhotoEditor({
  articleId,
  articleHeroUrl,
  listingHeroUrl,
  caption,
  onCaptionChange,
}: {
  articleId: string
  articleHeroUrl: string | null
  listingHeroUrl: string | null
  caption: string
  onCaptionChange: (v: string) => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Local override so the preview updates immediately after upload, without
  // round-tripping through router.refresh().
  const [localUrl, setLocalUrl] = useState<string | null>(articleHeroUrl)

  const rawUrl = localUrl ?? articleHeroUrl ?? listingHeroUrl
  const displayedUrl = resolveHeroUrl(supabase, rawUrl)
  const isOverride = !!(localUrl ?? articleHeroUrl)

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const { path } = await uploadPropertyAsset(supabase, {
        file,
        pathPrefix: `articles/${articleId}/hero`,
      })
      // Get the public URL (bucket is public for property-assets).
      const { data: { publicUrl } } = supabase.storage.from('property-assets').getPublicUrl(path)
      const { error: updErr } = await supabase
        .from('articles')
        .update({ hero_photo_url: publicUrl })
        .eq('id', articleId)
      if (updErr) throw new Error(updErr.message)
      setLocalUrl(publicUrl)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function revertToListing() {
    if (!confirm('Use the listing\'s hero photo for this article?')) return
    setUploading(true)
    setError(null)
    try {
      const { error: updErr } = await supabase
        .from('articles')
        .update({ hero_photo_url: null })
        .eq('id', articleId)
      if (updErr) throw new Error(updErr.message)
      setLocalUrl(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revert failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <figure style={{ margin: 0, marginBottom: 28 }}>
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

      {displayedUrl ? (
        <div style={{ position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayedUrl}
            alt=""
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: 380,
              objectFit: 'cover',
              border: '1px solid #0A0A0A',
              opacity: uploading ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          />
          {/* Hover overlay with actions */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              padding: 12,
              gap: 8,
              background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 30%)',
              opacity: 0,
              transition: 'opacity 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
          >
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={overlayButtonStyle}>
              {uploading ? 'Uploading…' : 'Replace photo'}
            </button>
            {isOverride && (
              <button onClick={revertToListing} disabled={uploading} style={overlayButtonStyle}>
                Revert to listing photo
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: 380,
            background: '#F7E9CE',
            border: '2px dashed #D6CBB3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#8B5A2B',
          }}
        >
          {uploading ? 'Uploading…' : '+ Upload hero photo'}
        </button>
      )}

      <figcaption style={{
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: 11,
        letterSpacing: '0.1em',
        color: '#4F4F4B',
        textTransform: 'uppercase',
        paddingTop: 12,
        borderTop: '1px dotted #D6CBB3',
        marginTop: 14,
      }}>
        <EditableCaptionWrapper caption={caption} onChange={onCaptionChange} />
        {!isOverride && displayedUrl && (
          <span style={{ marginLeft: 12, fontStyle: 'italic', textTransform: 'none', color: '#888', letterSpacing: 0 }}>
            (using listing photo — click image to upload a different one)
          </span>
        )}
        {error && <div style={{ marginTop: 6, color: '#c0392b', textTransform: 'none', letterSpacing: 0 }}>{error}</div>}
      </figcaption>
    </figure>
  )
}

// Defer to the parent's EditableText for the caption — but we already have one
// in ArticleEditor. So this is just a passthrough span; the parent passes its
// own EditableText as a child via the onCaptionChange callback.
function EditableCaptionWrapper({ caption, onChange }: { caption: string; onChange: (v: string) => void }) {
  // Use a simple contentEditable here to avoid importing EditableText (circular).
  // Pattern matches: <b>FIG. 00</b>, rest of caption.
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      suppressHydrationWarning
      onBlur={e => onChange(e.currentTarget.innerText)}
      style={{ outline: 'none', cursor: 'text' }}
      ref={el => {
        if (el && el.innerText !== caption) el.innerText = caption
      }}
    />
  )
}

const overlayButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  background: '#fff',
  color: '#111',
  border: 'none',
  borderRadius: 2,
  cursor: 'pointer',
  fontFamily: 'ui-monospace, Menlo, monospace',
}
