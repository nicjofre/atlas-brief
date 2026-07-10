import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'
import DevelopmentBoard, { type DevTask, type DevEntry } from './DevelopmentBoard'

export const dynamic = 'force-dynamic'

export default async function DevelopmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tasks }, { data: entries }] = await Promise.all([
    supabase
      .from('dev_tasks')
      .select('id, title, notes, status, estimate_hours, paid, paid_at, created_at, started_at, completed_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('dev_time_entries')
      .select('id, task_id, hours, note, worked_on, created_at')
      .order('worked_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const titleMap = new Map((tasks ?? []).map((t) => [t.id, t.title]))
  const entryRows: DevEntry[] = (entries ?? []).map((e) => ({
    id: e.id,
    task_id: e.task_id,
    hours: Number(e.hours),
    note: e.note,
    worked_on: e.worked_on,
    taskTitle: e.task_id ? titleMap.get(e.task_id) ?? null : null,
  }))

  const taskRows: DevTask[] = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    notes: t.notes,
    status: t.status as DevTask['status'],
    estimate_hours: t.estimate_hours != null ? Number(t.estimate_hours) : null,
    paid: t.paid,
    paid_at: t.paid_at,
    completed_at: t.completed_at,
  }))

  return (
    <>
      <InternalNav active="development" />
      <DevelopmentBoard tasks={taskRows} entries={entryRows} />
    </>
  )
}
