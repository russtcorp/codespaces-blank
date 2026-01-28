import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { operatingHours, specialDates, businessSettings } from "@diner-saas/db";
import { HoursMatrix } from "~/components/HoursMatrix";
import { HolidayCalendar } from "~/components/HolidayCalendar";
import { EmergencyButton } from "~/components/EmergencyButton";
import { Card } from "@diner-saas/ui/card";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  const db = drizzle(env.DB);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  // Fetch operating hours
  const hours = await db
    .select()
    .from(operatingHours)
    .where(eq(operatingHours.tenantId, user.tenantId))
    .orderBy(operatingHours.dayOfWeek, operatingHours.startTime)
    .all();

  // Fetch special dates
  const special = await db
    .select()
    .from(specialDates)
    .where(eq(specialDates.tenantId, user.tenantId))
    .orderBy(specialDates.dateIso)
    .all();

  // Fetch business settings
  const settings = await db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.tenantId, user.tenantId))
    .get();

  return json({ hours, specialDates: special, settings, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    switch (intent) {
      case "update-hours": {
        // Delete existing hours for this day
        const dayOfWeek = parseInt(formData.get("dayOfWeek") as string);
        
        await db
          .delete(operatingHours)
          .where(
            and(
              eq(operatingHours.tenantId, user.tenantId),
              eq(operatingHours.dayOfWeek, dayOfWeek)
            )
          )
          .run();

        // Insert new hours (may be multiple for split shifts)
        const hoursData = JSON.parse(formData.get("hours") as string);
        
        for (const hour of hoursData) {
          await db
            .insert(operatingHours)
            .values({
              tenant_id: user.tenantId,
              day_of_week: dayOfWeek,
              start_time: hour.start,
              end_time: hour.end,
            })
            .run();
        }

        return json({ success: true });
      }

      case "add-special-date": {
        const dateIso = formData.get("date") as string;
        const status = formData.get("status") as string;
        const reason = formData.get("reason") as string;

        await db
          .insert(specialDates)
          .values({
            tenant_id: user.tenantId,
            date_iso: dateIso,
            status,
            reason,
          })
          .run();

        return json({ success: true });
      }

      case "delete-special-date": {
        const id = parseInt(formData.get("id") as string);

        await db
          .delete(specialDates)
          .where(
            and(
              eq(specialDates.id, id),
              eq(specialDates.tenantId, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "emergency-close": {
        const reason = formData.get("reason") as string;
        const reopenTime = formData.get("reopenTime") as string || null;

        await db
          .update(businessSettings)
          .set({
            emergency_close_reason: reason,
            emergency_reopen_time: reopenTime,
          })
          .where(eq(businessSettings.tenantId, user.tenantId))
          .run();

        // Trigger cache purge
        const env = (request as any).env;
        if (env.CACHE_PURGE_URL) {
          await fetch(env.CACHE_PURGE_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            },
            body: JSON.stringify({
              purge_everything: true,
            }),
          });
        }

        return json({ success: true });
      }

      case "emergency-reopen": {
        await db
          .update(businessSettings)
          .set({
            emergency_close_reason: null,
            emergency_reopen_time: null,
          })
          .where(eq(businessSettings.tenantId, user.tenantId))
          .run();

        // Trigger cache purge
        const env = (request as any).env;
        if (env.CACHE_PURGE_URL) {
          await fetch(env.CACHE_PURGE_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            },
            body: JSON.stringify({
              purge_everything: true,
            }),
          });
        }

        return json({ success: true });
      }

      case "toggle-hiring": {
        const currentSettings = await db
          .select()
          .from(businessSettings)
          .where(eq(businessSettings.tenantId, user.tenantId))
          .get();

        const newValue = !currentSettings?.is_hiring;

        await db
          .update(businessSettings)
          .set({ is_hiring: newValue })
          .where(eq(businessSettings.tenantId, user.tenantId))
          .run();

        return json({ success: true, isHiring: newValue });
      }

      default:
        return json({ error: "Invalid intent" }, { status: 400 });
    }
  } catch (error) {
    console.error("Operations action error:", error);
    return json({ error: "Operation failed" }, { status: 500 });
  }
}

export default function DashboardOperations() {
  const { hours, specialDates, settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Operations Center</h1>
        <p className="mt-2 text-gray-600">
          Manage your hours, holidays, and emergency closures.
        </p>
      </div>

      {/* Emergency Controls */}
      <Card className="p-6">
        <EmergencyButton
          isEmergencyClosed={!!settings?.emergency_close_reason}
          emergencyReason={settings?.emergency_close_reason || ""}
          fetcher={fetcher}
        />
      </Card>

      {/* Hiring Toggle */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Now Hiring Banner</h3>
            <p className="text-sm text-gray-600">
              Show a "We're Hiring" banner on your public site
            </p>
          </div>
          <button
            onClick={() => {
              const formData = new FormData();
              formData.append("intent", "toggle-hiring");
              fetcher.submit(formData, { method: "post" });
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings?.is_hiring ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings?.is_hiring ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Hours Matrix */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Weekly Operating Hours</h2>
        <HoursMatrix hours={hours} fetcher={fetcher} />
      </Card>

      {/* Holiday Calendar */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Special Dates & Holidays</h2>
        <HolidayCalendar specialDates={specialDates} fetcher={fetcher} />
      </Card>
    </div>
  );
}
