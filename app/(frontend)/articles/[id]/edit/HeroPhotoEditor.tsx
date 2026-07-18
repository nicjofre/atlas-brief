'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPropertyAsset } from '@/lib/upload-image'
import { resolveHeroUrl } from '@/lib/db/hero-url'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

// Client-side preview URLs (mirror the server route's sizes). The key is
// referrer-locked to our domains, so these only load in the browser. `location`
// is either "lat,lng" or a plain address — Google geocodes the address itself.
function googlePreviewUrl(source: 'streetview' | 'satellite', location: string, heading: number, size = '640x384') {
  if (source === 'streetview') {
    const p = new URLSearchParams({ size, location, heading: String(heading), fov: '80', pitch: '0', key: MAPS_KEY! })
    return `https://maps.googleapis.com/maps/api/streetview?${p}`
  }
  const p = new URLSearchParams({ center: location, zoom: '19', size, scale: '2', maptype: 'satellite', key: MAPS_KEY! })
  return `https://maps.googleapis.com/maps/api/staticmap?${p}`
}

// The 8 compass headings for the Street View contact sheet.
const HEADINGS = [0, 45, 90, 135, 180, 225, 270, 315]

export default function HeroPhotoEditor({
  articleId,
  articleHeroUrl,
  listingHeroUrl,
  caption,
  onCaptionChange,
  lat,
  lng,
  address,
}: {
  articleId: string
  articleHeroUrl: string | null
  listingHeroUrl: string | null
  caption: string
  onCaptionChange: (v: string) => void
  lat: number | null
  lng: number | null
  address: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Local override so the preview updates immediately after upload, without
  // round-tripping through router.refresh().
  const [localUrl, setLocalUrl] = useState<string | null>(articleHeroUrl)

  // Google image picker state. Prefer precise coords; fall back to the address,
  // which Google geocodes itself.
  const [picker, setPicker] = useState<'streetview' | 'satellite' | null>(null)
  const [heading, setHeading] = useState(0)
  const location = lat != null && lng != null ? `${lat},${lng}` : (address ?? '')
  const hasCoords = !!MAPS_KEY && !!location

  async function useGoogleImage() {
    if (picker == null) return
    setUploading(true)
    setError(null)
    try {
      const res = await fetch(`/api/articles/${articleId}/hero-from-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: picker, heading }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to fetch image')
      setLocalUrl(data.url)
      // Add attribution to the caption if it isn't already credited to Google.
      if (!/google/i.test(caption)) {
        const label = picker === 'streetview' ? 'Google Street View' : 'Google satellite imagery'
        const base = caption.replace(/\s*(image|photo|listing photo)\s+via\s+.*$/i, '').trim()
        onCaptionChange(`${base}${base ? ' ' : ''}Image via ${label}.`)
      }
      setPicker(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch image')
    } finally {
      setUploading(false)
    }
  }

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
            {hasCoords && (
              <>
                <button onClick={() => { setHeading(0); setPicker('streetview') }} disabled={uploading} style={overlayButtonStyle}>
                  Street View
                </button>
                <button onClick={() => setPicker('satellite')} disabled={uploading} style={overlayButtonStyle}>
                  Satellite
                </button>
              </>
            )}
            {isOverride && (
              <button onClick={revertToListing} disabled={uploading} style={overlayButtonStyle}>
                Revert to listing photo
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: 380,
            background: '#F7E9CE',
            border: '2px dashed #D6CBB3',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#8B5A2B',
          }}
        >
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ ...emptyBtnStyle, background: 'none', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', color: '#8B5A2B' }}>
            {uploading ? 'Uploading…' : '+ Upload hero photo'}
          </button>
          {hasCoords && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setHeading(0); setPicker('streetview') }} disabled={uploading} style={emptyBtnStyle}>Street View</button>
              <button onClick={() => setPicker('satellite')} disabled={uploading} style={emptyBtnStyle}>Satellite</button>
            </div>
          )}
        </div>
      )}

      {/* Google image picker: preview + (Street View) rotate + confirm. */}
      {picker && hasCoords && (
        <div style={{ marginTop: 12, border: '1px solid #D6CBB3', background: '#FFFDF7', padding: 12 }}>
          <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4F4F4B', marginBottom: 8 }}>
            {picker === 'streetview' ? `Google Street View · facing ${heading}°` : 'Google Satellite'} preview
          </div>
          {/* Large preview of the currently-selected angle. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={googlePreviewUrl(picker, location, heading)}
            alt=""
            style={{ width: '100%', height: 'auto', maxHeight: 340, objectFit: 'cover', border: '1px solid #0A0A0A', opacity: uploading ? 0.5 : 1 }}
          />

          {picker === 'streetview' && (
            <>
              {/* Contact sheet: every 45° angle at once — click one to select it. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, marginTop: 8 }}>
                {HEADINGS.map(h => (
                  <button
                    key={h}
                    onClick={() => setHeading(h)}
                    disabled={uploading}
                    title={`${h}°`}
                    style={{ padding: 0, border: heading === h ? '2px solid #0A0A0A' : '1px solid #D6CBB3', borderRadius: 2, cursor: 'pointer', background: 'none', lineHeight: 0 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={googlePreviewUrl('streetview', location, h, '160x100')} alt={`${h}°`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </button>
                ))}
              </div>
              {/* Fine-tune between the 45° steps. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, color: '#888' }}>Fine-tune</span>
                <input
                  type="range" min={0} max={345} step={15} value={heading}
                  onChange={e => setHeading(Number(e.target.value))}
                  disabled={uploading}
                  style={{ flex: 1 }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1 }} />
            <button onClick={() => setPicker(null)} disabled={uploading} style={pickerBtnStyle}>Cancel</button>
            <button onClick={useGoogleImage} disabled={uploading} style={{ ...pickerBtnStyle, background: '#0A0A0A', color: '#fff', borderColor: '#0A0A0A' }}>
              {uploading ? 'Saving…' : 'Use this photo'}
            </button>
          </div>
        </div>
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

const emptyBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 11,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  background: '#fff',
  color: '#8B5A2B',
  border: '1px solid #D6CBB3',
  borderRadius: 2,
  cursor: 'pointer',
  fontFamily: 'ui-monospace, Menlo, monospace',
}

const pickerBtnStyle: React.CSSProperties = {
  padding: '7px 13px',
  fontSize: 11,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  background: '#fff',
  color: '#111',
  border: '1px solid #D6CBB3',
  borderRadius: 2,
  cursor: 'pointer',
  fontFamily: 'ui-monospace, Menlo, monospace',
}
