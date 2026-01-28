import { json, redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { reviews, socialPosts, menuItemInteractions, menuItems } from "@diner-saas/db";
import { and, eq, sql, desc, count } from "drizzle-orm";
import { Card } from "@diner-saas/ui/card";
import { SentimentChart } from "~/components/SentimentChart";
import { PopularItemsTable } from "~/components/PopularItemsTable";
import { SocialEngagementStats } from "~/components/SocialEngagementStats";
import { getFeatureFlags } from "@diner-saas/config/src/feature-flags";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const authenticator = getAuthenticator(context.cloudflare.env as any);
  const user = await authenticator.isAuthenticated(request);
  if (!user) return redirect("/login");

  const flags = await getFeatureFlags(context.cloudflare.env.FEATURE_FLAGS, user.tenantId);
  if (!flags.analyticsDashboard) {
    return redirect("/dashboard");
  }

  const db = drizzle(context.cloudflare.env.DB);
  // ... (rest of loader)
}

export default function DashboardAnalytics() {
  // ... (component implementation)
}