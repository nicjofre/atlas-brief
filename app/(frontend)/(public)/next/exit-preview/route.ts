import { draftMode } from 'next/headers'

export const runtime = 'nodejs'

// Turns draft mode back off (used by Payload's "exit preview" and as a manual
// escape hatch).
export async function GET() {
  const dm = await draftMode()
  dm.disable()
  return new Response('Draft mode disabled.')
}
