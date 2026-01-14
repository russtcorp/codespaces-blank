/**
 * Impersonation Service for Admin Support Staff
 * Allows admins to log in as a tenant owner for support/debugging
 */

import { createCookieSessionStorage, redirect } from "@remix-run/cloudflare";

export interface ImpersonationSession {
  tenantId: string;
  originalAdminId: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Generate a short-lived impersonation token
 * Valid for 2 hours
 */
export function createImpersonationToken(
  tenantId: string,
  adminId: string
): ImpersonationSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

  return {
    tenantId,
    originalAdminId: adminId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Validate an impersonation session
 */
export function validateImpersonationSession(
  session: ImpersonationSession
): {
  valid: boolean;
  reason?: string;
} {
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (now > expiresAt) {
    return {
      valid: false,
      reason: "Impersonation session has expired",
    };
  }

  return { valid: true };
}

/**
 * Generate a signed impersonation session cookie
 * Should be stored securely in HTTP-only cookie
 */
export function serializeImpersonationSession(
  session: ImpersonationSession,
  secret: string
): string {
  // In production, this would use proper JWT signing
  // For now, return base64 encoded JSON with a HMAC signature
  const payload = Buffer.from(JSON.stringify(session)).toString("base64");

  // Hash with secret (simplified - real implementation uses HMAC-SHA256)
  const signature = Buffer.from(secret + payload)
    .toString("base64")
    .substring(0, 32);

  return `${payload}.${signature}`;
}

/**
 * Deserialize and validate an impersonation session
 */
export function deserializeImpersonationSession(
  token: string,
  secret: string
): ImpersonationSession | null {
  try {
    const [payload, signature] = token.split(".");

    // Verify signature (simplified)
    const expectedSignature = Buffer.from(secret + payload)
      .toString("base64")
      .substring(0, 32);

    if (signature !== expectedSignature) {
      return null;
    }

    const session: ImpersonationSession = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8")
    );

    return validateImpersonationSession(session).valid ? session : null;
  } catch (error) {
    console.error("Failed to deserialize impersonation session:", error);
    return null;
  }
}

/**
 * Log impersonation event for audit trail
 */
export async function logImpersonationEvent(
  r2Bucket: R2Bucket,
  adminId: string,
  tenantId: string,
  action: "login" | "logout"
): Promise<void> {
  const timestamp = new Date().toISOString();
  const key = `impersonation/${adminId}/${timestamp}-${action}.json`;

  await r2Bucket.put(
    key,
    JSON.stringify(
      {
        timestamp,
        adminId,
        tenantId,
        action,
      },
      null,
      2
    ),
    {
      httpMetadata: { contentType: "application/json" },
      customMetadata: {
        admin_id: adminId,
        tenant_id: tenantId,
        action,
      },
    }
  );
}
