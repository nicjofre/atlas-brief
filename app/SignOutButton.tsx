'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      style={{ fontSize: 13, color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      Sign out
    </button>
  )
}
