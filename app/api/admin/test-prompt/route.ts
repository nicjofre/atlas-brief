import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

// Streams the AI response back as Server-Sent Events so the test panel can
// show output as it's generated. Same data shape as before, just in chunks:
//   event: meta    { systemPrompt, userMessage, promptSections, listingLabel }
//   event: chunk   { text }            (repeated as tokens stream)
//   event: done    { usage, elapsedMs }
//   event: error   { message }

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { listingId?: string }
  if (!body.listingId) {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 })
  }

  const { data: prompts, error: pErr } = await supabase
    .from('prompts')
    .select('key, body, sort_order')
    .order('sort_order', { ascending: true })
  if (pErr) {
    return NextResponse.json({ error: `prompts load: ${pErr.message}` }, { status: 500 })
  }
  if (!prompts || prompts.length === 0) {
    return NextResponse.json({ error: 'no prompts configured' }, { status: 500 })
  }

  const { data: listing, error: lErr } = await supabase
    .from('listings')
    .select(`
      *,
      property:properties (*),
      listing_broker:brokers!listings_listing_broker_id_fkey (*),
      buyer_broker:brokers!listings_buyer_broker_id_fkey (*)
    `)
    .eq('id', body.listingId)
    .maybeSingle()
  if (lErr) {
    return NextResponse.json({ error: `listing load: ${lErr.message}` }, { status: 500 })
  }
  if (!listing) {
    return NextResponse.json({ error: 'listing not found' }, { status: 404 })
  }

  const systemPrompt = prompts
    .map(p => `## [${p.key}]\n\n${p.body}`)
    .join('\n\n---\n\n')

  const userMessage = `Here is the listing to draft. All fields come straight from the Atlas Brief database — do not invent or scrape additional data.

\`\`\`json
${JSON.stringify(listing, null, 2)}
\`\`\`

Now produce the full document per the rules above.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // Send metadata up front so the UI can render the prompt/preview pieces
      // before any tokens arrive.
      emit('meta', {
        systemPrompt,
        userMessage,
        promptSections: prompts.map(p => ({
          key: p.key,
          sort_order: p.sort_order,
          length: p.body.length,
        })),
        listingLabel: listing.property?.street_address ?? listing.id,
      })

      const t0 = Date.now()
      try {
        const aiStream = await anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
          system: [
            { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{ role: 'user', content: userMessage }],
        })

        for await (const ev of aiStream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            emit('chunk', { text: ev.delta.text })
          }
        }

        const final = await aiStream.finalMessage()
        emit('done', {
          usage: {
            input_tokens: final.usage.input_tokens,
            output_tokens: final.usage.output_tokens,
          },
          elapsedMs: Date.now() - t0,
        })
      } catch (e) {
        emit('error', { message: e instanceof Error ? e.message : String(e) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
