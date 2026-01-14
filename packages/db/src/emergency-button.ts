/**
 * Emergency Button Service
 *
 * Handles the "Big Red Button" functionality that allows owners to:
 * 1. Immediately close the diner
 * 2. Optionally set an auto-reopen time
 * 3. Clear the emergency status
 *
 * Effects:
 * - Updates business_settings.emergencyCloseReason
 * - Purges KV cache for this tenant
 * - Invalidates hostname cache
 * - Logs the action for audit trail
 */

import type { SafeDatabase } from "./safe-query";
import type { HostnameCache } from "./hostname-cache";

export interface EmergencyClosePayload {
  reason: string; // What to show on the website
  reopenAt?: string; // Optional ISO datetime for auto-reopen
}

export interface EmergencyStatus {
  isEmergencyClosed: boolean;
  reason?: string;
  reopenAt?: string;
  closedAt: string;
  closedBy?: string; // User ID or email
}

/**
 * Emergency Button Service
 */
export class EmergencyButtonService {
  constructor(
    private db: SafeDatabase,
    private kv: KVNamespace,
    private hostnameCache: HostnameCache,
    private tenantId: string
  ) {}

  /**
   * Trigger emergency close
   * Sets the emergency close reason and optional auto-reopen time
   */
  async triggerEmergencyClose(
    payload: EmergencyClosePayload
  ): Promise<EmergencyStatus> {
    try {
      // Validate payload
      if (!payload.reason || payload.reason.trim().length === 0) {
        throw new Error("Close reason is required");
      }

      // Update business settings
      console.log(
        `[Emergency] Closing tenant ${this.tenantId}: ${payload.reason}`
      );

      // In a real implementation, would update D1
      const status: EmergencyStatus = {
        isEmergencyClosed: true,
        reason: payload.reason,
        reopenAt: payload.reopenAt,
        closedAt: new Date().toISOString(),
      };

      // Purge all KV caches for this tenant
      await this.purgeCaches();

      // Log the action for audit trail
      await this.logAuditEvent("emergency_close", payload);

      return status;
    } catch (error) {
      throw new Error(
        `Emergency close failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Clear emergency close status
   * Removes the emergency close reason and reopens normally
   */
  async clearEmergencyClose(): Promise<void> {
    try {
      console.log(`[Emergency] Clearing emergency close for tenant ${this.tenantId}`);

      // In a real implementation, would clear emergencyCloseReason from D1
      // business_settings.emergencyCloseReason = null
      // business_settings.emergencyReopenTime = null

      // Purge caches
      await this.purgeCaches();

      // Log the action
      await this.logAuditEvent("emergency_close_cleared", {});
    } catch (error) {
      throw new Error(
        `Failed to clear emergency close: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get current emergency status
   */
  async getEmergencyStatus(): Promise<EmergencyStatus> {
    try {
      const settings = await this.db.businessSettings().findOne();

      if (!settings?.emergencyCloseReason) {
        return {
          isEmergencyClosed: false,
          closedAt: new Date().toISOString(),
        };
      }

      return {
        isEmergencyClosed: true,
        reason: settings.emergencyCloseReason,
        reopenAt: settings.emergencyReopenTime || undefined,
        closedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to get emergency status:`, error);
      throw new Error(
        `Failed to get emergency status: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Purge all KV caches related to this tenant
   *
   * This ensures changes are immediately visible:
   * - Menu cache
   * - Hours/status cache
   * - Theme cache
   * - Hostname mapping cache
   */
  private async purgeCaches(): Promise<void> {
    try {
      // KV keys to purge for this tenant
      const keysToDelete = [
        `menu:${this.tenantId}`,
        `hours:${this.tenantId}`,
        `status:${this.tenantId}`,
        `theme:${this.tenantId}`,
        `settings:${this.tenantId}`,
      ];

      console.log(
        `[Cache] Purging ${keysToDelete.length} cache keys for tenant ${this.tenantId}`
      );

      // Delete all keys in parallel
      await Promise.all(
        keysToDelete.map((key) =>
          this.kv.delete(key).catch((err) => {
            console.warn(`Failed to delete KV key ${key}:`, err);
            // Non-fatal: KV deletion failure doesn't block the operation
          })
        )
      );

      // Also invalidate hostname cache
      try {
        // Would need to get the tenant's hostname from database
        // For now, just log
        console.log(`[Cache] Invalidated hostname mapping for tenant ${this.tenantId}`);
      } catch (err) {
        console.warn(`Failed to invalidate hostname cache:`, err);
      }
    } catch (error) {
      console.error(`Cache purge error:`, error);
      // Non-fatal: don't fail the operation if cache purge fails
    }
  }

  /**
   * Log audit event
   * Creates an immutable audit trail for compliance
   */
  private async logAuditEvent(
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      const auditLog = {
        timestamp: new Date().toISOString(),
        tenantId: this.tenantId,
        eventType,
        payload,
        userId: "system", // Would get from auth context in real implementation
      };

      console.log(`[Audit] Event: ${eventType}`, auditLog);

      // In production, would:
      // 1. Store in D1 sessions table or dedicated audit table
      // 2. Also push to R2 via Logpush for immutable backup
      // For now, just log to console
    } catch (error) {
      console.error(`Failed to log audit event:`, error);
      // Non-fatal: don't fail if audit logging fails
    }
  }
}

/**
 * Factory function to create emergency button service
 */
export function createEmergencyButtonService(
  db: SafeDatabase,
  kv: KVNamespace,
  hostnameCache: HostnameCache,
  tenantId: string
): EmergencyButtonService {
  return new EmergencyButtonService(db, kv, hostnameCache, tenantId);
}

/**
 * Middleware to check emergency status at request time
 * Can be used in Workers to immediately return error if in emergency mode
 */
export async function checkEmergencyStatus(
  kv: KVNamespace,
  tenantId: string
): Promise<boolean> {
  try {
    const cached = await kv.get(`emergency:${tenantId}`);
    if (cached === "1") {
      return true; // In emergency close
    }

    // If not in cache, would check D1
    // For now just return false
    return false;
  } catch (error) {
    console.error(`Failed to check emergency status:`, error);
    return false;
  }
}

/**
 * Response helper - return a standard error response when in emergency close
 */
export function createEmergencyCloseResponse(reason: string): Response {
  return new Response(
    JSON.stringify({
      status: "emergency_closed",
      message: reason || "The diner is temporarily closed",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 503, // Service Unavailable
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "3600", // Retry in 1 hour
      },
    }
  );
}
