import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useFetcher, useActionData } from '@remix-run/react';
import { useEffect } from 'react';
import { createDb, createTenantDb, businessInfo, themeConfig, tenants, authorizedUsers } from '@diner/db';
import { eq } from 'drizzle-orm';
import { requireUserSession } from '~/services/auth.server';
import { invalidatePublicCache } from '~/utils/cache.server';
import { requirePermission } from '~/utils/permissions';
import { PERMISSIONS } from '@diner/config';
import { SUPPORTED_TIMEZONES } from '@diner/config';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@diner/ui';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  // Check permission
  requirePermission(session, PERMISSIONS.SETTINGS_EDIT);

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, session.tenantId);

  const [tenant] = await tdb.select(tenants);
  const [biz] = await tdb.select(businessInfo);
  const [theme] = await tdb.select(themeConfig);
  const [user] = await tdb.select(authorizedUsers, eq(authorizedUsers.id, session.userId));

  const pixels = biz?.marketingPixels ? JSON.parse(biz.marketingPixels) : {};
  const notifPrefs = user?.notificationPreferences ? JSON.parse(user.notificationPreferences) : {};

  return json({
    tenant,
    businessInfo: biz || {},
    theme: theme || {},
    pixels: {
      facebookPixelId: pixels.facebook_pixel_id || '',
      googleTagId: pixels.google_tag_id || '',
    },
    notificationPreferences: {
      smsReviews: notifPrefs.sms_reviews || 'none',
      emailWeeklyReport: notifPrefs.email_weekly_report ?? true,
    },
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  const formData = await request.formData();
  const intent = formData.get('intent');

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, session.tenantId);

  try {
    if (intent === 'update-business') {
      const address = formData.get('address');
      const phonePublic = formData.get('phonePublic');
      const timezone = formData.get('timezone');

      const data = {
        address: address?.toString() || null,
        phonePublic: phonePublic?.toString() || null,
        timezone: timezone?.toString() || 'America/New_York',
      };

      // Check if record exists
      const [existing] = await tdb.select(businessInfo);
      if (existing) {
        await tdb.update(businessInfo, data, eq(businessInfo.tenantId, session.tenantId));
      } else {
        await tdb.insert(businessInfo, { ...data, tenantId: session.tenantId });
      }

      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Business info updated' });
    }

    if (intent === 'update-theme') {
      const primaryColor = formData.get('primaryColor');
      const secondaryColor = formData.get('secondaryColor');
      const fontHeading = formData.get('fontHeading');
      const fontBody = formData.get('fontBody');
      const layoutStyle = formData.get('layoutStyle');

      const data = {
        primaryColor: primaryColor?.toString() || null,
        secondaryColor: secondaryColor?.toString() || null,
        fontHeading: fontHeading?.toString() || null,
        fontBody: fontBody?.toString() || null,
        layoutStyle: layoutStyle?.toString() || 'grid',
      };

      // Check if record exists
      const [existing] = await tdb.select(themeConfig);
      if (existing) {
        await tdb.update(themeConfig, data, eq(themeConfig.tenantId, session.tenantId));
      } else {
        await tdb.insert(themeConfig, { ...data, tenantId: session.tenantId });
      }

      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Theme updated' });
    }

    if (intent === 'update-pixels') {
      const facebookPixelId = formData.get('facebookPixelId');
      const googleTagId = formData.get('googleTagId');

      const [biz] = await tdb.select(businessInfo);
      const currentPixels = biz?.marketingPixels ? JSON.parse(biz.marketingPixels) : {};
      const newPixels = {
        ...currentPixels,
        facebook_pixel_id: facebookPixelId?.toString() || '',
        google_tag_id: googleTagId?.toString() || '',
      };

      if (biz) {
        await tdb.update(
          businessInfo,
          { marketingPixels: JSON.stringify(newPixels) },
          eq(businessInfo.tenantId, session.tenantId)
        );
      } else {
        await tdb.insert(businessInfo, {
          tenantId: session.tenantId,
          marketingPixels: JSON.stringify(newPixels),
        });
      }

      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Marketing pixels updated' });
    }

    if (intent === 'update-notifications') {
      const smsReviews = formData.get('smsReviews');
      const emailWeeklyReport = formData.get('emailWeeklyReport') === 'true';

      const [user] = await tdb.select(authorizedUsers, eq(authorizedUsers.id, session.userId));
      const prefs = {
        sms_reviews: smsReviews?.toString() || 'none',
        email_weekly_report: emailWeeklyReport,
      };

      if (user) {
        await tdb.update(
          authorizedUsers,
          { notificationPreferences: JSON.stringify(prefs) },
          eq(authorizedUsers.id, session.userId)
        );
      }

      return json({ success: true, message: 'Notification preferences updated' });
    }

    return json({ error: 'Unknown intent' }, { status: 400 });
  } catch (error) {
    console.error('Settings action error:', error);
    return json({ error: 'Operation failed' }, { status: 500 });
  }
}

export default function Settings() {
  const { tenant, businessInfo: biz, theme, pixels, notificationPreferences } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-gray-600">Manage your diner settings and appearance</p>
      </div>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="update-business" />
            
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium">
                Business Name
              </label>
              <Input
                id="businessName"
                defaultValue={tenant?.businessName}
                disabled
                className="mt-1 bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-500">Contact support to change business name</p>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium">
                Address
              </label>
              <Input
                id="address"
                name="address"
                defaultValue={biz?.address || ''}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="phonePublic" className="block text-sm font-medium">
                Public Phone Number
              </label>
              <Input
                id="phonePublic"
                name="phonePublic"
                type="tel"
                defaultValue={biz?.phonePublic || ''}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium">
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={biz?.timezone || 'America/New_York'}
                className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
              >
                {SUPPORTED_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={fetcher.state === 'submitting'}>
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Business Info'}
            </Button>
          </fetcher.Form>
        </CardContent>
      </Card>

      {/* Theme Customization */}
      <Card>
        <CardHeader>
          <CardTitle>Theme & Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="update-theme" />
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium">
                  Primary Color
                </label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="primaryColor"
                    name="primaryColor"
                    type="color"
                    defaultValue={theme?.primaryColor || '#b22222'}
                    className="h-10 w-20"
                  />
                  <Input
                    defaultValue={theme?.primaryColor || '#b22222'}
                    className="flex-1"
                    disabled
                  />
                </div>
              </div>

              <div>
                <label htmlFor="secondaryColor" className="block text-sm font-medium">
                  Secondary Color
                </label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="secondaryColor"
                    name="secondaryColor"
                    type="color"
                    defaultValue={theme?.secondaryColor || '#f8f4ec'}
                    className="h-10 w-20"
                  />
                  <Input
                    defaultValue={theme?.secondaryColor || '#f8f4ec'}
                    className="flex-1"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fontHeading" className="block text-sm font-medium">
                  Heading Font
                </label>
                <select
                  id="fontHeading"
                  name="fontHeading"
                  defaultValue={theme?.fontHeading || 'Inter'}
                  className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
                >
                  <option value="Inter">Inter</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                </select>
              </div>

              <div>
                <label htmlFor="fontBody" className="block text-sm font-medium">
                  Body Font
                </label>
                <select
                  id="fontBody"
                  name="fontBody"
                  defaultValue={theme?.fontBody || 'Inter'}
                  className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
                >
                  <option value="Inter">Inter</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="layoutStyle" className="block text-sm font-medium">
                Layout Style
              </label>
              <select
                id="layoutStyle"
                name="layoutStyle"
                defaultValue={theme?.layoutStyle || 'grid'}
                className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>

            <Button type="submit" disabled={fetcher.state === 'submitting'}>
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Theme'}
            </Button>
          </fetcher.Form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="update-notifications" />
            
            <div>
              <label htmlFor="smsReviews" className="block text-sm font-medium">
                SMS Review Alerts
              </label>
              <select
                id="smsReviews"
                name="smsReviews"
                defaultValue={notificationPreferences.smsReviews}
                className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
              >
                <option value="none">None - Don't text me</option>
                <option value="all">All reviews</option>
                <option value="5_star">5-star reviews only</option>
                <option value="1_star">1-star reviews only</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Get text messages when customers leave reviews</p>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="emailWeeklyReport"
                  value="true"
                  defaultChecked={notificationPreferences.emailWeeklyReport}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium">Email me weekly reports</span>
              </label>
              <p className="ml-6 text-xs text-muted-foreground">Receive weekly analytics and ROI reports via email</p>
            </div>

            <Button type="submit" disabled={fetcher.state === 'submitting'}>
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Preferences'}
            </Button>
          </fetcher.Form>
        </CardContent>
      </Card>

      {/* Marketing Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="update-pixels" />
            
            <div>
              <label htmlFor="facebookPixelId" className="block text-sm font-medium">
                Facebook Pixel ID
              </label>
              <Input
                id="facebookPixelId"
                name="facebookPixelId"
                placeholder="1234567890123456"
                defaultValue={pixels.facebookPixelId}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">Track conversions and optimize Facebook ads</p>
            </div>

            <div>
              <label htmlFor="googleTagId" className="block text-sm font-medium">
                Google Analytics 4 ID
              </label>
              <Input
                id="googleTagId"
                name="googleTagId"
                placeholder="G-XXXXXXXXXX"
                defaultValue={pixels.googleTagId}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">Track visitor behavior with Google Analytics</p>
            </div>

            <Button type="submit" disabled={fetcher.state === 'submitting'}>
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Integrations'}
            </Button>
          </fetcher.Form>
        </CardContent>
      </Card>

      {actionData?.success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          {actionData.message}
        </div>
      )}
      {actionData?.error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {actionData.error}
        </div>
      )}
    </div>
  );
}
