'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontStyle: 'italic', color: '#111' }}>Atlas <em>Brief</em></div>
          <div style={{ fontSize: 12, letterSpacing: 3, color: '#9A6B3F', marginTop: 6, textTransform: 'uppercase' }}>Editorial Dashboard</div>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '12px 16px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, background: '#fff', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '12px 16px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, background: '#fff', outline: 'none' }}
          />
          {error && <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '12px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
