const PAGE_SIZES = [10, 25, 50, 100]

export default function Pagination({ currentPage, totalPages, pageSize, onPage, onPageSize, totalItems }) {
  return (
    <div className="flex flex-wrap items-center justify-between mt-6 py-4 border-t border-gray-800 gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>{totalItems.toLocaleString()} creature{totalItems !== 1 ? 's' : ''}</span>
        <span className="text-gray-700">·</span>
        <select
          value={pageSize}
          onChange={e => onPageSize(Number(e.target.value))}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none cursor-pointer"
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} per page</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white disabled:opacity-40 hover:bg-gray-700 disabled:hover:bg-gray-800 transition-colors"
        >
          ← Prev
        </button>
        <span className="text-sm text-gray-400 min-w-[110px] text-center">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white disabled:opacity-40 hover:bg-gray-700 disabled:hover:bg-gray-800 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
