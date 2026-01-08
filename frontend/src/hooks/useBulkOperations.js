import { useState } from 'react';
import { emailAPI } from '../services/api';

export const useBulkOperations = (emails, setEmails, setPagination) => {
  const [selectedEmails, setSelectedEmails] = useState(new Set());

  const toggleEmailSelection = (emailId) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const selectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedEmails.size} email(s)?\n\nThis will delete them from Gmail and cannot be undone.`
    );

    if (!confirmed) return;

    const deletedFromGmail = [];
    const deletedOnlyLocally = [];
    const failedDeletes = [];

    try {
      const deletePromises = Array.from(selectedEmails).map(async (id) => {
        try {
          const response = await emailAPI.deleteEmail(id);

          if (response?.data?.data?.deletedFromGmail) {
            deletedFromGmail.push(id);
          } else {
            deletedOnlyLocally.push(id);
          }

          return { id, success: true };
        } catch (err) {
          failedDeletes.push(id);
          console.error(`Failed to delete email ID ${id}:`, err);
          return { id, success: false };
        }
      });

      await Promise.all(deletePromises);

      // Remove deleted emails from UI
      setEmails(prev => prev.filter(email => !selectedEmails.has(email.id)));
      setPagination(prev => ({
        ...prev,
        total: Math.max(prev.total - selectedEmails.size, 0)
      }));
      setSelectedEmails(new Set());

      let message = '';
      if (deletedFromGmail.length > 0) {
        message += `${deletedFromGmail.length} email(s) deleted from Gmail.\n`;
      }
      if (deletedOnlyLocally.length > 0) {
        message += `${deletedOnlyLocally.length} email(s) were already removed from Gmail but deleted locally.\n`;
      }
      if (failedDeletes.length > 0) {
        message += `${failedDeletes.length} email(s) could not be deleted. Please try again.`;
      }

      if (message) {
        alert(message);
      }

      return { success: true };
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert(err.response?.data?.message || 'Failed to delete emails');
      return { success: false };
    }
  };

  return {
    selectedEmails,
    toggleEmailSelection,
    selectAll,
    handleBulkDelete
  };
};