import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 120

// We forward audio straight to OpenAI Whisper (gpt-4o-transcribe is also an
// option, slightly more accurate at ~10x the cost; whisper-1 is fine for the
// rough operator-take use case David has). The article_id parameter is
// captured for future logging/billing per article but isn't sent to OpenAI.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params // reserved for future per-article auditing
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'OPENAI_API_KEY not set. Add it to .env.local (and your Vercel env vars) to enable voice transcription.',
      },
      { status: 500 }
    )
  }

  const inForm = await req.formData()
  const audio = inForm.get('file')
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'file field (audio) required' }, { status: 400 })
  }

  const outForm = new FormData()
  outForm.append('file', audio, audio.name || 'reaction.webm')
  outForm.append('model', 'whisper-1')
  outForm.append('response_format', 'json')
  // Bias the recognizer toward Atlas Brief vocabulary.
  outForm.append(
    'prompt',
    'Atlas Brief. Los Angeles multifamily. RSO, AB 1482, ULA, CAP, GRM, NOI, soft-story retrofit, LARSO, tuck-under parking, NoHo, Hollywood, Mid-Wilshire, Marcus & Millichap, CBRE, Berkadia.'
  )

  let resp: Response
  try {
    resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outForm,
    })
  } catch (e) {
    return NextResponse.json(
      { error: `Whisper request failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    )
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    return NextResponse.json(
      { error: `Whisper ${resp.status}: ${errText.slice(0, 500)}` },
      { status: 502 }
    )
  }

  const data = (await resp.json()) as { text?: string }
  return NextResponse.json({ text: data.text ?? '' })
}
