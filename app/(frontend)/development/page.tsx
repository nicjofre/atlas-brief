import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'
import DevelopmentBoard, { type DevTask } from './DevelopmentBoard'

export const dynamic = 'force-dynamic'

export default async function DevelopmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tasks } = await supabase
    .from('dev_tasks')
    .select('id, title, detail, minutes, paid, paid_at, created_at')
    .order('created_at', { ascending: false })

  const taskRows: DevTask[] = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    detail: t.detail,
    minutes: t.minutes,
    paid: t.paid,
    paid_at: t.paid_at,
  }))

  return (
    <>
      <InternalNav active="development" />
      <DevelopmentBoard tasks={taskRows} />
    </>
  )
}
