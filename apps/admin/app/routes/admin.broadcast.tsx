import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
} from "@remix-run/cloudflare";
import { Form, useLoaderData, useActionData } from "@remix-run/react";
import {
  createBroadcastMessage,
  publishBroadcast,
  getActiveBroadcasts,
  clearAllBroadcasts,
} from "../../packages/db/src/broadcast";
import { useState } from "react";

interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  createdAt: string;
  expiresAt: string;
  dismissible: boolean;
}

export async function loader({ context }: LoaderFunctionArgs) {
  const kv = (context.cloudflare.env as Record<string, unknown>).KV as KVNamespace;
  const activeBroadcasts = await getActiveBroadcasts(kv);
  return json({ activeBroadcasts });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const kv = (context.cloudflare.env as Record<string, unknown>).KV as KVNamespace;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "create") {
    const title = formData.get("title") as string;
    const message = formData.get("message") as string;
    const type = (formData.get("type") as string) || "info";
    const durationMinutes = parseInt(formData.get("durationMinutes") as string) || 60;

    const broadcast = createBroadcastMessage(title, message, type as any, durationMinutes);
    await publishBroadcast(kv, broadcast);

    return json({ success: true, message: "Broadcast published successfully" });
  } else if (actionType === "clear") {
    await clearAllBroadcasts(kv);
    return json({ success: true, message: "All broadcasts cleared" });
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function AdminBroadcast() {
  const { activeBroadcasts } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as const,
    durationMinutes: "60",
  });

  return (
    <div className="p-6 bg-white">
      <h1 className="text-3xl font-bold mb-6">Global Broadcast System</h1>

      {actionData?.success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-800 rounded">
          {actionData.message}
        </div>
      )}

      {actionData?.error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-800 rounded">
          {actionData.error}
        </div>
      )}

      {/* Create Broadcast Form */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Create New Broadcast</h2>
        <Form method="post">
          <input type="hidden" name="actionType" value="create" />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., 'Scheduled Maintenance'"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              placeholder="Enter the broadcast message..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as "info" | "warning" | "error" | "success",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="info">ℹ️ Info</option>
                <option value="warning">⚠️ Warning</option>
                <option value="error">❌ Error</option>
                <option value="success">✅ Success</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                name="durationMinutes"
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: e.target.value })
                }
                min="1"
                max="1440"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600"
          >
            Publish Broadcast
          </button>
        </Form>
      </div>

      {/* Active Broadcasts */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Active Broadcasts ({activeBroadcasts.length})
        </h2>

        {activeBroadcasts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded border border-gray-200">
            No active broadcasts
          </div>
        ) : (
          <div className="space-y-4">
            {activeBroadcasts.map((broadcast: BroadcastMessage) => (
              <div
                key={broadcast.id}
                className={`p-4 rounded-lg border-l-4 ${
                  broadcast.type === "error"
                    ? "bg-red-50 border-l-red-400"
                    : broadcast.type === "warning"
                      ? "bg-yellow-50 border-l-yellow-400"
                      : broadcast.type === "success"
                        ? "bg-green-50 border-l-green-400"
                        : "bg-blue-50 border-l-blue-400"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{broadcast.title}</p>
                    <p className="text-sm mt-1">{broadcast.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Expires: {new Date(broadcast.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-white rounded">
                    {broadcast.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear All */}
      {activeBroadcasts.length > 0 && (
        <Form method="post">
          <input type="hidden" name="actionType" value="clear" />
          <button
            type="submit"
            className="px-4 py-2 bg-red-500 text-white rounded font-medium hover:bg-red-600"
            onClick={(e) => {
              if (
                !confirm(
                  "Are you sure you want to clear all active broadcasts?"
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            Clear All Broadcasts
          </button>
        </Form>
      )}
    </div>
  );
}
