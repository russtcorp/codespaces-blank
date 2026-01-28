import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Form } from "@remix-run/react";
import { drizzle } from "drizzle-orm/d1";
import { tenants } from "@diner-saas/db";
import { getFeatureFlags, setFeatureFlag, featureFlagsSchema } from "@diner-saas/config/src/feature-flags";
import { Card } from "@diner-saas/ui/card";
import { Button } from "@diner-saas/ui/button";

export async function loader({ request, context }: LoaderFunctionArgs) {
  // In a real app, you'd protect this route for super admins
  const db = drizzle(context.cloudflare.env.DB);
  const allTenants = await db.select({ id: tenants.id, businessName: tenants.businessName }).from(tenants).all();

  const tenantFlags = await Promise.all(
    allTenants.map(async (tenant) => ({
      ...tenant,
      flags: await getFeatureFlags(context.cloudflare.env.FEATURE_FLAGS, tenant.id),
    }))
  );
  
  return json({ tenantFlags });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();
    const tenantId = formData.get('tenantId');
    const flagName = formData.get('flagName');
    const isEnabled = formData.get('isEnabled');
    
    // Validate form data
    if (!tenantId || typeof tenantId !== 'string') {
      return json({ error: 'Invalid tenant ID' }, { status: 400 });
    }
    if (!flagName || typeof flagName !== 'string') {
      return json({ error: 'Invalid flag name' }, { status: 400 });
    }
    if (isEnabled !== 'true' && isEnabled !== 'false') {
      return json({ error: 'Invalid enabled value' }, { status: 400 });
    }

    await setFeatureFlag(context.cloudflare.env.FEATURE_FLAGS, tenantId, flagName, isEnabled !== 'true');
    return redirect('/admin/feature-flags');
}


export default function AdminFeatureFlags() {
  const { tenantFlags } = useLoaderData<typeof loader>();
  const flagKeys = Object.keys(featureFlagsSchema.shape);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Feature Flags</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenantFlags.map((tenant) => (
          <Card key={tenant.id}>
            <Card.Header>
              <Card.Title>{tenant.businessName}</Card.Title>
              <Card.Description>{tenant.id}</Card.Description>
            </Card.Header>
            <Card.Content>
              <Form method="post">
                <input type="hidden" name="tenantId" value={tenant.id} />
                {flagKeys.map(key => (
                  <div key={key} className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">{key}</span>
                    <Button size="sm" variant={tenant.flags[key] ? 'secondary' : 'outline'} name="flagName" value={key} type="submit">
                       <input type="hidden" name="isEnabled" value={String(tenant.flags[key])} />
                       {tenant.flags[key] ? "Disable" : "Enable"}
                    </Button>
                  </div>
                ))}
              </Form>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
