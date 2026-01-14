import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { eq, and } from "drizzle-orm";
import { db, authorizedUsers } from "@diner-saas/db";
import { sessionStorage } from "./session.server";

export interface User {
  id: number;
  tenantId: string;
  email: string;
  phone: string | null;
  name: string;
  role: string;
  permissions: string[];
}

export const authenticator = new Authenticator<User>(sessionStorage);

// Form Strategy for Magic Link verification
authenticator.use(
  new FormStrategy(async ({ form, request }) => {
    const email = form.get("email");
    const token = form.get("token");

    if (typeof email !== "string" || typeof token !== "string") {
      throw new Error("Invalid form data");
    }

    // Get env from request context (Cloudflare specific)
    const env = (request as any).env;
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
    const user = await db
      .select()
      .from(authorizedUsers)
      .where(
        and(
          eq(authorizedUsers.email, email),
          eq(authorizedUsers.deleted_at, null)
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
      .set({ last_login: new Date().toISOString() })
      .where(eq(authorizedUsers.id, user.id))
      .run();

    return {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      phone: user.phone_number,
      name: user.name,
      role: user.role,
      permissions,
    };
  }),
  "magic-link"
);

/**
 * Generate and send a magic link to the user's email
 */
export async function sendMagicLink(
  email: string,
  env: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user exists
    const user = await db
      .select()
      .from(authorizedUsers)
      .where(
        and(
          eq(authorizedUsers.email, email),
          eq(authorizedUsers.deleted_at, null)
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

    // TODO: Send email via Cloudflare Queues -> MailChannels
    // For now, we'll log the magic link (dev mode)
    const magicLink = `${env.SITE_URL || 'http://localhost:3001'}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
    
    console.log(`[DEV] Magic Link for ${email}: ${magicLink}`);
    
    // In production, push to email queue
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

    const data = await response.json();
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
  await db
    .update(authorizedUsers)
    .set({ security_challenge_code: code })
    .where(eq(authorizedUsers.id, userId))
    .run();

  return code;
}

/**
 * Verify 2FA code
 */
export async function verify2FACode(
  userId: number,
  code: string
): Promise<boolean> {
  const user = await db
    .select()
    .from(authorizedUsers)
    .where(eq(authorizedUsers.id, userId))
    .get();

  if (!user || user.security_challenge_code !== code) {
    return false;
  }

  // Clear the code after successful verification
  await db
    .update(authorizedUsers)
    .set({ security_challenge_code: null })
    .where(eq(authorizedUsers.id, userId))
    .run();

  return true;
}
