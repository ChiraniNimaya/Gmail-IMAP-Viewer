import { useState, useEffect } from 'react';
import { emailAPI } from '../services/api';

export const useEmailData = () => {
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
  const [searchParams, setSearchParams] = useState(null);

  useEffect(() => {
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

  const handleSearch = async (params) => {
    setSearchMode(true);
    setSearchParams(params);
    setPagination(prev => ({ ...prev, page: 1 }));
    await performSearch(params);
  };

  const handleClearSearch = () => {
    setSearchMode(false);
    setSearchParams(null);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchEmails();
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return {
    emails,
    setEmails,
    loading,
    syncing,
    pagination,
    setPagination,
    error,
    searchMode,
    searchParams,
    syncEmails,
    handleSearch,
    handleClearSearch,
    handlePageChange
  };
};