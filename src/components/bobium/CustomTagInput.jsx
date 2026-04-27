import { useState, useRef, useEffect } from 'react'

const MAX_VISIBLE = 8

export default function CustomTagInput({ selectedTags = [], allTags = [], onToggle, onAdd, onDelete }) {
  const [input, setInput]           = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [editMode, setEditMode]     = useState(false)
  const [showAll, setShowAll]       = useState(false)
  const wrapperRef = useRef(null)

  const normalized = input.trim().toLowerCase().replace(/\s+/g, '-')
  const unselected = allTags.filter(t => !selectedTags.includes(t))
  const suggestions = normalized
    ? allTags.filter(t => t.includes(normalized) && !selectedTags.includes(t))
    : []

  const visibleUnselected = showAll ? unselected : unselected.slice(0, MAX_VISIBLE)
  const hiddenCount = unselected.length - MAX_VISIBLE

  useEffect(() => {
    function onClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
        setEditMode(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const commit = (tag) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t) return
    onAdd(t)
    setInput('')
    setShowDropdown(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { commit(input); return }
    if (e.key === 'Escape') { setShowDropdown(false); setInput('') }
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      wrapperRef.current?.querySelector('[data-suggestion]')?.focus()
    }
  }

  return (
    <div ref={wrapperRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Custom Tags</span>
        {allTags.length > 0 && (
          <button
            onClick={() => setEditMode(m => !m)}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${editMode ? 'bg-red-900/50 border-red-700 text-red-300' : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-gray-200'}`}
          >
            {editMode ? 'Done' : 'Manage'}
          </button>
        )}
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedTags.map(tag => (
            <button
              key={tag}
              onClick={() => onToggle(tag)}
              className="text-xs px-2 py-1 rounded-full border bg-blue-600 border-blue-500 text-white flex items-center gap-1 hover:bg-blue-700 transition-colors"
            >
              {tag} <span className="opacity-60">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Input + dropdown */}
      <div className="relative flex gap-1">
        <input
          className="flex-1 text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
          placeholder={allTags.length ? 'Search or create a tag…' : 'Create a tag…'}
          value={input}
          onChange={e => { setInput(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={() => commit(input)}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded border border-gray-600 transition-colors"
        >
          +
        </button>

        {showDropdown && normalized && (
          <div className="absolute top-full left-0 right-0 mt-0.5 bg-gray-800 border border-gray-600 rounded-lg overflow-hidden z-20 shadow-xl">
            {suggestions.map(s => (
              <button
                key={s}
                data-suggestion
                tabIndex={0}
                onClick={() => { onToggle(s); setInput(''); setShowDropdown(false) }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { onToggle(s); setInput(''); setShowDropdown(false) }
                  if (e.key === 'ArrowDown') e.currentTarget.nextElementSibling?.focus()
                  if (e.key === 'ArrowUp') {
                    const prev = e.currentTarget.previousElementSibling
                    prev ? prev.focus() : wrapperRef.current?.querySelector('input')?.focus()
                  }
                }}
                className="w-full text-left text-xs px-3 py-1.5 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
            {normalized && !allTags.includes(normalized) && (
              <button
                onClick={() => commit(input)}
                className="w-full text-left text-xs px-3 py-1.5 text-blue-400 hover:bg-gray-700 transition-colors border-t border-gray-700"
              >
                Create "{normalized}"
              </button>
            )}
            {suggestions.length === 0 && allTags.includes(normalized) && (
              <div className="text-xs px-3 py-1.5 text-gray-500">Already in library</div>
            )}
          </div>
        )}
      </div>

      {/* Unselected library tags */}
      {!input && unselected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {visibleUnselected.map(tag => (
            <div key={tag} className="flex items-center gap-0.5">
              <button
                onClick={() => onToggle(tag)}
                className="text-xs px-2 py-1 rounded-l-full border bg-gray-800 border-gray-600 text-gray-300 hover:border-blue-400 transition-colors"
              >
                {tag}
              </button>
              {editMode && (
                <button
                  onClick={() => { onDelete(tag); if (unselected.length === 1) setEditMode(false) }}
                  className="text-[10px] px-1.5 py-1 rounded-r-full border border-l-0 border-red-800 bg-red-950/50 text-red-400 hover:bg-red-900/60 transition-colors"
                  title={`Delete "${tag}" from library`}
                >
                  ×
                </button>
              )}
              {!editMode && (
                <span className="w-0 overflow-hidden" />
              )}
            </div>
          ))}
          {!editMode && hiddenCount > 0 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs px-2 py-1 rounded-full border border-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
            >
              +{hiddenCount} more
            </button>
          )}
          {showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(false)}
              className="text-xs px-2 py-1 rounded-full border border-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  )
}
