import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InternalNav from '@/app/InternalNav'
import { getAtlasDevData } from '@/lib/ops/dev'
import DevelopmentBoard from './DevelopmentBoard'

export const dynamic = 'force-dynamic'

export default async function DevelopmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Backed by the shared Forward Deployed Brothers ops DB (Atlas Brief's slice).
  const { hourlyRate, tasks, people } = await getAtlasDevData()

  return (
    <>
      <InternalNav active="development" />
      <DevelopmentBoard tasks={tasks} people={people} hourlyRate={hourlyRate} />
    </>
  )
}
