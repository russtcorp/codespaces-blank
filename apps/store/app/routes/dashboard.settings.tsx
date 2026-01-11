import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useFetcher, useActionData } from '@remix-run/react';
import { useEffect } from 'react';
import { createDb, createTenantDb, businessInfo, themeConfig, tenants } from '@diner/db';
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

  return json({
    tenant,
    businessInfo: biz || {},
    theme: theme || {},
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

    return json({ error: 'Unknown intent' }, { status: 400 });
  } catch (error) {
    console.error('Settings action error:', error);
    return json({ error: 'Operation failed' }, { status: 500 });
  }
}

export default function Settings() {
  const { tenant, businessInfo: biz, theme } = useLoaderData<typeof loader>();
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
