import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { createMagicLinkToken, getUserByEmail } from '~/services/auth.server';
import { resolveTenantId } from '~/utils/tenant.server';
import { sendMagicLinkEmail } from '~/services/email.server';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@diner/ui';

type ActionData = {
  error?: string;
  success?: boolean;
  email?: string;
  tenantId?: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return json({ tenantHint: url.searchParams.get('tenant') || '' });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace };
  const formData = await request.formData();
  const email = formData.get('email');
  const tenantOverride = formData.get('tenant');

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return json<ActionData>({ error: 'Valid email required' }, { status: 400 });
  }

  const tenantId = (typeof tenantOverride === 'string' && tenantOverride)
    ? tenantOverride
    : (await resolveTenantId(request, env)) || 'tenant-joes-diner';

  const user = await getUserByEmail(env, email.toLowerCase(), tenantId);
  if (!user) {
    return json<ActionData>({ error: 'No account found with this email' }, { status: 404 });
  }

  const token = await createMagicLinkToken(env, email.toLowerCase(), tenantId);
  const verifyUrl = new URL('/verify', request.url);
  verifyUrl.searchParams.set('token', token);

  // Send email via MailChannels
  const emailResult = await sendMagicLinkEmail(env as any, email.toLowerCase(), verifyUrl.toString());
  
  if (!emailResult.success) {
    // In dev mode, log the URL
    console.log(`Magic link (email failed): ${verifyUrl.toString()}`);
  }

  return json<ActionData>({ success: true, email, tenantId });
}

export default function Login() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const { tenantHint } = useLoaderData<typeof loader>();
  const isSubmitting = navigation.state === 'submitting';

  if (actionData?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We sent a magic link to <strong>{actionData.email}</strong>. Click the link in the
              email to sign in.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              The link expires in 15 minutes.
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
          <CardTitle>Sign in to Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-1"
              />
            </div>

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
                defaultValue={actionData?.tenantId || tenantHint}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">If left blank, we'll use your current host.</p>
            </div>
            {actionData?.error && (
              <p className="text-sm text-red-600">{actionData.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send magic link'}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
