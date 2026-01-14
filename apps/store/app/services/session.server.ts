import { createCookieSessionStorage } from "@remix-run/cloudflare";

// Note: In production, SESSION_SECRET should be set via wrangler secret
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_diner_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [process.env.SESSION_SECRET || "dev-secret-change-in-production"],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
