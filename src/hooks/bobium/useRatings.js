import { useState, useEffect } from 'react'

// Falls back to localStorage when the API is unavailable (e.g. plain `astro dev`
// without wrangler). With platformProxy enabled and wrangler.toml configured,
// `astro dev` will use a local D1 database.

let mode = 'api' // 'api' | 'local' — detected on first load

function ls(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback }
  catch { return fallback }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export function useRatings() {
  const [ratings, setRatings]     = useState({})
  const [customTags, setCustomTags] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [rRes, tRes] = await Promise.all([
          fetch('/api/bobium/ratings'),
          fetch('/api/bobium/tags'),
        ])
        if (!rRes.ok || !tRes.ok) throw new Error('API error')
        const [r, t] = await Promise.all([rRes.json(), tRes.json()])
        mode = 'api'
        setRatings(r)
        setCustomTags(t)
      } catch {
        mode = 'local'
        setRatings(ls('bb_ratings', {}))
        setCustomTags(ls('bb_custom_tags', []))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function updateRating(creatureId, updates, raterName) {
    setRatings(prev => {
      const next = {
        ...prev,
        [creatureId]: {
          ...prev[creatureId],
          ...updates,
          rated_at: new Date().toISOString(),
          rated_by: raterName || '',
        },
      }
      if (mode === 'local') lsSet('bb_ratings', next)
      else fetch('/api/bobium/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creature_id: creatureId, ...next[creatureId] }),
      }).catch(console.error)
      return next
    })
  }

  function addCustomTag(tag) {
    setCustomTags(prev => {
      if (prev.includes(tag)) return prev
      const next = [...prev, tag]
      if (mode === 'local') lsSet('bb_custom_tags', next)
      else fetch('/api/bobium/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      }).catch(console.error)
      return next
    })
  }

  function deleteCustomTag(tag) {
    setCustomTags(prev => {
      const next = prev.filter(t => t !== tag)
      if (mode === 'local') lsSet('bb_custom_tags', next)
      else fetch(`/api/bobium/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' })
        .catch(console.error)
      return next
    })
  }

  return { ratings, customTags, loading, updateRating, addCustomTag, deleteCustomTag }
}
