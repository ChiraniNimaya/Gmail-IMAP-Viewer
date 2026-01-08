import { formatDate } from './emailListUtils';

export default function EmailItem({
  email,
  isSelected,
  isActive,
  onSelect,
  onToggleSelection
}) {
  return (
    <div
      onClick={() => onSelect(email)}
      className={`border-b hover:shadow-sm transition-all cursor-pointer ${
        isActive
          ? 'bg-blue-50 border-l-4 border-l-blue-600' 
          : 'border-l-4 border-l-transparent hover:bg-gray-50'
      } ${!email.isRead ? 'bg-white' : 'bg-gray-50'}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection(email.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
          />

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
  );
}