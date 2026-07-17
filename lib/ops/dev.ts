import { opsClient, ATLAS_CLIENT_SLUG } from './client'

export type OpsTask = {
  id: string
  parent_id: string | null
  title: string
  detail: string | null
  minutes: number
  status: 'backlog' | 'to_bill' | 'billed'
  sort_order: number
  completed_by: string | null
  completed_at: string | null
}

export type OpsPerson = { id: string; name: string }

export type AtlasDevData = {
  hourlyRate: number
  tasks: OpsTask[]
  people: OpsPerson[]
}

// Reads Atlas Brief's slice of the ops DB: its hourly rate, all its tasks, and
// the people list (so "Completed by <name>" can resolve).
export async function getAtlasDevData(): Promise<AtlasDevData> {
  const db = opsClient()
  const { data: client } = await db
    .from('clients')
    .select('id, hourly_rate')
    .eq('slug', ATLAS_CLIENT_SLUG)
    .maybeSingle()
  if (!client) return { hourlyRate: 150, tasks: [], people: [] }

  const [{ data: tasks }, { data: people }] = await Promise.all([
    db
      .from('tasks')
      .select('id, parent_id, title, detail, minutes, status, sort_order, completed_by, completed_at')
      .eq('client_id', client.id)
      .order('sort_order')
      .order('created_at'),
    db.from('people').select('id, name'),
  ])

  return {
    hourlyRate: Number(client.hourly_rate),
    tasks: (tasks ?? []) as OpsTask[],
    people: (people ?? []) as OpsPerson[],
  }
}

// Resolve Atlas Brief's client id (for inserts).
async function atlasClientId(): Promise<string | null> {
  const db = opsClient()
  const { data } = await db.from('clients').select('id').eq('slug', ATLAS_CLIENT_SLUG).maybeSingle()
  return data?.id ?? null
}

export { atlasClientId }
