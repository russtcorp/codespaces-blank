import { useState } from "react";
import { Button } from "@diner-saas/ui/components/button";
import { Input } from "@diner-saas/ui/components/input";
import type { FetcherWithComponents } from "@remix-run/react";

interface EmergencyButtonProps {
  isEmergencyClosed: boolean;
  emergencyReason: string;
  fetcher: FetcherWithComponents<any>;
}

export function EmergencyButton({
  isEmergencyClosed,
  emergencyReason,
  fetcher,
}: EmergencyButtonProps) {
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [reason, setReason] = useState("");
  const [reopenTime, setReopenTime] = useState("");

  const handleEmergencyClose = () => {
    if (!reason.trim()) {
      alert("Please provide a reason for closing");
      return;
    }

    const formData = new FormData();
    formData.append("intent", "emergency-close");
    formData.append("reason", reason);
    if (reopenTime) {
      formData.append("reopenTime", reopenTime);
    }

    fetcher.submit(formData, { method: "post" });
    setShowCloseForm(false);
    setReason("");
    setReopenTime("");
  };

  const handleReopen = () => {
    if (!confirm("Reopen your diner now?")) return;

    const formData = new FormData();
    formData.append("intent", "emergency-reopen");

    fetcher.submit(formData, { method: "post" });
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Emergency Controls</h2>
      
      {isEmergencyClosed ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4">
            <p className="font-semibold text-red-800">
              🚨 Your diner is currently EMERGENCY CLOSED
            </p>
            <p className="mt-2 text-sm text-red-700">
              Reason: {emergencyReason}
            </p>
          </div>
          <Button onClick={handleReopen} className="w-full bg-green-600 hover:bg-green-700">
            Reopen Diner
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {!showCloseForm ? (
            <div>
              <p className="mb-4 text-sm text-gray-600">
                Use this button to immediately close your diner for emergencies
                (weather, equipment failure, etc.). This will update your site instantly.
              </p>
              <Button
                onClick={() => setShowCloseForm(true)}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                🚨 Emergency Close
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border-2 border-red-200 p-4">
              <h3 className="font-semibold text-red-800">
                Emergency Close Confirmation
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason (will be shown to customers)
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Closed due to weather"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Auto-reopen at (optional)
                </label>
                <Input
                  type="datetime-local"
                  value={reopenTime}
                  onChange={(e) => setReopenTime(e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank to manually reopen later
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleEmergencyClose}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Confirm Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCloseForm(false);
                    setReason("");
                    setReopenTime("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
