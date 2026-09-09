import { Client } from 'pg'
import { unstable_cache } from 'next/cache'

// Trending = most-read articles over a rolling window, straight from post_views.
//
// Why `pg` and not the Supabase client: post_views is anon insert-only by RLS
// (the anon role can write a view but never read one), and the homepage renders
// for logged-out visitors. Going direct with DATABASE_URI runs as the DB owner
// and sidesteps RLS — the same route /analytics already takes.
//
// Because this sits in the homepage's render path, two guards matter:
//   1. unstable_cache — the aggregate runs once per revalidate window, not once
//      per request, so a traffic spike doesn't open a connection per visitor.
//   2. every failure path returns [] — a DB hiccup hides the section instead of
//      taking down the page.

const WINDOW_DAYS = 7
const LIMIT = 6
const REVALIDATE_SECONDS = 900

export type TrendingRow = { slug: string; views: number; readers: number }

async function queryTrending(): Promise<TrendingRow[]> {
  if (!process.env.DATABASE_URI) return []
  const client = new Client({ connectionString: process.env.DATABASE_URI })
  try {
    await client.connect()
    // Ordered by distinct visitor_hash, not raw view count: visitor_hash is a
    // daily ip+ua hash, so ranking on it means one reader refreshing all
    // afternoon counts once a day rather than fifty times.
    const { rows } = await client.query<TrendingRow>(
      `select slug,
              count(*)::int                        as views,
              count(distinct visitor_hash)::int    as readers
         from post_views
        where kind = 'article'
          and slug is not null
          and viewed_at >= now() - make_interval(days => $1)
        group by slug
        order by readers desc, views desc
        limit $2`,
      [WINDOW_DAYS, LIMIT],
    )
    return rows
  } catch (err) {
    console.error('[getTrending] query failed', err)
    return []
  } finally {
    await client.end().catch(() => {})
  }
}

export const getTrending = unstable_cache(queryTrending, ['trending-articles'], {
  revalidate: REVALIDATE_SECONDS,
  tags: ['trending'],
})
