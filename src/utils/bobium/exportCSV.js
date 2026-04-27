const HEADERS = [
  'creature_id', 'creature_name', 'prompt', 'date_created',
  'rating', 'tags', 'style_violations', 'has_style_violations',
  'custom_tags', 'notes', 'rated_at', 'rated_by', 'image_path',
]

function cell(v) {
  if (v == null) return ''
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function toRow(creature, r = {}) {
  return [
    creature.creature_id,
    creature.creature_name,
    creature.prompt,
    creature.date_created,
    r.rating ?? '',
    (r.tags || []).join(';'),
    (r.style_violations || []).join(';'),
    r.has_style_violations ?? '',
    (r.custom_tags || []).join(';'),
    r.notes ?? '',
    r.rated_at ?? '',
    r.rated_by ?? '',
    creature.image_path,
  ].map(cell).join(',')
}

function download(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

const stamp = () => new Date().toISOString().slice(0, 10)

export function exportCSV(creatures, ratings) {
  const rows = [HEADERS.join(','), ...creatures.map(c => toRow(c, ratings[c.creature_id]))]
  download(`bobium_all_${stamp()}.csv`, rows.join('\n'))
}

export function exportRatedCSV(creatures, ratings) {
  const rated = creatures.filter(c => ratings[c.creature_id]?.rating)
  const rows = [HEADERS.join(','), ...rated.map(c => toRow(c, ratings[c.creature_id]))]
  download(`bobium_rated_${stamp()}.csv`, rows.join('\n'))
}
