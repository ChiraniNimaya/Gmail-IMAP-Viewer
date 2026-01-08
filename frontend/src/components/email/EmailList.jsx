import { useState, useEffect, useRef } from 'react';
import { emailAPI } from '../../services/api';
import EmailSearch from './EmailSearch';
import { useBulkOperations } from '../../hooks/useBulkOperations';
import EmailToolbar from './EmailToolbar';
import EmailItem from './EmailItem';
import EmailPagination from './EmailPagination';
import EmailStatusMessages from './EmailStatusMessages';
import EmptyState from './EmptyState';
import { useEmailData } from '../../hooks/useEmailData';  

export default function EmailList({ onSelectEmail, selectedEmailId }) {
  const listRef = useRef(null);

  const {
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
  } = useEmailData();

  const {
          selectedEmails,
          toggleEmailSelection,
          selectAll,
          handleBulkDelete
        } = useBulkOperations(emails, setEmails, setPagination);

  const onPageChange = (newPage) => {
    handlePageChange(newPage);
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

      <EmailPagination pagination={pagination} onPageChange={onPageChange} />

    </div>
  );
}