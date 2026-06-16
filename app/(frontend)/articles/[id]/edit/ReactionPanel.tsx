'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export type ListingFacts = {
  address: string | null
  city: string | null
  state: string | null
  status: string | null
  year_built: number | null
  unit_count: number | null
  gross_sf: number | null
  list_price: number | null
  sale_price: number | null
  price_per_unit: number | null
  cap_rate_current: number | null
  cap_rate_market: number | null
  grm_current: number | null
  broker_name: string | null
  broker_firm: string | null
  broker_phone: string | null
  broker_email: string | null
}

export default function ReactionPanel({
  articleId,
  angles,
  initialResponse,
  recordedAt,
  listingFacts,
}: {
  articleId: string
  angles: string[]
  initialResponse: string
  recordedAt: string | null
  listingFacts: ListingFacts
}) {
  const router = useRouter()
  // Start expanded if there's no response yet; collapsed once recorded.
  const [open, setOpen] = useState(!initialResponse)
  const [response, setResponse] = useState(initialResponse)
  const [weaving, setWeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justWovenAt, setJustWovenAt] = useState<number | null>(null)
  const [showFacts, setShowFacts] = useState(true)

  // Voice recording state
  type RecState = 'idle' | 'recording' | 'transcribing'
  const [recState, setRecState] = useState<RecState>('idle')
  const [recSeconds, setRecSeconds] = useState(0)
  const [recError, setRecError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      const rec = recorderRef.current
      if (rec && rec.state !== 'inactive') rec.stop()
    }
  }, [])

  async function startRecording() {
    setRecError(null)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecError('Browser does not support audio recording.')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      setRecError(e instanceof Error ? `Mic permission denied: ${e.message}` : 'Mic permission denied')
      return
    }
    chunksRef.current = []
    const mimeType =
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
    const rec = new MediaRecorder(stream, { mimeType })
    rec.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      const blob = new Blob(chunksRef.current, { type: mimeType })
      await transcribe(blob)
    }
    rec.start()
    recorderRef.current = rec
    setRecState('recording')
    setRecSeconds(0)
    timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
  }

  function stopRecording() {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  async function transcribe(blob: Blob) {
    setRecState('transcribing')
    setRecError(null)
    try {
      const form = new FormData()
      form.append('file', new File([blob], 'reaction.webm', { type: blob.type }))
      const r = await fetch(`/api/articles/${articleId}/transcribe`, {
        method: 'POST',
        body: form,
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
      // Append transcribed text to whatever the user has typed.
      const next = response.trim()
        ? `${response.trim()} ${data.text}`
        : data.text
      setResponse(next)
    } catch (e) {
      setRecError(e instanceof Error ? e.message : 'Transcription failed')
    } finally {
      setRecState('idle')
    }
  }

  async function weave() {
    if (!response.trim()) return
    setWeaving(true)
    setError(null)
    try {
      const r = await fetch(`/api/articles/${articleId}/weave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
      setJustWovenAt(Date.now())
      // Auto-collapse the panel once a weave succeeds — David can click the
      // header to reopen and edit / re-weave whenever he wants.
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Weave failed')
    } finally {
      setWeaving(false)
    }
  }

  if (!angles || angles.length === 0) return null

  return (
    <section
      style={{
        marginBottom: 16,
        background: '#fff',
        border: '1px solid #e8d49a',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '12px 16px',
          background: open ? '#FFF8E7' : '#FFFDF5',
          border: 'none',
          borderBottom: open ? '1px solid #e8d49a' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8B6914', fontWeight: 600 }}>
          {open ? '▾' : '▸'} Your reaction
        </span>
        <span style={{ fontSize: 11, color: '#8B6914' }}>
          {recordedAt
            ? `Last woven ${new Date(recordedAt).toLocaleString()}`
            : `${angles.length} angles to react to`}
        </span>
        <div style={{ flex: 1 }} />
        {!recordedAt && (
          <span style={{ fontSize: 10, color: '#c08c2a', fontStyle: 'italic' }}>react first, then refine</span>
        )}
      </button>

      {open && (
        <div style={{ padding: '16px 20px 20px', display: 'grid', gridTemplateColumns: showFacts ? '1fr 260px' : '1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.55 }}>
              <strong style={{ color: '#111' }}>Things worth your take on this deal:</strong>
            </div>
            <ul style={{ margin: '0 0 14px', paddingLeft: 22, fontSize: 14, color: '#111', lineHeight: 1.6 }}>
              {angles.map((a, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{a}</li>
              ))}
            </ul>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Talk through whatever caught your eye. You don't need to address every angle — just say what an operator sees and where this trades."
              style={{
                width: '100%',
                minHeight: 180,
                padding: 12,
                fontFamily: '"Newsreader", Georgia, serif',
                fontSize: 15,
                lineHeight: 1.6,
                color: '#111',
                background: '#FFFDF5',
                border: '1px solid #e8d49a',
                borderRadius: 3,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {recState === 'idle' && (
                <button
                  onClick={startRecording}
                  disabled={weaving}
                  title="Record your reaction"
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    background: 'transparent',
                    color: '#9A6B3F',
                    border: '1px solid #9A6B3F',
                    borderRadius: 2,
                    cursor: weaving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9A6B3F', display: 'inline-block' }} />
                  Record
                </button>
              )}
              {recState === 'recording' && (
                <button
                  onClick={stopRecording}
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    background: '#c0392b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 2,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'inline-block',
                    animation: 'atlasPulse 1.1s ease-in-out infinite',
                  }} />
                  Stop · {fmtClock(recSeconds)}
                </button>
              )}
              {recState === 'transcribing' && (
                <span style={{ fontSize: 11, color: '#9A6B3F', letterSpacing: 1, fontStyle: 'italic' }}>
                  Transcribing…
                </span>
              )}

              <button
                onClick={weave}
                disabled={weaving || !response.trim() || recState !== 'idle'}
                style={{
                  padding: '9px 18px',
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  background: weaving || !response.trim() || recState !== 'idle' ? '#eee' : '#9A6B3F',
                  color: weaving || !response.trim() || recState !== 'idle' ? '#999' : '#fff',
                  border: 'none',
                  borderRadius: 2,
                  cursor: weaving || !response.trim() || recState !== 'idle' ? 'not-allowed' : 'pointer',
                }}
              >
                {weaving
                  ? 'Weaving… (30-60s)'
                  : recordedAt
                  ? 'Re-weave with this take'
                  : 'Weave in to draft'}
              </button>
              <button
                onClick={() => setShowFacts(s => !s)}
                style={{
                  padding: '9px 14px',
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                {showFacts ? 'Hide facts' : 'Show facts'}
              </button>
              {justWovenAt && Date.now() - justWovenAt < 6000 && (
                <span style={{ fontSize: 11, color: '#7FB77E', letterSpacing: 1 }}>✓ woven into draft</span>
              )}
              {recError && <span style={{ fontSize: 11, color: '#c0392b' }}>{recError}</span>}
              {error && <span style={{ fontSize: 11, color: '#c0392b' }}>{error}</span>}
            </div>
            <style dangerouslySetInnerHTML={{ __html: '@keyframes atlasPulse{0%,100%{opacity:1}50%{opacity:.35}}' }} />
          </div>

          {showFacts && (
            <aside
              style={{
                padding: 14,
                background: '#FAFAF8',
                border: '1px solid #eee',
                borderRadius: 3,
                fontSize: 12,
                color: '#444',
                lineHeight: 1.6,
                maxHeight: 360,
                overflowY: 'auto',
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 8 }}>
                Listing facts
              </div>
              <Fact k="Address" v={[listingFacts.address, listingFacts.city, listingFacts.state].filter(Boolean).join(', ')} />
              <Fact k="Status" v={listingFacts.status} />
              <Fact k="Year built" v={listingFacts.year_built} />
              <Fact k="Units" v={listingFacts.unit_count} />
              <Fact k="Gross SF" v={listingFacts.gross_sf ? listingFacts.gross_sf.toLocaleString() : null} />
              <Divider />
              <Fact k="List price" v={fmtMoney(listingFacts.list_price)} />
              <Fact k="Sale price" v={fmtMoney(listingFacts.sale_price)} />
              <Fact k="Price / unit" v={fmtMoney(listingFacts.price_per_unit)} />
              <Fact k="CAP current" v={fmtPct(listingFacts.cap_rate_current)} />
              <Fact k="CAP market" v={fmtPct(listingFacts.cap_rate_market)} />
              <Fact k="GRM current" v={listingFacts.grm_current ?? null} />
              <Divider />
              <Fact k="Broker" v={listingFacts.broker_name} />
              <Fact k="Firm" v={listingFacts.broker_firm} />
              <Fact k="Phone" v={listingFacts.broker_phone} />
              <Fact k="Email" v={listingFacts.broker_email} />
            </aside>
          )}
        </div>
      )}
    </section>
  )
}

function Fact({ k, v }: { k: string; v: string | number | null }) {
  if (v == null || v === '') return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}>
      <span style={{ color: '#888' }}>{k}</span>
      <span style={{ color: '#111', textAlign: 'right', fontFamily: typeof v === 'number' ? 'ui-monospace, Menlo, monospace' : 'inherit' }}>{v}</span>
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px dotted #ddd', margin: '8px 0' }} />
}

function fmtClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtMoney(n: number | null): string | null {
  if (n == null) return null
  if (n >= 1000) return '$' + Math.round(n).toLocaleString()
  return '$' + n.toFixed(2)
}

function fmtPct(n: number | null): string | null {
  if (n == null) return null
  return n.toFixed(2) + '%'
}
