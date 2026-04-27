function download(filename, content) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

const stamp = () => new Date().toISOString().slice(0, 10)

export function exportRLHFJson(creatures, ratings) {
  const data = creatures
    .filter(c => ratings[c.creature_id]?.rating)
    .map(c => {
      const r = ratings[c.creature_id]
      return {
        id: c.creature_id,
        prompt: c.prompt,
        image_path: c.image_path.replace(/^\//, ''),
        human_score: r.rating,
        human_score_normalized: (r.rating - 1) / 4,
        tags: r.tags || [],
        style_violations: r.style_violations || [],
        has_style_violations: r.has_style_violations ?? false,
        custom_tags: r.custom_tags || [],
        notes: r.notes || '',
        rated_by: r.rated_by || '',
        rated_at: r.rated_at || '',
      }
    })
  download(`bobium_rlhf_${stamp()}.json`, JSON.stringify(data, null, 2))
}
