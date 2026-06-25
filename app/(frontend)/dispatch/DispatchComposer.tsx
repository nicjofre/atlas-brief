'use client'

import { useState } from 'react'

export type ArticleItem = {
  slug: string
  headline: string
  deck: string | null
  publishedAt: string | null
  status: string | null
  catLabel: string | null
}

const ACCENT = '#8B5A2B'
const INK = '#0A0A0A'

function plainHeadline(h: string) {
  return h.replace(/\*/g, '')
}

function fmtDate(s: string | null) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DispatchComposer({
  articles,
  subscriberCount,
}: {
  articles: ArticleItem[]
  subscriberCount: number
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [intro, setIntro] = useState('')
  const [subject, setSubject] = useState('')
  const [testEmail, setTestEmail] = useState('David@atlasbrief.la')
  const [scheduledAt, setScheduledAt] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function toggle(slug: string) {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]))
    setPreviewHtml('')
  }

  async function doPreview() {
    if (selected.length === 0) return setMsg({ type: 'err', text: 'Pick at least one deal.' })
    setBusy('preview')
    setMsg(null)
    try {
      const res = await fetch('/api/dispatch/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs: selected, intro }),
      })
      const html = await res.text()
      if (!res.ok) throw new Error('Preview failed')
      setPreviewHtml(html)
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Preview failed' })
    } finally {
      setBusy(null)
    }
  }

  async function send(action: 'test' | 'send' | 'schedule') {
    setBusy(action)
    setMsg(null)
    try {
      const res = await fetch('/api/dispatch/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slugs: selected,
          intro,
          subject,
          action,
          test_email: action === 'test' ? testEmail : undefined,
          scheduled_at: action === 'schedule' ? new Date(scheduledAt).toISOString() : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Send failed')
      if (action === 'test') setMsg({ type: 'ok', text: `Test sent to ${data.sentTo}. Check your inbox.` })
      else if (action === 'schedule')
        setMsg({ type: 'ok', text: `Scheduled for ${new Date(data.scheduledAt).toLocaleString()}.` })
      else setMsg({ type: 'ok', text: `Sent to the audience (~${subscriberCount} subscribers).` })
      setConfirmText('')
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Send failed' })
    } finally {
      setBusy(null)
    }
  }

  const canSend = selected.length > 0 && subject.trim().length > 0
  const confirmed = confirmText.trim().toUpperCase() === 'SEND'

  const label: React.CSSProperties = {
    display: 'block', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
    color: ACCENT, marginBottom: 8, marginTop: 24,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 15,
    border: '1px solid #ddd', borderRadius: 4, fontFamily: 'inherit',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', fontFamily: 'Georgia, serif' }}>
      <h1 style={{ fontSize: 28, margin: 0, color: INK }}>Compose dispatch</h1>
      <p style={{ color: '#666', marginTop: 6, fontSize: 14 }}>
        Pick a few published deals, add a note, preview, send a test to yourself, then send or schedule to{' '}
        <b>~{subscriberCount}</b> subscribers.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 32, marginTop: 8 }}>
        {/* LEFT — compose */}
        <div>
          <div style={label}>Deals ({selected.length} selected)</div>
          <div style={{ border: '1px solid #eee', borderRadius: 6, maxHeight: 320, overflowY: 'auto' }}>
            {articles.length === 0 && <div style={{ padding: 16, color: '#999', fontSize: 13 }}>No published articles.</div>}
            {articles.map((a) => {
              const on = selected.includes(a.slug)
              const order = selected.indexOf(a.slug) + 1
              return (
                <label
                  key={a.slug}
                  style={{
                    display: 'flex', gap: 10, padding: '10px 12px', cursor: 'pointer',
                    borderTop: '1px solid #f3f3f3', alignItems: 'flex-start',
                    background: on ? '#FBF6EC' : 'transparent',
                  }}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(a.slug)} style={{ marginTop: 4 }} />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: INK, lineHeight: 1.3 }}>
                      {on && <b style={{ color: ACCENT, marginRight: 6 }}>{order}.</b>}
                      {plainHeadline(a.headline)}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace', marginTop: 3 }}>
                      {[a.catLabel, a.status, fmtDate(a.publishedAt)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          <div style={label}>Subject line</div>
          <input
            style={inputStyle}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Three deals worth a look this week"
            maxLength={150}
          />

          <div style={label}>Your note (intro)</div>
          <textarea
            style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder={'A few lines from you. Blank line starts a new paragraph.\n\nThe greeting "Hi {first name}," is added automatically.'}
          />

          <button
            onClick={doPreview}
            disabled={busy !== null || selected.length === 0}
            style={{
              marginTop: 16, padding: '10px 18px', fontSize: 13, letterSpacing: 1,
              textTransform: 'uppercase', background: '#fff', color: INK,
              border: `1px solid ${INK}`, borderRadius: 4, cursor: 'pointer',
            }}
          >
            {busy === 'preview' ? 'Rendering…' : 'Preview'}
          </button>

          {/* Test */}
          <div style={label}>Send a test to yourself</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
            <button
              onClick={() => send('test')}
              disabled={busy !== null || !canSend}
              style={{
                padding: '10px 16px', fontSize: 13, whiteSpace: 'nowrap', background: '#fff',
                color: INK, border: `1px solid ${INK}`, borderRadius: 4, cursor: 'pointer',
              }}
            >
              {busy === 'test' ? 'Sending…' : 'Send test'}
            </button>
          </div>

          {/* Send / schedule */}
          <div style={label}>Send to all subscribers</div>
          <div style={{ background: '#FBF6EC', border: '1px solid #EADFC8', borderRadius: 6, padding: 16 }}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>
              Type <b>SEND</b> to confirm, then choose now or schedule. Goes to ~{subscriberCount} people.
            </div>
            <input
              style={{ ...inputStyle, marginBottom: 12 }}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type SEND to confirm"
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => send('send')}
                disabled={busy !== null || !canSend || !confirmed}
                style={{
                  padding: '11px 20px', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
                  background: confirmed && canSend ? INK : '#ccc', color: '#fff', border: 'none',
                  borderRadius: 4, cursor: confirmed && canSend ? 'pointer' : 'not-allowed',
                }}
              >
                {busy === 'send' ? 'Sending…' : 'Send now'}
              </button>
              <span style={{ color: '#999', fontSize: 12 }}>or</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: 180 }}
              />
              <button
                onClick={() => send('schedule')}
                disabled={busy !== null || !canSend || !confirmed || !scheduledAt}
                style={{
                  padding: '11px 18px', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
                  background: '#fff', color: INK, border: `1px solid ${INK}`, borderRadius: 4,
                  cursor: 'pointer', opacity: confirmed && scheduledAt ? 1 : 0.5,
                }}
              >
                {busy === 'schedule' ? 'Scheduling…' : 'Schedule'}
              </button>
            </div>
          </div>

          {msg && (
            <div
              style={{
                marginTop: 16, padding: '10px 14px', borderRadius: 4, fontSize: 14,
                background: msg.type === 'ok' ? '#EAF6EA' : '#FCEBEA',
                color: msg.type === 'ok' ? '#1a7a3a' : '#c0392b',
              }}
            >
              {msg.text}
            </div>
          )}
        </div>

        {/* RIGHT — preview */}
        <div>
          <div style={label}>Preview</div>
          {previewHtml ? (
            <iframe
              title="Dispatch preview"
              srcDoc={previewHtml}
              style={{ width: '100%', height: 720, border: '1px solid #ddd', borderRadius: 6, background: '#fff' }}
            />
          ) : (
            <div
              style={{
                height: 720, border: '1px dashed #ddd', borderRadius: 6, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 14, textAlign: 'center', padding: 24,
              }}
            >
              Select deals and hit Preview to see the email.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
