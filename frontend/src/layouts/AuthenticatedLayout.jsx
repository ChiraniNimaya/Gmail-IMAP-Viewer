import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import EmailList from '../components/email/EmailList';
import EmailDetail from '../components/email/EmailDetail';

export default function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* App Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gmail IMAP Viewer
              </h1>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}

              <span className="text-sm font-medium text-gray-700">
                {user?.name}
              </span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Email List */}
        <section
          className={`${
            selectedEmail ? 'hidden lg:block' : 'block'
          } w-full lg:w-1/3 border-r bg-white`}
        >
          <EmailList
            key={refreshKey}
            onSelectEmail={setSelectedEmail}
          />
        </section>

        {/* Email Detail */}
        <section
          className={`${
            selectedEmail ? 'block' : 'hidden lg:block'
          } w-full lg:w-2/3`}
        >
          <EmailDetail
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onEmailUpdate={() => setRefreshKey(k => k + 1)}
          />
        </section>
      </main>
    </div>
  );
}