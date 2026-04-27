import { useState } from 'react'
import { STYLE_VIOLATION_TAGS } from '../../constants/bobium/tags.js'

const DETAIL_TAGS = STYLE_VIOLATION_TAGS.filter(t => t.id !== 'wrong-style')

export default function StyleViolations({ violations = [], onToggleViolation }) {
  const [open, setOpen] = useState(false)
  const hasAny = violations.length > 0
  const wrongStyle = violations.includes('wrong-style')

  return (
    <div className={`rounded-lg border p-2 transition-colors ${hasAny ? 'border-red-800 bg-red-950/30' : 'border-gray-700 bg-gray-800/20'}`}>
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${hasAny ? 'text-red-400 hover:text-red-300' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span>{open ? '▾' : '▸'}</span>
          Style Violations
          {hasAny && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white rounded-full text-[10px] leading-none">
              {violations.length}
            </span>
          )}
        </button>
        <button
          onClick={() => onToggleViolation('wrong-style')}
          className={`text-xs px-2 py-1 rounded border transition-colors font-medium ${wrongStyle ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-red-500'}`}
        >
          ❌ Wrong Style
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap gap-1 mt-2">
          {DETAIL_TAGS.map(tag => {
            const on = violations.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => onToggleViolation(tag.id)}
                title={tag.label}
                className={`text-xs px-2 py-1 rounded border transition-colors ${on ? 'bg-red-700 border-red-600 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-red-500'}`}
              >
                {tag.emoji} {tag.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
