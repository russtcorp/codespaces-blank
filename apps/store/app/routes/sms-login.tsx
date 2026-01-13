import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Form, useActionData, useSearchParams, useNavigation, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { createOTP, verifyOTP, getUserByPhone, createUserSession } from '~/services/auth.server';
import { sendSms } from '~/services/sms.server';
import { resolveTenantId } from '~/utils/tenant.server';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@diner/ui';

type ActionData = {
  error?: string;
  success?: boolean;
  codeSent?: boolean;
  phone?: string;
  tenantId?: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return json({ tenantHint: url.searchParams.get('tenant') || '' });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as {
    DB: D1Database;
    KV: KVNamespace;
    SESSION_SECRET?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_PHONE_NUMBER?: string;
  };

  const formData = await request.formData();
  const intent = formData.get('intent');
  const tenantOverride = formData.get('tenant');

  if (intent === 'send-code') {
    const phone = formData.get('phone');
    if (!phone || typeof phone !== 'string') {
      return json<ActionData>({ error: 'Valid phone number required' }, { status: 400 });
    }

    const tenantId = (typeof tenantOverride === 'string' && tenantOverride)
      ? tenantOverride
      : (await resolveTenantId(request, env)) || 'tenant-joes-diner';

    // Simple rate limit: max 5 codes per hour per phone
    const rateKey = `otp:rate:${phone}`;
    const current = parseInt((await env.KV.get(rateKey)) || '0', 10) || 0;
    if (current >= 5) {
      return json<ActionData>({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    await env.KV.put(rateKey, String(current + 1), { expirationTtl: 60 * 60 });

    const user = await getUserByPhone(env, phone, tenantId);
    if (!user) {
      return json<ActionData>({ error: 'No account found with this phone number' }, { status: 404 });
    }

    const code = await createOTP(env, phone, tenantId);

    const sms = await sendSms(env, phone, `Your diner login code is: ${code}`);
    if (!sms.success && !sms.skipped) {
      return json<ActionData>({ error: 'Failed to send code. Try again.' }, { status: 500 });
    }
    if (sms.skipped) {
      console.log(`OTP Code for ${phone}: ${code}`);
    }

    return json<ActionData>({ success: true, codeSent: true, phone, tenantId });
  }

  if (intent === 'verify-code') {
    const phone = formData.get('phone');
    const code = formData.get('code');

    if (!phone || !code || typeof phone !== 'string' || typeof code !== 'string') {
      return json<ActionData>({ error: 'Phone and code required' }, { status: 400 });
    }

    const tenantId = await verifyOTP(env, phone, code);
    const resolvedTenant = (typeof tenantOverride === 'string' && tenantOverride) || tenantId;
    if (!tenantId || !resolvedTenant) {
      return json<ActionData>({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const user = await getUserByPhone(env, phone, resolvedTenant);
    if (!user) {
      return json<ActionData>({ error: 'User not found' }, { status: 404 });
    }

    const permissions = user.permissions ? JSON.parse(user.permissions) : [];

    return createUserSession(env, user.id, resolvedTenant, user.email, user.role, permissions, '/dashboard');
  }

  return json<ActionData>({ error: 'Invalid request' }, { status: 400 });
}

export default function SmsLogin() {
  const actionData = (useActionData<ActionData>() ?? {}) as ActionData;
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const { tenantHint } = useLoaderData<{ tenantHint: string }>();
  const isSubmitting = navigation.state === 'submitting';

  if (actionData?.codeSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enter verification code</CardTitle>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="verify-code" />
              <input type="hidden" name="phone" value={actionData.phone || ''} />
              <input type="hidden" name="tenant" value={actionData.tenantId || tenantHint} />
              
              <div>
                <label htmlFor="code" className="block text-sm font-medium">
                  6-digit code
                </label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  className="mt-1 text-center text-2xl tracking-widest"
                />
              </div>

              {actionData?.error && (
                <p className="text-sm text-red-600">{actionData.error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
              </Button>
            </Form>
            <p className="mt-4 text-xs text-center text-gray-500">
              Code sent to {actionData.phone}. Check your messages.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in with SMS</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="send-code" />
            <div>
              <label htmlFor="tenant" className="block text-sm font-medium">
                Tenant (slug or domain)
              </label>
              <Input
                id="tenant"
                name="tenant"
                type="text"
                autoComplete="off"
                placeholder="joes-diner or joesdiner.com"
                defaultValue={actionData.tenantId || tenantHint}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">If left blank, we'll use your current host.</p>
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+1-555-123-4567"
                className="mt-1"
              />
            </div>

            {actionData?.error && (
              <p className="text-sm text-red-600">{actionData.error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Code'}
            </Button>
          </Form>
          
          <div className="mt-4 text-center">
            <a href="/login" className="text-sm text-blue-600 hover:underline">
              Use email instead
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
