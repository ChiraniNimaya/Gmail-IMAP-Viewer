import { useState, useEffect } from 'react';
import { emailAPI } from '../../services/api';

export default function EmailDetail({ email, onClose, onEmailUpdate }) {
  const [fullEmail, setFullEmail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (email) {
      fetchFullEmail();
    }
  }, [email]);

  const fetchFullEmail = async () => {
    setLoading(true);
    try {
      const response = await emailAPI.getEmailById(email.id);
      setFullEmail(response.data.data.email);
      
      // Mark as read if unread
      if (!response.data.data.email.isRead) {
        await emailAPI.toggleReadStatus(email.id, true);
        if (onEmailUpdate) onEmailUpdate();
      }
    } catch (err) {
      console.error('Failed to fetch email:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete with IMAP awareness
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this email?\n\nThis will delete it from Gmail and cannot be undone.')) {
      setLoading(true);
      try {
        await emailAPI.deleteEmail(email.id);
        if (onEmailUpdate) onEmailUpdate();
        onClose();
      } catch (err) {
        console.error('Failed to delete email:', err);
        alert('Failed to delete email from Gmail. It may have already been deleted.\n\nError: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    }
  };

  // Email rendering 
  const renderEmailBody = () => {
    if (!fullEmail && !email) return null;
    
    const displayEmail = fullEmail || email;
    
    // Priority: HTML > Plain Text > Preview
    // Gmail shows HTML when available, falls back to plain text
    if (fullEmail?.bodyHtml) {
      return (
        <div 
          className="email-content prose prose-blue max-w-none"
          dangerouslySetInnerHTML={{ __html: fullEmail.bodyHtml }}
        />
      );
    } else if (fullEmail?.bodyText) {
      return (
        <div className="email-content">
          <pre className="whitespace-pre-wrap font-sans text-gray-800 text-base leading-relaxed">
            {fullEmail.bodyText}
          </pre>
        </div>
      );
    } else if (displayEmail?.bodyPreview) {
      return (
        <div className="email-content">
          <p className="text-gray-700 text-base leading-relaxed">
            {displayEmail.bodyPreview}
          </p>
        </div>
      );
    }
    
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No content available</p>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
        <div className="text-center p-8">
          <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-xl font-medium text-gray-700">No email selected</p>
          <p className="text-sm mt-2 text-gray-500">Select an email from the list to view its contents</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading email...</p>
        </div>
      </div>
    );
  }

  const displayEmail = fullEmail || email;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header Toolbar */}
      <div className="border-b px-4 py-3 bg-gray-50">
        <div className="flex items-center justify-between">
          {/* Back Button (Mobile) */}
          <button
            onClick={onClose}
            className="lg:hidden flex items-center gap-2 text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
          
          {/* Delete Button */}
          <div className="flex items-center gap-1 ml-auto">
            <button 
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium" 
              title="Delete email"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Email Header */}
      <div className="border-b px-6 py-5 bg-white">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{displayEmail.subject}</h1>
        
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
            {displayEmail.fromName ? displayEmail.fromName[0].toUpperCase() : 'U'}
          </div>
          
          {/* Sender Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-base">
                  {displayEmail.fromName || displayEmail.fromAddress}
                </p>
                <p className="text-sm text-gray-600">{displayEmail.fromAddress}</p>
              </div>
              <p className="text-sm text-gray-500">{formatDate(displayEmail.receivedDate)}</p>
            </div>
            
            <div className="mt-2 text-sm text-gray-600">
              <p>
                to me
                {displayEmail.toAddress && displayEmail.toAddress !== displayEmail.fromAddress && (
                  <span className="text-gray-400"> • {displayEmail.toAddress}</span>
                )}
              </p>
            </div>
            
            {displayEmail.ccAddress && (
              <p className="text-sm text-gray-600 mt-1">
                cc: <span className="text-gray-500">{displayEmail.ccAddress}</span>
              </p>
            )}
          </div>
        </div>
        
        {/* Attachments Preview */}
        {displayEmail.hasAttachments && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {displayEmail.attachmentCount} attachment{displayEmail.attachmentCount > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
        <div className="max-w-4xl mx-auto">
          {renderEmailBody()}
        </div>
      </div>
    </div>
  );
}