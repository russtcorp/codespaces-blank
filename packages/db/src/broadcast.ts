/**
 * Global Broadcast System
 * Allows Super Admin to send system-wide notifications to all tenant dashboards
 * Stores in KV for fast access, dismissible per-user
 */

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  createdAt: string;
  expiresAt: string;
  dismissible: boolean;
}

/**
 * Create a new broadcast message
 */
export function createBroadcastMessage(
  title: string,
  message: string,
  type: "info" | "warning" | "error" | "success" = "info",
  durationMinutes: number = 60,
  dismissible: boolean = true
): BroadcastMessage {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    title,
    message,
    type,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    dismissible,
  };
}

/**
 * Publish a broadcast message to all tenants
 * Stores in KV under "broadcast:active" key
 */
export async function publishBroadcast(
  kv: KVNamespace,
  message: BroadcastMessage
): Promise<void> {
  // Get existing messages
  const existing = await kv.get("broadcast:active");
  const messages: BroadcastMessage[] = existing ? JSON.parse(existing) : [];

  // Add new message
  messages.push(message);

  // Filter out expired messages
  const now = new Date();
  const active = messages.filter((m) => new Date(m.expiresAt) > now);

  // Save back to KV with TTL matching the soonest expiration
  const minExpirationMs = Math.min(
    ...active.map((m) => new Date(m.expiresAt).getTime() - now.getTime())
  );
  const ttlSeconds = Math.ceil(minExpirationMs / 1000);

  await kv.put("broadcast:active", JSON.stringify(active), {
    expirationTtl: Math.max(ttlSeconds, 60), // Minimum 60 seconds
  });
}

/**
 * Retrieve active broadcast messages
 */
export async function getActiveBroadcasts(kv: KVNamespace): Promise<BroadcastMessage[]> {
  const data = await kv.get("broadcast:active");
  if (!data) return [];

  const messages: BroadcastMessage[] = JSON.parse(data);

  // Filter out expired
  const now = new Date();
  return messages.filter((m) => new Date(m.expiresAt) > now);
}

/**
 * Mark a message as dismissed by a user (stored in user session)
 * Note: This is handled client-side in local storage, but could be synced to DB
 */
export function dismissBroadcastMessage(messageId: string): void {
  if (typeof window === "undefined") return; // SSR check

  const dismissed = JSON.parse(
    localStorage.getItem("broadcast:dismissed") || "[]"
  );
  if (!dismissed.includes(messageId)) {
    dismissed.push(messageId);
    localStorage.setItem("broadcast:dismissed", JSON.stringify(dismissed));
  }
}

/**
 * Get non-dismissed messages for display
 */
export async function getVisibleBroadcasts(
  kv: KVNamespace
): Promise<BroadcastMessage[]> {
  const active = await getActiveBroadcasts(kv);

  if (typeof window === "undefined") {
    return active; // On server, show all
  }

  // Client-side: filter out dismissed
  const dismissed = JSON.parse(
    localStorage.getItem("broadcast:dismissed") || "[]"
  );
  return active.filter((m) => !dismissed.includes(m.id));
}

/**
 * Clear all broadcast messages (admin only)
 */
export async function clearAllBroadcasts(kv: KVNamespace): Promise<void> {
  await kv.delete("broadcast:active");
}
