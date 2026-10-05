'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { opsClient } from '@/lib/ops/client'
import { atlasClientId, fdbTeamPersonId } from '@/lib/ops/dev'

// Server actions for Atlas Brief's Development tab, writing to the shared ops DB.
// These are the ONLY things David can do: add tasks, edit title/detail, add
// subtasks, reorder (prioritize), delete. Time and status live in the Forward
// Deployed Brothers dashboard. The one billing action here, createDevInvoice,
// is refused for anyone who isn't on the FDB team.
//
// Every action is auth-gated (must be logged into Atlas Brief) and scoped to
// the Atlas Brief client, so it can never touch another client's rows.

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')
}

export async function addDevTask(title: string, detail: string, parentId?: string | null) {
  await requireUser()
  const t = title.trim()
  if (!t) return
  const clientId = await atlasClientId()
  if (!clientId) return
  const db = opsClient()
  // If nesting, the parent must belong to Atlas Brief.
  let parent: string | null = null
  if (parentId) {
    const { data } = await db.from('tasks').select('id').eq('id', parentId).eq('client_id', clientId).maybeSingle()
    if (!data) return
    parent = parentId
  }
  await db.from('tasks').insert({ client_id: clientId, parent_id: parent, title: t, detail: detail.trim() || null, status: 'backlog' })
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

// Drag-to-nest / reorder in one move: re-parent the task and rewrite the order
// of its destination level. Mirrors the FDB dashboard's moveTask, scoped to
// Atlas Brief.
export async function moveDevTask(input: { id: string; parentId: string | null; siblingIds: string[] }) {
  await requireUser()
  const clientId = await atlasClientId()
  if (!clientId) return
  const db = opsClient()
  await db.from('tasks').update({ parent_id: input.parentId }).eq('id', input.id).eq('client_id', clientId)
  await Promise.all(input.siblingIds.map((id, i) => db.from('tasks').update({ sort_order: i }).eq('id', id).eq('client_id', clientId)))
  revalidatePath('/development')
}

// Invoice everything on the Completed tab and move it to Billed. Same database
// function the FDB dashboard's button calls (create_invoice), so the invoice
// and the move happen together or not at all. Team only: the button is hidden
// from David, and this check stops it being called around the UI.
export async function createDevInvoice(): Promise<{ error: string | null; id: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You are not signed in.', id: null }
  const personId = await fdbTeamPersonId(user.email)
  if (!personId) return { error: 'Only the team can create invoices.', id: null }
  const clientId = await atlasClientId()
  if (!clientId) return { error: 'Atlas Brief is missing from the ops database.', id: null }

  const { data, error } = await opsClient().rpc('create_invoice', { p_client_id: clientId, p_created_by: personId })
  if (error) return { error: error.message, id: null }
  revalidatePath('/development')
  return { error: null, id: data as string }
}
