import { useState } from 'react'

export default function NotesField({ notes = '', onChange }) {
  const [open, setOpen] = useState(!!notes)
  const [value, setValue] = useState(notes)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs transition-colors ${notes ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-500 hover:text-gray-300'}`}
      >
        <span>📝</span>
        <span>{notes ? 'Notes' : 'Add notes'}</span>
        {notes && <span className="text-gray-600">· {notes.length}ch</span>}
      </button>
      {open && (
        <textarea
          className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-blue-500"
          rows={3}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={() => { if (value !== notes) onChange(value) }}
          placeholder="Notes about this creature…"
          autoFocus
        />
      )}
    </div>
  )
}
