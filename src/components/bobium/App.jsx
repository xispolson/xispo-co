import { useState, useEffect, useMemo } from 'react'
import creaturesData from '../../data/bobium/creatures.json'
import { useRatings } from '../../hooks/bobium/useRatings.js'
import CreatureCard from './CreatureCard.jsx'
import Pagination from './Pagination.jsx'
import FilterBar from './FilterBar.jsx'
import ExportButton from './ExportButton.jsx'
import ProgressBar from './ProgressBar.jsx'

const RATER_KEY    = 'bb_rater'
const PAGE_SIZE_KEY = 'bb_page_size'

function sort(list, mode, ratings) {
  return [...list].sort((a, b) => {
    const ra = ratings[a.creature_id]
    const rb = ratings[b.creature_id]
    switch (mode) {
      case 'date-asc':      return a.date_created.localeCompare(b.date_created)
      case 'date-desc':     return b.date_created.localeCompare(a.date_created)
      case 'rating-desc':   return (rb?.rating || 0) - (ra?.rating || 0)
      case 'rating-asc':    return (ra?.rating || 0) - (rb?.rating || 0)
      case 'name-asc':      return a.creature_name.localeCompare(b.creature_name)
      case 'unrated-first': return (ra?.rating ? 1 : 0) - (rb?.rating ? 1 : 0)
      default:              return 0
    }
  })
}

export default function App() {
  const { ratings, updateRating, customTags, addCustomTag, deleteCustomTag, loading } = useRatings()

  const [raterName, setRaterName]         = useState(() => localStorage.getItem(RATER_KEY) || '')
  const [showRaterPrompt, setShowRaterPrompt] = useState(() => !localStorage.getItem(RATER_KEY))
  const [raterInput, setRaterInput]       = useState('')
  const [searchQuery, setSearchQuery]     = useState('')
  const [filterMode, setFilterMode]       = useState('all')
  const [sortMode, setSortMode]           = useState('date-desc')
  const [currentPage, setCurrentPage]     = useState(1)
  const [pageSize, setPageSize]           = useState(() => parseInt(localStorage.getItem(PAGE_SIZE_KEY) || '25'))
  const [viewMode, setViewMode]           = useState('grid')

  const filtered = useMemo(() => {
    let list = creaturesData

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c =>
        c.creature_name.toLowerCase().includes(q) ||
        c.prompt.toLowerCase().includes(q)
      )
    }

    if (filterMode === 'rated')      list = list.filter(c =>  ratings[c.creature_id]?.rating)
    if (filterMode === 'unrated')    list = list.filter(c => !ratings[c.creature_id]?.rating)
    if (filterMode === 'violations') list = list.filter(c =>  ratings[c.creature_id]?.has_style_violations)

    return sort(list, sortMode, ratings)
  }, [ratings, searchQuery, filterMode, sortMode])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page       = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => { setCurrentPage(1) }, [searchQuery, filterMode, sortMode, pageSize])
  useEffect(() => { localStorage.setItem(PAGE_SIZE_KEY, pageSize.toString()) }, [pageSize])

  const ratedCount    = Object.values(ratings).filter(r => r.rating).length
  const filteredRated = filtered.filter(c => ratings[c.creature_id]?.rating).length
  const isFiltered    = filterMode !== 'all' || !!searchQuery

  const handleSetRater = () => {
    const name = raterInput.trim()
    if (!name) return
    setRaterName(name)
    localStorage.setItem(RATER_KEY, name)
    setShowRaterPrompt(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Rater identity modal */}
      {showRaterPrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-1">Who's rating today?</h2>
            <p className="text-gray-400 text-sm mb-4">Saved with every rating for export attribution.</p>
            <input
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white mb-4 focus:outline-none focus:border-blue-500"
              placeholder="e.g. Chris"
              value={raterInput}
              onChange={e => setRaterInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSetRater()}
              autoFocus
            />
            <button
              onClick={handleSetRater}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              Start Rating
            </button>
          </div>
        </div>
      )}

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between mb-2 gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <a href="/" className="text-gray-600 hover:text-gray-400 text-sm transition-colors flex-shrink-0">
                ← xispo.co
              </a>
              <h1 className="text-base font-bold text-white flex-shrink-0">🐉 Bobium Rater</h1>
              <span className="text-sm text-gray-500 truncate">
                Rating as:{' '}
                <button
                  onClick={() => setShowRaterPrompt(true)}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  {raterName || 'set name'}
                </button>
              </span>
            </div>
            <ExportButton creatures={creaturesData} ratings={ratings} />
          </div>
          <ProgressBar
            rated={ratedCount}
            total={creaturesData.length}
            filteredRated={filteredRated}
            filteredTotal={filtered.length}
            isFiltered={isFiltered}
          />
        </div>
      </header>

      <FilterBar
        searchQuery={searchQuery} onSearch={setSearchQuery}
        filterMode={filterMode}   onFilter={setFilterMode}
        sortMode={sortMode}       onSort={setSortMode}
        viewMode={viewMode}       onViewMode={setViewMode}
      />

      <main className="max-w-screen-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-24 text-gray-600">
            <div className="text-4xl mb-3 animate-pulse">🐉</div>
            <p className="text-lg">Loading ratings…</p>
          </div>
        ) : page.length === 0 ? (
          <div className="text-center py-24 text-gray-600">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-lg">No creatures match your filters.</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'flex flex-col gap-2'
          }>
            {page.map(creature => (
              <CreatureCard
                key={creature.creature_id}
                creature={creature}
                rating={ratings[creature.creature_id]}
                onUpdate={updates => updateRating(creature.creature_id, updates, raterName)}
                customTags={customTags}
                onAddCustomTag={addCustomTag}
                onDeleteCustomTag={deleteCustomTag}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}

        {!loading && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPage={setCurrentPage}
            onPageSize={setPageSize}
            totalItems={filtered.length}
          />
        )}
      </main>
    </div>
  )
}
