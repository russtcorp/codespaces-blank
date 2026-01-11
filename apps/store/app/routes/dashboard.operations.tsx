import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { useState } from 'react';
import { createDb, createTenantDb, businessInfo, specialDates } from '@diner/db';
import { eq } from 'drizzle-orm';
import { requireUserSession } from '~/services/auth.server';
import { invalidatePublicCache } from '~/utils/cache.server';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@diner/ui';

type SpecialDate = {
  id: number;
  dateIso: string;
  status: string;
  reason: string | null;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, session.tenantId);

  const [biz] = await tdb.select(businessInfo);
  const dates = await tdb.select(specialDates);

  return json({
    emergencyClosed: biz?.marketingPixels ? JSON.parse(biz.marketingPixels).emergency_closed : false,
    specialDates: dates as SpecialDate[],
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
    if (intent === 'toggle-emergency') {
      const [biz] = await tdb.select(businessInfo);
      const currentSettings = biz?.marketingPixels ? JSON.parse(biz.marketingPixels) : {};
      const newSettings = {
        ...currentSettings,
        emergency_closed: !currentSettings.emergency_closed,
        emergency_reason: formData.get('reason')?.toString() || null,
      };

      if (biz) {
        await tdb.update(
          businessInfo,
          { marketingPixels: JSON.stringify(newSettings) },
          eq(businessInfo.tenantId, session.tenantId)
        );
      } else {
        await tdb.insert(businessInfo, {
          tenantId: session.tenantId,
          marketingPixels: JSON.stringify(newSettings),
        });
      }

      await invalidatePublicCache(env, session.tenantId);
      return json({
        success: true,
        message: newSettings.emergency_closed ? 'Emergency close activated' : 'Emergency close deactivated',
      });
    }

    if (intent === 'add-special-date') {
      const dateIso = formData.get('dateIso');
      const status = formData.get('status');
      const reason = formData.get('reason');

      if (!dateIso || !status) {
        return json({ error: 'Date and status required' }, { status: 400 });
      }

      await tdb.insert(specialDates, {
        dateIso: dateIso.toString(),
        status: status.toString(),
        reason: reason?.toString() || null,
      });

      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Special date added' });
    }

    if (intent === 'delete-special-date') {
      const id = formData.get('id');
      if (!id) {
        return json({ error: 'ID required' }, { status: 400 });
      }

      await db.delete(specialDates).where(eq(specialDates.id, parseInt(id.toString(), 10)));
      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Special date removed' });
    }

    return json({ error: 'Unknown intent' }, { status: 400 });
  } catch (error) {
    console.error('Operations action error:', error);
    return json({ error: 'Operation failed' }, { status: 500 });
  }
}

export default function Operations() {
  const { emergencyClosed, specialDates: dates } = useLoaderData<typeof loader>();
  const [showAddDate, setShowAddDate] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const fetcher = useFetcher();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Operations</h2>
        <p className="text-gray-600">Manage special closures and emergency controls</p>
      </div>

      {/* Emergency Close */}
      <Card className={emergencyClosed ? 'border-red-500 bg-red-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🚨 Emergency Close</span>
            <span className={`text-sm ${emergencyClosed ? 'text-red-600' : 'text-gray-500'}`}>
              {emergencyClosed ? 'ACTIVE' : 'Inactive'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Use this to immediately close your diner for emergencies. Your public site will show as closed.
          </p>
          {!emergencyClosed && (
            <div>
              <label htmlFor="reason" className="block text-sm font-medium">
                Reason (optional)
              </label>
              <Input
                id="reason"
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                placeholder="Weather emergency, equipment failure, etc."
                className="mt-1"
              />
            </div>
          )}
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="toggle-emergency" />
            {emergencyReason && <input type="hidden" name="reason" value={emergencyReason} />}
            <Button
              type="submit"
              variant={emergencyClosed ? 'default' : 'destructive'}
              className="w-full"
            >
              {emergencyClosed ? 'Deactivate Emergency Close' : 'Activate Emergency Close'}
            </Button>
          </fetcher.Form>
        </CardContent>
      </Card>

      {/* Special Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Special Dates & Holidays</span>
            <Button size="sm" onClick={() => setShowAddDate(true)}>
              Add Date
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dates.map((date) => (
              <div key={date.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{date.dateIso}</p>
                  {date.reason && <p className="text-sm text-gray-600">{date.reason}</p>}
                  <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${
                    date.status === 'closed' ? 'bg-red-100 text-red-800' :
                    date.status === 'open' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {date.status}
                  </span>
                </div>
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="delete-special-date" />
                  <input type="hidden" name="id" value={date.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Remove
                  </Button>
                </fetcher.Form>
              </div>
            ))}
            {dates.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">No special dates configured</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Special Date Modal */}
      <Dialog open={showAddDate} onOpenChange={(open) => !open && setShowAddDate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Special Date</DialogTitle>
          </DialogHeader>
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="add-special-date" />
            
            <div>
              <label htmlFor="dateIso" className="block text-sm font-medium">Date</label>
              <Input
                id="dateIso"
                name="dateIso"
                type="date"
                required
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium">Status</label>
              <select
                id="status"
                name="status"
                required
                className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
              >
                <option value="closed">Closed</option>
                <option value="open">Open (override)</option>
                <option value="limited">Limited Hours</option>
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium">Reason (optional)</label>
              <Input
                id="reason"
                name="reason"
                placeholder="Holiday, event, etc."
                className="mt-1"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDate(false)}>
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
