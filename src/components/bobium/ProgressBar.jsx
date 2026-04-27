export default function ProgressBar({ rated, total, filteredRated, filteredTotal, isFiltered }) {
  const pct = total > 0 ? Math.round((rated / total) * 100) : 0
  const fPct = filteredTotal > 0 ? Math.round((filteredRated / filteredTotal) * 100) : 0

  return (
    <div>
      <div className="flex items-center text-xs text-gray-400 mb-1 gap-2">
        <span>{rated.toLocaleString()} / {total.toLocaleString()} rated — {pct}%</span>
        {isFiltered && (
          <span className="text-blue-400">
            ({filteredRated} / {filteredTotal} in view — {fPct}%)
          </span>
        )}
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
