/**
 * CallInterceptModal Component
 * 
 * Phase 3 Master Plan requirement:
 * If status is CLOSED, clicking "Call" doesn't dial immediately.
 * Instead, a modal appears: "We are currently closed. We open in [X] minutes. Call anyway?"
 */

import { useState } from 'react';

interface CallInterceptModalProps {
  phoneNumber: string;
  isOpen: boolean;
  nextOpenTime?: string;
}

export function CallButton({ phoneNumber, isOpen, nextOpenTime }: CallInterceptModalProps) {
  const [showModal, setShowModal] = useState(false);
  
  const handleCallClick = (e: React.MouseEvent) => {
    if (!isOpen) {
      e.preventDefault();
      setShowModal(true);
    }
    // If open, let the tel: link work normally
  };
  
  const handleCallAnyway = () => {
    window.location.href = `tel:${phoneNumber}`;
  };
  
  return (
    <>
      <a
        href={`tel:${phoneNumber}`}
        onClick={handleCallClick}
        className="inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 print:hidden"
      >
        📞 Call Us
      </a>
      
      {/* Call Intercept Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900">We're Currently Closed</h3>
            
            <p className="mt-4 text-gray-600">
              {nextOpenTime ? (
                <>We'll be open again at <strong>{nextOpenTime}</strong>.</>
              ) : (
                <>We're currently closed. Please check our hours.</>
              )}
            </p>
            
            <p className="mt-4 text-sm text-gray-500">
              Would you like to call us anyway? We might not be able to answer.
            </p>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCallAnyway}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Call Anyway
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
