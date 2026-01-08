export default function EmptyState({ searchMode }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
      <svg className="w-20 h-20 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-lg font-medium text-gray-700">No emails found</p>
      <p className="text-sm mt-2 text-gray-500">
        {searchMode ? 'Try a different search term' : 'Click "Refresh" to sync your emails'}
      </p>
    </div>
  );
}