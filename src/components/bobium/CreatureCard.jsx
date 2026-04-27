import { useState } from 'react'
import StarRating from './StarRating.jsx'
import TagPicker from './TagPicker.jsx'
import StyleViolations from './StyleViolations.jsx'
import NotesField from './NotesField.jsx'
import CustomTagInput from './CustomTagInput.jsx'

function borderStyle(rating) {
  if (!rating?.rating) return { borderColor: '#374151' }
  if (rating.rating === 1) return { borderColor: '#C0392B' }
  if (rating.rating <= 3) return { borderColor: '#C8922A' }
  return { borderColor: '#1E7E34' }
}

export default function CreatureCard({ creature, rating = {}, onUpdate, customTags = [], onAddCustomTag, onDeleteCustomTag, viewMode }) {
  const [promptExpanded, setPromptExpanded] = useState(false)

  const tags        = rating.tags            || []
  const violations  = rating.style_violations || []
  const customSelected = rating.custom_tags  || []
  const notes       = rating.notes           || ''
  const hasViolations = violations.length > 0

  const toggleTag = id => {
    const next = tags.includes(id) ? tags.filter(t => t !== id) : [...tags, id]
    onUpdate({ tags: next })
  }

  const toggleCustomTag = id => {
    const next = customSelected.includes(id)
      ? customSelected.filter(t => t !== id)
      : [...customSelected, id]
    onUpdate({ custom_tags: next })
  }

  const handleAddCustomTag = tag => {
    onAddCustomTag(tag)
    if (!customSelected.includes(tag)) onUpdate({ custom_tags: [...customSelected, tag] })
  }

  const handleViolation = id => {
    const next = violations.includes(id) ? violations.filter(t => t !== id) : [...violations, id]
    onUpdate({ style_violations: next, has_style_violations: next.length > 0 })
  }

  const prompt = creature.prompt || ''
  const truncated = prompt.length > 140
  const displayPrompt = truncated && !promptExpanded ? prompt.slice(0, 140) + '…' : prompt

  if (viewMode === 'list') {
    return (
      <div
        className="flex gap-3 bg-gray-900 rounded-xl border-2 p-3 transition-shadow hover:shadow-lg hover:shadow-black/40"
        style={borderStyle(rating)}
      >
        <div className="relative w-20 h-20 flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden">
          <img
            src={creature.image_path}
            alt={creature.creature_name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          {hasViolations && (
            <div className="absolute top-1 right-1 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">!</div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="font-bold text-white text-sm truncate">{creature.creature_name}</h3>
          <p className="text-xs text-gray-400 line-clamp-2">{creature.prompt}</p>
          <StarRating rating={rating?.rating} onChange={val => onUpdate({ rating: val })} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-gray-900 rounded-xl border-2 overflow-hidden transition-shadow hover:shadow-xl hover:shadow-black/50 flex flex-col"
      style={borderStyle(rating)}
    >
      {/* Image */}
      <div className="relative bg-gray-800" style={{ aspectRatio: '1/1' }}>
        <img
          src={creature.image_path}
          alt={creature.creature_name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={e => {
            const p = e.currentTarget.parentElement
            if (p) p.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem;color:#4b5563">🐉</div>'
          }}
        />
        {hasViolations && (
          <div
            className="absolute top-2 right-2 bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shadow-lg font-bold"
            title={`${violations.length} style violation${violations.length > 1 ? 's' : ''}`}
          >
            !
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 flex flex-col flex-1">
        <div>
          <h3 className="font-bold text-white mb-1 leading-tight">{creature.creature_name}</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            {displayPrompt}
            {truncated && (
              <button
                onClick={() => setPromptExpanded(e => !e)}
                className="ml-1 text-blue-400 hover:text-blue-300 font-medium"
              >
                {promptExpanded ? 'less' : 'more'}
              </button>
            )}
          </p>
          <p className="text-xs text-gray-600 mt-1">{creature.date_created}</p>
        </div>

        <StarRating rating={rating?.rating} onChange={val => onUpdate({ rating: val })} />

        <StyleViolations violations={violations} onToggleViolation={handleViolation} />

        <TagPicker selectedTags={tags} onToggleTag={toggleTag} />

        <CustomTagInput
          selectedTags={customSelected}
          allTags={customTags}
          onToggle={toggleCustomTag}
          onAdd={handleAddCustomTag}
          onDelete={onDeleteCustomTag}
        />

        <NotesField notes={notes} onChange={val => onUpdate({ notes: val })} />
      </div>
    </div>
  )
}
