import { exportCSV, exportRatedCSV } from '../../utils/bobium/exportCSV.js'
import { exportRLHFJson } from '../../utils/bobium/exportJSON.js'

export default function ExportButton({ creatures, ratings }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => exportCSV(creatures, ratings)}
        className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 rounded-lg transition-colors"
        title="Export all creatures to CSV"
      >
        Export CSV
      </button>
      <button
        onClick={() => exportRatedCSV(creatures, ratings)}
        className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 rounded-lg transition-colors"
        title="Export only rated creatures to CSV"
      >
        Rated Only
      </button>
      <button
        onClick={() => exportRLHFJson(creatures, ratings)}
        className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 border border-blue-600 text-white rounded-lg transition-colors"
        title="Export RLHF JSON for reward model pipeline"
      >
        RLHF JSON
      </button>
    </div>
  )
}
