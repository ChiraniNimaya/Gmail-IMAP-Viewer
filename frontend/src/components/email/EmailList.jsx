import { useState, useEffect, useRef } from 'react';
import { emailAPI } from '../../services/api';
import EmailSearch from './EmailSearch';
import { formatDate } from './emailListUtils';  
import { useBulkOperations } from '../../hooks/useBulkOperations';

export default function EmailList({ onSelectEmail, selectedEmailId }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [error, setError] = useState(null);
  const [searchMode, setSearchMode] = useState(false);

  const {
          selectedEmails,
          toggleEmailSelection,
          selectAll,
          handleBulkDelete
        } = useBulkOperations(emails, setEmails, setPagination);
  const listRef = useRef(null);

  const [searchParams, setSearchParams] = useState(null);

  useEffect(() => {
    // Fetch emails or search based on mode
    if (searchMode && searchParams) {
      performSearch(searchParams);
    } else {
      fetchEmails();
    }
  }, [pagination.page]);

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await emailAPI.getEmails({
        page: pagination.page,
        limit: pagination.limit
      });
      
      setEmails(response.data.data.emails);
      setPagination(response.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch emails');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    setError(null);
    
    try {
      await emailAPI.syncEmails({ limit: 50 });
      await fetchEmails();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sync emails');
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };


  const performSearch = async (params) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await emailAPI.searchEmails({
        ...params,
        page: pagination.page,
        limit: pagination.limit
      });
      setEmails(response.data.data.emails);
      setPagination(response.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search emails');
    } finally {
      setLoading(false);
    }
  };

  // Store search params for pagination
  const handleSearch = async (params) => {
    setSearchMode(true);
    setSearchParams(params);
    setPagination(prev => ({ ...prev, page: 1 }));
    await performSearch(params);
  };

  // Clear search params and mode
  const handleClearSearch = () => {
    setSearchMode(false);
    setSearchParams(null);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchEmails();
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  if (loading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search Bar */}
      <EmailSearch onSearch={handleSearch} onClear={handleClearSearch} />

      {/* Toolbar */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          {/* Select All Checkbox */}
          <input
            type="checkbox"
            checked={selectedEmails.size === emails.length && emails.length > 0}
            onChange={selectAll}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
          />
          
          {/* Sync Button - Hidden when emails are selected */}
          {selectedEmails.size === 0 && (
            <button
              onClick={syncEmails}
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

          {selectedEmails.size > 0 && (
            <>
              <span className="text-sm text-gray-600 font-medium">
                {selectedEmails.size} selected
              </span>
              
              {/* Bulk Delete Button */}
              <button
                onClick={handleBulkDelete}
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

        {/* Pagination Info */}
        <div className="text-sm text-gray-600">
          {emails.length > 0 && (
            <span>
              {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-4 mt-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Search mode indicator */}
      {searchMode && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mx-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <p className="text-blue-700 text-sm font-medium">
                Search results for: "{searchParams?.query}"
              </p>
            </div>
            <button
              onClick={handleClearSearch}
              className="text-blue-700 hover:text-blue-900 text-sm font-medium underline"
            >
              Clear search
            </button>
          </div>
        </div>
      )}

      {/* Email List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <svg className="w-20 h-20 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-lg font-medium text-gray-700">No emails found</p>
            <p className="text-sm mt-2 text-gray-500">
              {searchMode ? 'Try a different search term' : 'Click "Refresh" to sync your emails'}
            </p>
          </div>
        ) : (
          <div>
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`border-b hover:shadow-sm transition-all cursor-pointer ${
                  selectedEmailId === email.id 
                    ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                    : 'border-l-4 border-l-transparent hover:bg-gray-50'
                } ${!email.isRead ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedEmails.has(email.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleEmailSelection(email.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />

                    {/* Email Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm truncate ${
                          !email.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                        }`}>
                          {email.fromName || email.fromAddress}
                        </h3>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatDate(email.receivedDate)}
                        </span>
                      </div>
                      
                      <p className={`text-sm truncate mb-1 ${
                        !email.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'
                      }`}>
                        {email.subject}
                      </p>
                      
                      <p className="text-xs text-gray-500 truncate">
                        {email.bodyPreview}
                      </p>
                      
                      {/* Tags */}
                      {email.hasAttachments && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {email.attachmentCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
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
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-white hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Older
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}