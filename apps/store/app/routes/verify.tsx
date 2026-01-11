import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { Form, useLoaderData, useNavigation } from '@remix-run/react';
import { verifyMagicLinkToken, getUserByEmail, createUserSession } from '~/services/auth.server';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@diner/ui';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return redirect('/login');
  }

  return json({ token });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const formData = await request.formData();
  const token = formData.get('token');

  if (!token || typeof token !== 'string') {
    return json({ error: 'Invalid token' }, { status: 400 });
  }

  const verified = await verifyMagicLinkToken(env, token);
  if (!verified) {
    return json({ error: 'Token expired or invalid' }, { status: 400 });
  }

  const { email, tenantId } = verified;
  const user = await getUserByEmail(env, email, tenantId);

  if (!user) {
    return json({ error: 'User not found' }, { status: 404 });
  }

  const permissions = user.permissions ? JSON.parse(user.permissions) : [];

  return createUserSession(
    env,
    user.id,
    tenantId,
    user.email,
    user.role,
    permissions,
    '/dashboard'
  );
}

export default function Verify() {
  const { token } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirm sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Click the button below to confirm and complete your sign in.
          </p>
          <Form method="post">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Confirm and sign in'}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
