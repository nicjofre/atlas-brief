import { createClient } from '@supabase/supabase-js'

// Client for the shared Forward Deployed Brothers "ops" database — the single
// source of truth for task tracking across all client engagements. Atlas Brief
// is one client in it (slug 'atlas-brief'). Service-role, server-only: the ops
// tables deny anon by RLS, and this app only ever reads/writes its own client's
// rows (always filtered by the slug below).
export const ATLAS_CLIENT_SLUG = 'atlas-brief'

export function opsClient() {
  return createClient(
    process.env.OPS_SUPABASE_URL!,
    process.env.OPS_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
