import { FC, useState } from "react";

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  dismissible: boolean;
}

interface BroadcastBannerProps {
  notifications: BroadcastNotification[];
  onDismiss: (id: string) => void;
}

/**
 * Broadcast Banner Component
 * Displays system notifications at the top of the Store Dashboard
 */
export const BroadcastBanner: FC<BroadcastBannerProps> = ({
  notifications,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  if (!visible || notifications.length === 0) {
    return null;
  }

  const notification = notifications[0]; // Show one at a time

  const bgColor =
    notification.type === "error"
      ? "bg-red-50 border-red-200"
      : notification.type === "warning"
        ? "bg-yellow-50 border-yellow-200"
        : notification.type === "success"
          ? "bg-green-50 border-green-200"
          : "bg-blue-50 border-blue-200";

  const textColor =
    notification.type === "error"
      ? "text-red-800"
      : notification.type === "warning"
        ? "text-yellow-800"
        : notification.type === "success"
          ? "text-green-800"
          : "text-blue-800";

  const borderColor =
    notification.type === "error"
      ? "border-l-red-400"
      : notification.type === "warning"
        ? "border-l-yellow-400"
        : notification.type === "success"
          ? "border-l-green-400"
          : "border-l-blue-400";

  const icon =
    notification.type === "error"
      ? "❌"
      : notification.type === "warning"
        ? "⚠️"
        : notification.type === "success"
          ? "✅"
          : "ℹ️";

  return (
    <div
      className={`border-l-4 ${borderColor} ${bgColor} p-4 mb-4 rounded flex justify-between items-start`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className={`font-semibold ${textColor}`}>{notification.title}</p>
          <p className={`text-sm mt-1 ${textColor}`}>{notification.message}</p>
        </div>
      </div>
      {notification.dismissible && (
        <button
          onClick={() => {
            onDismiss(notification.id);
            setVisible(false);
          }}
          className={`ml-4 text-xl ${textColor} hover:opacity-70`}
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default BroadcastBanner;
