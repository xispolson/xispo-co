import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

export const prerender = false

export const DELETE: APIRoute = async ({ params }) => {
  const db = (env as any)?.BOBIUM_DB as D1Database | undefined
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 503 })

  try {
    await db.prepare('DELETE FROM custom_tags WHERE tag = ?').bind(params.tag).run()
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[bobium/tags DELETE]', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
