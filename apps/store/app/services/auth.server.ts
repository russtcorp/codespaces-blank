import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { eq, and, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { authorizedUsers } from "@diner-saas/db";
import { getSessionStorage } from "./session.server";

export interface User {
  id: number;
  tenantId: string;
  email: string;
  phone: string | null;
  name: string;
  role: string;
  permissions: string[];
}

/**
 * Create an authenticator bound to the request's env (KV sessions)
 */
export function getAuthenticator(env: any) {
  const sessionStorage = getSessionStorage(env);
  const authenticator = new Authenticator<User>(sessionStorage);

  // Form Strategy for Magic Link verification
  authenticator.use(
    new FormStrategy(async ({ form }) => {
      const email = form.get("email");
      const token = form.get("token");

      if (typeof email !== "string" || typeof token !== "string") {
        throw new Error("Invalid form data");
      }

      if (!env?.KV) {
        throw new Error("KV binding not available");
      }

      // Check if token exists in KV (format: magic_link:{token})
      const storedEmail = await env.KV.get(`magic_link:${token}`);
      
      if (!storedEmail || storedEmail !== email) {
        throw new Error("Invalid or expired magic link");
      }

      // Delete the token after use (one-time use)
      await env.KV.delete(`magic_link:${token}`);

      // Find the user in the database
      const db = drizzle(env.DB);
      const user = await db
        .select()
        .from(authorizedUsers)
        .where(
          and(
            eq(authorizedUsers.email, email),
            isNull(authorizedUsers.deletedAt)
          )
        )
        .get();

      if (!user) {
        throw new Error("User not found");
      }

      // Parse permissions JSON
      let permissions: string[] = [];
      try {
        permissions = user.permissions ? JSON.parse(user.permissions) : [];
      } catch (e) {
        permissions = [];
      }

      // Update last login timestamp
      await db
        .update(authorizedUsers)
        .set({ lastLogin: new Date().toISOString() })
        .where(eq(authorizedUsers.id, user.id))
        .run();

      return {
        id: user.id,
        tenantId: user.tenantId || "",
        email: user.email || "",
        phone: user.phoneNumber,
        name: user.name || "",
        role: user.role || "owner",
        permissions,
      };
    }),
    "magic-link"
  );

  return authenticator;
}

/**
 * Generate and send a magic link to the user's email
 */
export async function sendMagicLink(
  email: string,
  env: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user exists
    const db = drizzle(env.DB);
    const user = await db
      .select()
      .from(authorizedUsers)
      .where(
        and(
          eq(authorizedUsers.email, email),
          isNull(authorizedUsers.deletedAt)
        )
      )
      .get();

    if (!user) {
      // Don't reveal if user exists or not (security)
      return { success: true };
    }

    // Generate a secure token
    const token = crypto.randomUUID();
    
    // Store token in KV with 15-minute expiration
    await env.KV.put(`magic_link:${token}`, email, {
      expirationTtl: 900, // 15 minutes
    });

    // Build magic link using production SITE_URL (must be set via secrets)
    if (!env.SITE_URL) {
      throw new Error("SITE_URL is not configured");
    }
    const magicLink = `${env.SITE_URL}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

    // In production, push to email queue if available
    if (env.EMAIL_QUEUE) {
      await env.EMAIL_QUEUE.send({
        type: 'magic_link',
        to: email,
        token,
        link: magicLink,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending magic link:", error);
    return { success: false, error: "Failed to send magic link" };
  }
}

/**
 * Verify Cloudflare Turnstile token
 */
export async function verifyTurnstile(
  token: string,
  env: any
): Promise<boolean> {
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    );

    const data: any = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}

/**
 * Generate a 6-digit OTP for 2FA challenges
 */
export async function generate2FACode(
  userId: number,
  env: any
): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store in database
  const db = drizzle(env.DB);
  await db
    .update(authorizedUsers)
    .set({ securityChallengeCode: code })
    .where(eq(authorizedUsers.id, userId))
    .run();

  return code;
}

/**
 * Verify 2FA code
 */
export async function verify2FACode(
  userId: number,
  code: string,
  env: any
): Promise<boolean> {
  const db = drizzle(env.DB);
  const user = await db
    .select()
    .from(authorizedUsers)
    .where(eq(authorizedUsers.id, userId))
    .get();

  if (!user || user.securityChallengeCode !== code) {
    return false;
  }

  // Clear the code after successful verification
  await db
    .update(authorizedUsers)
    .set({ securityChallengeCode: null })
    .where(eq(authorizedUsers.id, userId))
    .run();

  return true;
}
