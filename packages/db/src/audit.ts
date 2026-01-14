/**
 * Audit Logging Service
 * Logs all D1 mutations and configuration changes to R2 for compliance
 * Stores immutable records of all write operations
 */

export interface AuditLogEntry {
  timestamp: string;
  tenantId: string;
  userId?: string;
  action: string; // "INSERT", "UPDATE", "DELETE", "CONFIG_CHANGE"
  table?: string;
  recordId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure";
  errorMessage?: string;
}

/**
 * Log an audit event to R2
 * Stores in directory structure: /audit/{year}/{month}/{day}/{tenant_id}/{timestamp}.json
 */
export async function logAuditEvent(
  r2Bucket: R2Bucket,
  entry: AuditLogEntry
): Promise<void> {
  const date = new Date(entry.timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const timestamp = entry.timestamp.replace(/[:.]/g, "-");

  const key = `audit/${year}/${month}/${day}/${entry.tenantId}/${timestamp}.json`;

  try {
    await r2Bucket.put(key, JSON.stringify(entry, null, 2), {
      httpMetadata: {
        contentType: "application/json",
      },
      customMetadata: {
        tenant_id: entry.tenantId,
        action: entry.action,
        status: entry.status,
      },
    });
  } catch (error) {
    console.error(`Failed to log audit event: ${error}`);
    // Don't throw - continue processing even if logging fails
  }
}

/**
 * Log a menu item mutation
 */
export async function logMenuItemMutation(
  r2Bucket: R2Bucket,
  tenantId: string,
  action: "INSERT" | "UPDATE" | "DELETE",
  recordId: number,
  changes?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  await logAuditEvent(r2Bucket, {
    timestamp: new Date().toISOString(),
    tenantId,
    userId,
    action,
    table: "menu_items",
    recordId: String(recordId),
    changes,
    status: "success",
  });
}

/**
 * Log a configuration change
 */
export async function logConfigChange(
  r2Bucket: R2Bucket,
  tenantId: string,
  configType: string,
  changes: Record<string, unknown>,
  userId?: string
): Promise<void> {
  await logAuditEvent(r2Bucket, {
    timestamp: new Date().toISOString(),
    tenantId,
    userId,
    action: "CONFIG_CHANGE",
    table: configType,
    changes,
    status: "success",
  });
}

/**
 * Query audit logs from R2 (simulated - real implementation would use R2 SQL)
 */
export async function queryAuditLogs(
  r2Bucket: R2Bucket,
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<AuditLogEntry[]> {
  // This would ideally use R2 SQL or Athena for efficient querying
  // For now, we can return the basic structure
  const logs: AuditLogEntry[] = [];

  // Real implementation would list objects with prefix and parse them
  // const prefix = `audit/${startDate.getFullYear()}/${String(startDate.getMonth() + 1).padStart(2, '0')}/`;
  // const objects = await r2Bucket.list({ prefix });
  // for (const object of objects.objects) {
  //   const content = await r2Bucket.get(object.key);
  //   if (content) logs.push(JSON.parse(await content.text()));
  // }

  return logs;
}
