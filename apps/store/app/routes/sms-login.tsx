import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Form, useActionData, useSearchParams, useNavigation } from '@remix-run/react';
import { useState } from 'react';
import { createOTP, verifyOTP, getUserByPhone, createUserSession } from '~/services/auth.server';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@diner/ui';

type ActionData = {
  error?: string;
  success?: boolean;
  codeSent?: boolean;
  phone?: string;
};

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

  if (intent === 'send-code') {
    const phone = formData.get('phone');
    if (!phone || typeof phone !== 'string') {
      return json<ActionData>({ error: 'Valid phone number required' }, { status: 400 });
    }

    // For now, assume single tenant (same as magic link)
    const tenantId = 'tenant-joes-diner';

    const user = await getUserByPhone(env, phone, tenantId);
    if (!user) {
      return json<ActionData>({ error: 'No account found with this phone number' }, { status: 404 });
    }

    const code = await createOTP(env, phone, tenantId);

    // TODO: Send SMS via Twilio
    // For now, log it
    console.log(`OTP Code for ${phone}: ${code}`);

    return json<ActionData>({ success: true, codeSent: true, phone });
  }

  if (intent === 'verify-code') {
    const phone = formData.get('phone');
    const code = formData.get('code');

    if (!phone || !code || typeof phone !== 'string' || typeof code !== 'string') {
      return json<ActionData>({ error: 'Phone and code required' }, { status: 400 });
    }

    const tenantId = await verifyOTP(env, phone, code);
    if (!tenantId) {
      return json<ActionData>({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const user = await getUserByPhone(env, phone, tenantId);
    if (!user) {
      return json<ActionData>({ error: 'User not found' }, { status: 404 });
    }

    const permissions = user.permissions ? JSON.parse(user.permissions) : [];

    return createUserSession(env, user.id, tenantId, user.email, user.role, permissions, '/dashboard');
  }

  return json<ActionData>({ error: 'Invalid request' }, { status: 400 });
}

export default function SmsLogin() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
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
              <input type="hidden" name="phone" value={actionData.phone} />
              
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
