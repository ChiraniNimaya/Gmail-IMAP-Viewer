import { useState, useEffect, useRef } from 'react';
import { emailAPI } from '../../services/api';
import EmailSearch from './EmailSearch';
import { useBulkOperations } from '../../hooks/useBulkOperations';
import EmailToolbar from './EmailToolbar';
import EmailItem from './EmailItem';
import EmailPagination from './EmailPagination';
import EmailStatusMessages from './EmailStatusMessages';
import EmptyState from './EmptyState';

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
      <EmailSearch onSearch={handleSearch} onClear={handleClearSearch} />

      <EmailToolbar
        selectedCount={selectedEmails.size}
        totalEmails={emails.length}
        allSelected={selectedEmails.size === emails.length && emails.length > 0}
        syncing={syncing}
        pagination={pagination}
        onSelectAll={selectAll}
        onSync={syncEmails}
        onBulkDelete={handleBulkDelete}
      />

      <EmailStatusMessages
        error={error}
        searchMode={searchMode}
        searchParams={searchParams}
        onClearSearch={handleClearSearch}
      />

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <EmptyState searchMode={searchMode} />
        ) : (
          <div>
            {emails.map((email) => (
              <EmailItem
                key={email.id}
                email={email}
                isSelected={selectedEmails.has(email.id)}
                isActive={selectedEmailId === email.id}
                onSelect={onSelectEmail}
                onToggleSelection={toggleEmailSelection}
              />
            ))}
          </div>
        )}
      </div>

      <EmailPagination pagination={pagination} onPageChange={handlePageChange} />

    </div>
  );
}