/**
 * HoursDisplay Component
 * 
 * Shows current open/closed status with Truth Hierarchy logic:
 * 1. Emergency Close Reason (highest priority)
 * 2. Special Dates (holidays, events)
 * 3. Weekly Operating Hours (split-shift support)
 * 
 * Phase 3 Master Plan requirement
 */

interface OpenStatus {
  isOpen: boolean;
  status: 'open' | 'closed' | 'emergency_closed';
  currentTime: string;
  timeZone: string;
  reason?: string;
  nextOpenTime?: string;
  nextCloseTime?: string;
  appliedRule?: 'emergency' | 'special_date' | 'weekly_hours';
}

interface HoursDisplayProps {
  status: OpenStatus;
  todayHours?: Array<{ startTime: string; endTime: string }>;
}

export function HoursDisplay({ status, todayHours }: HoursDisplayProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm print:hidden">
      {/* Current Status Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Hours</h2>
        <StatusBadge status={status} />
      </div>
      
      {/* Status Message */}
      <div className="mt-4">
        {status.status === 'emergency_closed' ? (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              ⚠️ {status.reason || 'Temporarily Closed'}
            </p>
          </div>
        ) : status.isOpen ? (
          <p className="text-gray-600">
            Open until <span className="font-semibold">{formatTime(status.nextCloseTime || '')}</span>
          </p>
        ) : (
          <p className="text-gray-600">
            {status.nextOpenTime ? (
              <>
                Closed. Opens at <span className="font-semibold">{formatTime(status.nextOpenTime)}</span>
              </>
            ) : (
              'Closed'
            )}
          </p>
        )}
        
        {status.reason && status.status !== 'emergency_closed' && (
          <p className="mt-2 text-sm text-gray-500">{status.reason}</p>
        )}
      </div>
      
      {/* Today's Hours */}
      {todayHours && todayHours.length > 0 && status.status !== 'emergency_closed' && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <p className="text-sm font-medium text-gray-700">Today's Hours:</p>
          <div className="mt-2 space-y-1">
            {todayHours.map((hours, idx) => (
              <p key={idx} className="text-sm text-gray-600">
                {formatTime(hours.startTime)} - {formatTime(hours.endTime)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: OpenStatus }) {
  if (status.status === 'emergency_closed') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
        Closed
      </span>
    );
  }
  
  if (status.isOpen) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
        <span className="mr-1.5 h-2 w-2 rounded-full bg-green-600"></span>
        Open Now
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
      Closed
    </span>
  );
}

function formatTime(time: string): string {
  if (!time) return '';
  
  // Handle "Tomorrow at HH:MM" format
  if (time.startsWith('Tomorrow')) {
    return time;
  }
  
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
}
