import { z } from "zod";

export const AuditEventSchema = z.object({
  timestamp: z.string(),
  tenantId: z.string(),
  actor: z.string().default("system"), // UserId or 'system'
  action: z.string(), // e.g., 'menu.create', 'settings.update'
  resourceId: z.string().optional(),
  details: z.record(z.any()).optional(),
  ip: z.string().optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

/**
 * Emits a structured audit log event.
 * Cloudflare Logpush will capture this from stdout if configured.
 * 
 * Format: [AUDIT] <JSON_STRING>
 */
export function logAuditEvent(event: Omit<AuditEvent, "timestamp">) {
  const payload: AuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // Log with a specific prefix so Logpush filters can target it
  console.info(`[AUDIT] ${JSON.stringify(payload)}`);
}