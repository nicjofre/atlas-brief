import { opsClient, ATLAS_CLIENT_SLUG } from './client'

export type OpsTask = {
  id: string
  parent_id: string | null
  title: string
  detail: string | null
  minutes: number
  status: 'backlog' | 'to_bill' | 'billed'
  sort_order: number
}

export type AtlasDevData = {
  hourlyRate: number
  tasks: OpsTask[]
}

// Reads Atlas Brief's slice of the ops DB: its hourly rate + all its tasks.
export async function getAtlasDevData(): Promise<AtlasDevData> {
  const db = opsClient()
  const { data: client } = await db
    .from('clients')
    .select('id, hourly_rate')
    .eq('slug', ATLAS_CLIENT_SLUG)
    .maybeSingle()
  if (!client) return { hourlyRate: 150, tasks: [] }

  const { data: tasks } = await db
    .from('tasks')
    .select('id, parent_id, title, detail, minutes, status, sort_order')
    .eq('client_id', client.id)
    .order('sort_order')
    .order('created_at')

  return { hourlyRate: Number(client.hourly_rate), tasks: (tasks ?? []) as OpsTask[] }
}

// Resolve Atlas Brief's client id (for inserts).
async function atlasClientId(): Promise<string | null> {
  const db = opsClient()
  const { data } = await db.from('clients').select('id').eq('slug', ATLAS_CLIENT_SLUG).maybeSingle()
  return data?.id ?? null
}

export { atlasClientId }
