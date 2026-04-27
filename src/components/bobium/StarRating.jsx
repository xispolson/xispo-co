import { useState } from 'react'

export default function StarRating({ rating, onChange }) {
  const [hovered, setHovered] = useState(null)
  const active = hovered ?? rating ?? 0

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onChange(rating === star ? null : star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className="text-2xl leading-none transition-transform hover:scale-125 focus:outline-none"
          title={`${star} star${star > 1 ? 's' : ''}`}
        >
          <span className={star <= active ? 'text-yellow-400' : 'text-gray-600'}>★</span>
        </button>
      ))}
    </div>
  )
}
