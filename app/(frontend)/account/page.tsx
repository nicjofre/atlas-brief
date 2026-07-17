import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'
import ChangePassword from './ChangePassword'

export const dynamic = 'force-dynamic'

// Self-serve account page. Currently just changing your own password — the one
// thing every admin user needs and Supabase's email reset isn't wired up for.
export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <InternalNav active="account" />
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '32px 24px', fontFamily: 'Georgia, serif' }}>
        <h1 style={{ fontSize: 26, margin: 0 }}>Account</h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Signed in as {user.email}</p>
        <ChangePassword />
      </div>
    </>
  )
}
