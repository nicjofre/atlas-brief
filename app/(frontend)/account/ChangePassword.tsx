'use client'

import { useState } from 'react'
import { changePassword } from './actions'

export default function ChangePassword() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle')
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'saving') return
    setErr('')
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return }
    if (pw !== pw2) { setErr('Passwords do not match.'); return }
    setState('saving')
    const res = await changePassword(pw)
    if (!res.ok) { setErr(res.error || 'Something went wrong.'); setState('idle'); return }
    setPw(''); setPw2(''); setState('done')
  }

  const input: React.CSSProperties = { width: '100%', padding: '11px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15, fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }

  return (
    <form onSubmit={submit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2 style={{ fontSize: 17, margin: '0 0 4px' }}>Change password</h2>
      <input type="password" placeholder="New password" autoComplete="new-password" value={pw}
        onChange={(e) => { setPw(e.target.value); if (state === 'done') setState('idle') }} style={input} />
      <input type="password" placeholder="Confirm new password" autoComplete="new-password" value={pw2}
        onChange={(e) => setPw2(e.target.value)} style={input} />
      {err && <div style={{ color: '#B23B2E', fontSize: 13 }}>{err}</div>}
      {state === 'done' && <div style={{ color: '#2E7D32', fontSize: 13 }}>Password updated.</div>}
      <button type="submit" disabled={state === 'saving'}
        style={{ alignSelf: 'flex-start', marginTop: 4, padding: '10px 18px', border: '1px solid #9A6B3F', background: '#9A6B3F', color: '#fff', borderRadius: 6, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', opacity: state === 'saving' ? 0.6 : 1 }}>
        {state === 'saving' ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}
