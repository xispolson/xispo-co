import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

export const prerender = false

function getDB(): D1Database | null {
  return (env as any)?.BOBIUM_DB ?? null
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const GET: APIRoute = async () => {
  const db = getDB()
  if (!db) return json([])

  const { results } = await db.prepare('SELECT tag FROM custom_tags ORDER BY created_at ASC').all()
  return json(results.map((r: any) => r.tag))
}

export const POST: APIRoute = async ({ request }) => {
  const db = getDB()
  if (!db) return json({ error: 'Database not available' }, 503)

  try {
    const { tag, created_by } = await request.json() as any
    if (!tag?.trim()) return json({ error: 'tag required' }, 400)

    await db.prepare('INSERT OR IGNORE INTO custom_tags (tag, created_by) VALUES (?, ?)')
      .bind(tag.trim(), created_by ?? '')
      .run()

    return json({ ok: true })
  } catch (err) {
    console.error('[bobium/tags POST]', err)
    return json({ error: String(err) }, 500)
  }
}
