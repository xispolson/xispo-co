const FILTERS = [
  { value: 'all',        label: 'All' },
  { value: 'rated',      label: 'Rated' },
  { value: 'unrated',    label: 'Unrated' },
  { value: 'violations', label: 'Has Violations' },
]

const SORTS = [
  { value: 'date-desc',    label: 'Newest First' },
  { value: 'date-asc',     label: 'Oldest First' },
  { value: 'rating-desc',  label: 'Rating ↓' },
  { value: 'rating-asc',   label: 'Rating ↑' },
  { value: 'name-asc',     label: 'Name A–Z' },
  { value: 'unrated-first', label: 'Unrated First' },
]

export default function FilterBar({
  searchQuery, onSearch,
  filterMode, onFilter,
  sortMode, onSort,
  viewMode, onViewMode,
}) {
  return (
    <div className="sticky top-[53px] z-30 bg-gray-950/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex flex-wrap gap-2 items-center">
        <input
          type="search"
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search name or prompt…"
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white w-56 focus:outline-none focus:border-blue-500"
        />

        <div className="flex rounded-lg border border-gray-600 overflow-hidden">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`px-3 py-1.5 text-sm transition-colors ${filterMode === f.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={sortMode}
          onChange={e => onSort(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none cursor-pointer"
        >
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <div className="ml-auto flex rounded-lg border border-gray-600 overflow-hidden">
          <button
            onClick={() => onViewMode('grid')}
            className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            title="Grid view"
          >
            ⊞
          </button>
          <button
            onClick={() => onViewMode('list')}
            className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            title="List view"
          >
            ☰
          </button>
        </div>
      </div>
    </div>
  )
}
