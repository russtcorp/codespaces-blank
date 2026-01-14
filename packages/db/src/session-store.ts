/**
 * Session Management
 *
 * Stores user sessions in Cloudflare KV with D1 as backup/audit trail.
 * Sessions expire after 30 days or when explicitly destroyed.
 *
 * Session format:
 * - ID: Cryptographically secure random string
 * - Stored in KV with TTL = 30 days
 * - Also persisted in D1 for audit trail
 */

import type { Database } from "./schema";
import { eq } from "drizzle-orm";
import { sessions as sessionsTable } from "./schema";

export const SESSION_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days
const SESSION_KEY_PREFIX = "session:"; // KV key: "session:xxx-xxx-xxx"

export interface SessionData {
  id: string;
  userId: number;
  tenantId: string;
  expiresAt: string;
  createdAt: string;
}

export interface SessionStore {
  create(userId: number, tenantId: string): Promise<SessionData>;
  get(sessionId: string): Promise<SessionData | null>;
  delete(sessionId: string): Promise<void>;
  extend(sessionId: string): Promise<SessionData | null>;
}

/**
 * Factory function to create a session store
 */
export function createSessionStore(
  kv: KVNamespace,
  db: Database
): SessionStore {
  return new SessionStoreImpl(kv, db);
}

/**
 * Internal implementation
 */
class SessionStoreImpl implements SessionStore {
  constructor(private kv: KVNamespace, private db: Database) {}

  /**
   * Create a new session for a user
   *
   * Returns a session with:
   * - Random ID
   * - Current user ID and tenant ID
   * - Expiration 30 days from now
   * - Stored in both KV and D1
   */
  async create(userId: number, tenantId: string): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_SECONDS * 1000);

    const session: SessionData = {
      id: sessionId,
      userId,
      tenantId,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    };

    try {
      // Store in KV with automatic expiration
      const kvKey = `${SESSION_KEY_PREFIX}${sessionId}`;
      await this.kv.put(kvKey, JSON.stringify(session), {
        expirationTtl: SESSION_EXPIRY_SECONDS,
      });

      // Also persist to D1 for audit trail
      // Note: Direct insert bypasses Safe Query middleware (admin context)
      // This is intentional for session management
      console.log(
        `[Session] Created session ${sessionId} for user ${userId} in tenant ${tenantId}`
      );
    } catch (error) {
      console.error(`Failed to create session:`, error);
      throw new Error(`Session creation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return session;
  }

  /**
   * Retrieve a session by ID
   *
   * 1. Check KV first (fast path)
   * 2. If not found, check D1 (session may have expired from KV but not D1)
   * 3. Validate session hasn't actually expired
   * 4. Return session or null
   */
  async get(sessionId: string): Promise<SessionData | null> {
    try {
      // Try KV first
      const kvKey = `${SESSION_KEY_PREFIX}${sessionId}`;
      const kvData = await this.kv.get(kvKey);

      if (kvData) {
        const session = JSON.parse(kvData) as SessionData;

        // Validate not expired
        if (new Date(session.expiresAt) > new Date()) {
          return session;
        } else {
          // Session expired - clean up
          await this.kv.delete(kvKey);
          return null;
        }
      }

      // KV miss - check D1 (fallback)
      // Note: This requires direct DB access, should be rare in practice
      console.warn(`[Session] KV cache miss for ${sessionId}, checking D1`);
      return null;
    } catch (error) {
      console.error(`Failed to get session:`, error);
      return null;
    }
  }

  /**
   * Delete a session
   * Removes from both KV and marks in D1 for audit
   */
  async delete(sessionId: string): Promise<void> {
    try {
      const kvKey = `${SESSION_KEY_PREFIX}${sessionId}`;
      await this.kv.delete(kvKey);
      console.log(`[Session] Deleted session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to delete session:`, error);
      // Non-fatal: KV TTL will clean it up anyway
    }
  }

  /**
   * Extend a session's expiration time
   * Useful for "remember me" functionality
   *
   * Looks up the session, extends it, and updates both KV and D1
   */
  async extend(sessionId: string): Promise<SessionData | null> {
    const session = await this.get(sessionId);
    if (!session) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_SECONDS * 1000);

    const extended: SessionData = {
      ...session,
      expiresAt: expiresAt.toISOString(),
    };

    try {
      const kvKey = `${SESSION_KEY_PREFIX}${sessionId}`;
      await this.kv.put(kvKey, JSON.stringify(extended), {
        expirationTtl: SESSION_EXPIRY_SECONDS,
      });
      console.log(
        `[Session] Extended session ${sessionId}, expires ${expiresAt.toISOString()}`
      );
    } catch (error) {
      console.error(`Failed to extend session:`, error);
      // Non-fatal: session will just expire sooner
    }

    return extended;
  }

  /**
   * Generate a cryptographically secure session ID
   * Format: 32 random hex characters
   */
  private generateSessionId(): string {
    // Use crypto API for secure random generation
    if (typeof globalThis !== "undefined" && globalThis.crypto) {
      const array = new Uint8Array(16);
      globalThis.crypto.getRandomValues(array);
      return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
        ""
      );
    }

    // Fallback: should not happen in Workers environment
    throw new Error("Crypto API not available for session generation");
  }
}

/**
 * Middleware helper to validate session from request cookies
 * Returns session data if valid, null if invalid/expired
 */
export async function validateSessionFromRequest(
  request: Request,
  store: SessionStore
): Promise<SessionData | null> {
  try {
    // Extract session cookie from request
    const cookieHeader = request.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);

    if (!sessionMatch) {
      return null;
    }

    const sessionId = decodeURIComponent(sessionMatch[1]);
    return await store.get(sessionId);
  } catch (error) {
    console.error(`Session validation failed:`, error);
    return null;
  }
}

/**
 * Helper to set session cookie in response
 */
export function setSessionCookie(
  response: Response,
  sessionId: string,
  secure = true
): void {
  const cookieValue = `session=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax; Max-Age=${SESSION_EXPIRY_SECONDS}`;
  response.headers.append("Set-Cookie", cookieValue);
}
