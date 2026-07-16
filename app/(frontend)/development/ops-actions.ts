'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { opsClient } from '@/lib/ops/client'
import { atlasClientId } from '@/lib/ops/dev'

// Server actions for Atlas Brief's Development tab, writing to the shared ops DB.
// These are the ONLY things David can do: add tasks, edit title/detail, add
// subtasks, reorder (prioritize), delete. Time, status, and billing are
// deliberately NOT here — those live in the Forward Deployed Brothers dashboard.
//
// Every action is auth-gated (must be logged into Atlas Brief) and scoped to
// the Atlas Brief client, so it can never touch another client's rows.

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')
}

export async function addDevTask(title: string, detail: string) {
  await requireUser()
  const t = title.trim()
  if (!t) return
  const clientId = await atlasClientId()
  if (!clientId) return
  await opsClient().from('tasks').insert({ client_id: clientId, title: t, detail: detail.trim() || null, status: 'backlog' })
  revalidatePath('/development')
}

export async function addDevSubtask(parentId: string, title: string) {
  await requireUser()
  const t = title.trim()
  if (!t) return
  const clientId = await atlasClientId()
  if (!clientId) return
  // Guard: the parent must belong to Atlas Brief.
  const { data: parent } = await opsClient().from('tasks').select('id').eq('id', parentId).eq('client_id', clientId).maybeSingle()
  if (!parent) return
  await opsClient().from('tasks').insert({ client_id: clientId, parent_id: parentId, title: t, status: 'backlog' })
  revalidatePath('/development')
}

export async function editDevTask(id: string, title: string, detail: string) {
  await requireUser()
  const clientId = await atlasClientId()
  if (!clientId) return
  await opsClient().from('tasks').update({ title: title.trim() || 'Untitled', detail: detail.trim() || null }).eq('id', id).eq('client_id', clientId)
  revalidatePath('/development')
}

export async function deleteDevTask(id: string) {
  await requireUser()
  const clientId = await atlasClientId()
  if (!clientId) return
  await opsClient().from('tasks').delete().eq('id', id).eq('client_id', clientId)
  revalidatePath('/development')
}

export async function reorderDevTasks(ids: string[]) {
  await requireUser()
  const clientId = await atlasClientId()
  if (!clientId) return
  const db = opsClient()
  await Promise.all(ids.map((id, i) => db.from('tasks').update({ sort_order: i }).eq('id', id).eq('client_id', clientId)))
  revalidatePath('/development')
}
