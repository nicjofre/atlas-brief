'use server'

import { createClient } from '@/lib/supabase/server'

// Changes the logged-in user's own password. updateUser applies to whoever the
// session cookie belongs to, so a user can only ever change their own.
export async function changePassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  if (!newPassword || newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
