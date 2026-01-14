import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { authenticator } from "~/services/auth.server";
import { db, authorizedUsers, businessSettings } from "@diner-saas/db";
import { eq } from "drizzle-orm";
import { Card } from "@diner-saas/ui/components/card";
import { Button } from "@diner-saas/ui/components/button";
import { Input } from "@diner-saas/ui/components/input";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  // Fetch user settings
  const userData = await db
    .select()
    .from(authorizedUsers)
    .where(eq(authorizedUsers.id, user.id))
    .get();

  // Fetch business settings
  const settings = await db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.tenant_id, user.tenantId))
    .get();

  return json({ user, userData, settings });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    switch (intent) {
      case "update-notifications": {
        const preferences = {
          sms_reviews: formData.get("sms_reviews") as string,
          sms_marketing: formData.get("sms_marketing") === "true",
          email_reports: formData.get("email_reports") === "true",
        };

        await db
          .update(authorizedUsers)
          .set({
            notification_preferences: JSON.stringify(preferences),
          })
          .where(eq(authorizedUsers.id, user.id))
          .run();

        return json({ success: true });
      }

      case "update-marketing-pixels": {
        const pixels = {
          facebook: formData.get("facebook_pixel") as string,
          google: formData.get("google_tag") as string,
        };

        await db
          .update(businessSettings)
          .set({
            marketing_pixels: JSON.stringify(pixels),
          })
          .where(eq(businessSettings.tenant_id, user.tenantId))
          .run();

        return json({ success: true });
      }

      case "update-contact-info": {
        const address = formData.get("address") as string;
        const phone = formData.get("phone") as string;
        const timezone = formData.get("timezone") as string;

        await db
          .update(businessSettings)
          .set({
            address,
            phone_public: phone,
            timezone,
          })
          .where(eq(businessSettings.tenant_id, user.tenantId))
          .run();

        return json({ success: true });
      }

      default:
        return json({ error: "Invalid intent" }, { status: 400 });
    }
  } catch (error) {
    console.error("Settings action error:", error);
    return json({ error: "Operation failed" }, { status: 500 });
  }
}

export default function DashboardSettings() {
  const { userData, settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Parse notification preferences
  let notificationPrefs = {
    sms_reviews: "all",
    sms_marketing: false,
    email_reports: true,
  };
  try {
    if (userData?.notification_preferences) {
      notificationPrefs = JSON.parse(userData.notification_preferences);
    }
  } catch (e) {
    // Use defaults
  }

  // Parse marketing pixels
  let marketingPixels = {
    facebook: "",
    google: "",
  };
  try {
    if (settings?.marketing_pixels) {
      marketingPixels = JSON.parse(settings.marketing_pixels);
    }
  } catch (e) {
    // Use defaults
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account, notifications, and marketing tools.
        </p>
      </div>

      {/* Contact Information */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Business Information</h2>
        <fetcher.Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="update-contact-info" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <Input
              name="address"
              type="text"
              defaultValue={settings?.address || ""}
              placeholder="123 Main St, City, State 12345"
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone Number (Public)
            </label>
            <Input
              name="phone"
              type="tel"
              defaultValue={settings?.phone_public || ""}
              placeholder="+1 (555) 123-4567"
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <select
              name="timezone"
              defaultValue={settings?.timezone || "America/New_York"}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Anchorage">Alaska Time</option>
              <option value="Pacific/Honolulu">Hawaii Time</option>
            </select>
          </div>

          <Button type="submit">Save Changes</Button>
        </fetcher.Form>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Notification Preferences</h2>
        <fetcher.Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="update-notifications" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              SMS Notifications for Reviews
            </label>
            <select
              name="sms_reviews"
              defaultValue={notificationPrefs.sms_reviews}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="all">All Reviews</option>
              <option value="5_star_only">5-Star Only</option>
              <option value="negative_only">Negative Reviews Only</option>
              <option value="none">None</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="sms_marketing"
              value="true"
              defaultChecked={notificationPrefs.sms_marketing}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label className="ml-2 text-sm text-gray-700">
              Receive marketing tips via SMS
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="email_reports"
              value="true"
              defaultChecked={notificationPrefs.email_reports}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label className="ml-2 text-sm text-gray-700">
              Receive weekly performance reports via email
            </label>
          </div>

          <Button type="submit">Save Preferences</Button>
        </fetcher.Form>
      </Card>

      {/* Marketing Pixels */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Marketing & Analytics</h2>
        <p className="mb-4 text-sm text-gray-600">
          Add tracking pixels to measure your marketing performance. These will be
          automatically injected into your public site via Cloudflare Zaraz.
        </p>
        <fetcher.Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="update-marketing-pixels" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Facebook Pixel ID
            </label>
            <Input
              name="facebook_pixel"
              type="text"
              defaultValue={marketingPixels.facebook}
              placeholder="123456789012345"
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Google Analytics Tag ID
            </label>
            <Input
              name="google_tag"
              type="text"
              defaultValue={marketingPixels.google}
              placeholder="G-XXXXXXXXXX"
              className="mt-1"
            />
          </div>

          <Button type="submit">Save Pixels</Button>
        </fetcher.Form>
      </Card>

      {/* Marketing Assets */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Marketing Assets</h2>
        <p className="mb-4 text-sm text-gray-600">
          Generate print-ready marketing materials for your diner.
        </p>
        <div className="space-y-2">
          <Link to="/dashboard/flyer" target="_blank">
            <Button variant="outline" className="w-full justify-start">
              📄 Generate QR Code Flyer
            </Button>
          </Link>
          <Button variant="outline" className="w-full justify-start" disabled>
            📊 Download Social Media Kit (Coming Soon)
          </Button>
        </div>
      </Card>
    </div>
  );
}
