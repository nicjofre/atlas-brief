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

export type OpsInvoice = {
  id: string
  number: number
  issued_at: string
  total_minutes: number
  total_amount: number
}

export type AtlasDevData = {
  hourlyRate: number
  tasks: OpsTask[]
  people: OpsPerson[]
  invoices: OpsInvoice[]
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
  if (!client) return { hourlyRate: 150, tasks: [], people: [], invoices: [] }

  const [{ data: tasks }, { data: people }, { data: invoices }] = await Promise.all([
    db
      .from('tasks')
      .select('id, parent_id, title, detail, minutes, status, sort_order, completed_by, completed_at')
      .eq('client_id', client.id)
      .order('sort_order')
      .order('created_at'),
    db.from('people').select('id, name'),
    db
      .from('invoices')
      .select('id, number, issued_at, total_minutes, total_amount')
      .eq('client_id', client.id)
      .order('number', { ascending: false }),
  ])

  return {
    hourlyRate: Number(client.hourly_rate),
    tasks: (tasks ?? []) as OpsTask[],
    people: (people ?? []) as OpsPerson[],
    // numeric comes back from PostgREST as a string
    invoices: (invoices ?? []).map((i) => ({ ...i, total_amount: Number(i.total_amount) })) as OpsInvoice[],
  }
}

// The FDB team (Nic, Lucas, Matias) are the active people in the ops DB, and
// their Atlas Brief logins use the same email. David's doesn't, which is the
// point: billing controls on this client-facing page are for the team only.
// Returns the team member's ops person id, or null for anyone else.
export async function fdbTeamPersonId(email: string | null | undefined): Promise<string | null> {
  if (!email) return null
  const { data } = await opsClient()
    .from('people')
    .select('id')
    .ilike('email', email)
    .eq('active', true)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}

// Resolve Atlas Brief's client id (for inserts).
async function atlasClientId(): Promise<string | null> {
  const db = opsClient()
  const { data } = await db.from('clients').select('id').eq('slug', ATLAS_CLIENT_SLUG).maybeSingle()
  return data?.id ?? null
}

export { atlasClientId }
