import { useState } from 'react'
import { TAG_CATEGORIES } from '../../constants/bobium/tags.js'

const COLORS = {
  blue:    { on: 'bg-blue-600 text-white border-blue-500',    off: 'bg-gray-800 text-gray-300 border-gray-600 hover:border-blue-400' },
  purple:  { on: 'bg-purple-600 text-white border-purple-500', off: 'bg-gray-800 text-gray-300 border-gray-600 hover:border-purple-400' },
  emerald: { on: 'bg-emerald-600 text-white border-emerald-500', off: 'bg-gray-800 text-gray-300 border-gray-600 hover:border-emerald-400' },
}

function Pill({ label, selected, onClick, color = 'blue' }) {
  const c = COLORS[color] || COLORS.blue
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded-full border transition-colors ${selected ? c.on : c.off}`}
    >
      {label}
    </button>
  )
}

export default function TagPicker({ selectedTags = [], onToggleTag }) {
  const [open, setOpen] = useState(new Set(['art']))

  const toggle = key =>
    setOpen(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  return (
    <div className="space-y-2">
      {TAG_CATEGORIES.map(({ key, label, tags, color }) => (
        <div key={key}>
          <button
            onClick={() => toggle(key)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 hover:text-gray-200 transition-colors"
          >
            <span>{open.has(key) ? '▾' : '▸'}</span>
            {label}
          </button>
          {open.has(key) && (
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <Pill
                  key={tag.id}
                  label={tag.label}
                  selected={selectedTags.includes(tag.id)}
                  onClick={() => onToggleTag(tag.id)}
                  color={color}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
