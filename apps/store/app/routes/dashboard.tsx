import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link, Outlet, useLoaderData, NavLink } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { Button } from "@diner-saas/ui/button";
import { HomeIcon, UtensilsIcon, StarIcon, SettingsIcon, BarChartIcon } from "lucide-react";
import { ChatPanel } from "~/components/ChatPanel";

// ... (loader)

import { useFeature } from "~/utils/flags";

// ... (inside DashboardLayout component)
export default function DashboardLayout() {
  const { user } = useLoaderData<typeof loader>();
  const analyticsEnabled = useFeature('analyticsDashboard');

  const navLinks = [
    // ...
    { to: "reviews", icon: StarIcon, text: "Reviews" },
    analyticsEnabled && { to: "analytics", icon: BarChartIcon, text: "Analytics" },
    { to: "settings", icon: SettingsIcon, text: "Settings" },
  ].filter(Boolean); // Filter out false values

  return (
    // ...
  );
}