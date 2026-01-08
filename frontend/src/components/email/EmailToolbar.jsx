export default function EmailToolbar({
  selectedCount,
  totalEmails,
  allSelected,
  syncing,
  pagination,
  onSelectAll,
  onSync,
  onBulkDelete
}) {
  return (
    <div className="border-b px-4 py-3 flex items-center justify-between bg-gray-50">
      <div className="flex items-center gap-3">

        <input
          type="checkbox"
          checked={allSelected}
          onChange={onSelectAll}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
        />
        
        {selectedCount === 0 && (
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            title="Sync emails"
          >
            <svg 
              className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Syncing...' : 'Refresh'}
          </button>
        )}

        {selectedCount > 0 && (
          <>
            <span className="text-sm text-gray-600 font-medium">
              {selectedCount} selected
            </span>
            
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              title="Delete selected"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </>
        )}
      </div>

      <div className="text-sm text-gray-600">
        {totalEmails > 0 && (
          <span>
            {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
        )}
      </div>
    </div>
  );
}