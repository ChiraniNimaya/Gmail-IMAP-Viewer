export default function EmailPagination({ pagination, onPageChange }) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
      <button
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={pagination.page === 1}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-white hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Newer
      </button>
      
      <span className="text-sm text-gray-600">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={pagination.page === pagination.totalPages}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-white hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Older
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}