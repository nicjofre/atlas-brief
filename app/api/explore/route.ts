import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EXPLORE_PROMPT } from '@/lib/db/explore-prompt'

export const maxDuration = 60

const client = new Anthropic()

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
}

type AskResponse = { sql: string; explanation: string }

async function translateToSql(question: string): Promise<AskResponse> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [
      { role: 'user', content: `${EXPLORE_PROMPT}\n\nQuestion: ${question}` },
    ],
  })
  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  const parsed = JSON.parse(stripFences(content.text)) as AskResponse
  if (!parsed.sql || typeof parsed.sql !== 'string') throw new Error('Translator returned no SQL')
  return parsed
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const explicitSql = typeof body.sql === 'string' ? body.sql.trim() : ''
  const explicitExplanation = typeof body.explanation === 'string' ? body.explanation.trim() : ''

  if (!question && !explicitSql) {
    return NextResponse.json({ error: 'Missing question or sql' }, { status: 400 })
  }

  let sql = explicitSql
  let explanation = explicitExplanation

  // If no SQL provided, translate question via Claude.
  if (!sql) {
    try {
      const t = await translateToSql(question)
      sql = t.sql
      explanation = t.explanation
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Translation failed'
      return NextResponse.json({ error: `Translation failed: ${msg}` }, { status: 500 })
    }
  }

  // Execute via the safe SELECT-only function.
  try {
    const { data, error } = await supabase.rpc('explore_query', { query_text: sql })
    if (error) {
      return NextResponse.json({ sql, explanation, error: error.message, rows: [] }, { status: 200 })
    }
    const rows = Array.isArray(data) ? data : []
    return NextResponse.json({ sql, explanation, rows })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Query failed'
    return NextResponse.json({ sql, explanation, error: msg, rows: [] }, { status: 200 })
  }
}
