import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

export const prerender = false

function getDB(): D1Database | null {
  return (env as any)?.BOBIUM_DB ?? null
}

export const GET: APIRoute = async () => {
  const db = getDB()
  if (!db) return json({})

  try {
    const { results } = await db.prepare('SELECT * FROM ratings').all()
    const map: Record<string, unknown> = {}
    for (const row of results) {
      map[row.creature_id as string] = {
        rating:               row.rating,
        tags:                 parse(row.tags as string),
        style_violations:     parse(row.style_violations as string),
        has_style_violations: Boolean(row.has_style_violations),
        custom_tags:          parse(row.custom_tags as string),
        notes:                row.notes,
        rated_at:             row.rated_at,
        rated_by:             row.rated_by,
      }
    }
    return json(map)
  } catch (err) {
    return json({}, 500)
  }
}

export const POST: APIRoute = async ({ request }) => {
  const db = getDB()
  if (!db) return json({ error: 'Database not available' }, 503)

  try {
    const b = await request.json() as any
    await db.prepare(`
      INSERT INTO ratings (creature_id, rating, tags, style_violations, has_style_violations, custom_tags, notes, rated_at, rated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(creature_id) DO UPDATE SET
        rating               = excluded.rating,
        tags                 = excluded.tags,
        style_violations     = excluded.style_violations,
        has_style_violations = excluded.has_style_violations,
        custom_tags          = excluded.custom_tags,
        notes                = excluded.notes,
        rated_at             = excluded.rated_at,
        rated_by             = excluded.rated_by
    `).bind(
      b.creature_id,
      b.rating ?? null,
      stringify(b.tags),
      stringify(b.style_violations),
      b.has_style_violations ? 1 : 0,
      stringify(b.custom_tags),
      b.notes ?? '',
      b.rated_at ?? new Date().toISOString(),
      b.rated_by ?? '',
    ).run()
    return json({ ok: true })
  } catch (err) {
    console.error('[bobium/ratings POST]', err)
    return json({ error: String(err) }, 500)
  }
}

function parse(v: string): unknown[] {
  try { return JSON.parse(v || '[]') } catch { return [] }
}
function stringify(v: unknown): string {
  return JSON.stringify(Array.isArray(v) ? v : [])
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
