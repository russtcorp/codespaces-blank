import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { createDb, createTenantDb, operatingHours } from '@diner/db';
import { eq } from 'drizzle-orm';
import { requireUserSession } from '~/services/auth.server';
import { invalidatePublicCache } from '~/utils/cache.server';
import { requirePermission } from '~/utils/permissions';
import { PERMISSIONS } from '@diner/config';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@diner/ui';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type HoursBlock = {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  // Check permission
  requirePermission(session, PERMISSIONS.HOURS_EDIT);

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, session.tenantId);

  const hours = await tdb.select(operatingHours);

  return json({ hours: hours as HoursBlock[] });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  const formData = await request.formData();
  const intent = formData.get('intent');

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, session.tenantId);

  try {
    if (intent === 'add-hours') {
      const dayOfWeek = formData.get('dayOfWeek');
      const startTime = formData.get('startTime');
      const endTime = formData.get('endTime');

      if (
        dayOfWeek === null ||
        !startTime ||
        !endTime ||
        typeof startTime !== 'string' ||
        typeof endTime !== 'string'
      ) {
        return json({ error: 'All fields required' }, { status: 400 });
      }

      await tdb.insert(operatingHours, {
        dayOfWeek: parseInt(dayOfWeek.toString(), 10),
        startTime,
        endTime,
      });

      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Hours added' });
    }

    if (intent === 'delete-hours') {
      const id = formData.get('id');
      if (!id) {
        return json({ error: 'ID required' }, { status: 400 });
      }

      await db.delete(operatingHours).where(eq(operatingHours.id, parseInt(id.toString(), 10)));
      await invalidatePublicCache(env, session.tenantId);
      return json({ success: true, message: 'Hours removed' });
    }

    return json({ error: 'Unknown intent' }, { status: 400 });
  } catch (error) {
    console.error('Hours action error:', error);
    return json({ error: 'Operation failed' }, { status: 500 });
  }
}

export default function Hours() {
  const { hours } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const hoursByDay = DAYS.map((day, index) => ({
    day,
    index,
    blocks: hours.filter((h) => h.dayOfWeek === index),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Operating Hours</h2>
        <p className="text-gray-600">Manage your diner's schedule</p>
      </div>

      <div className="space-y-4">
        {hoursByDay.map(({ day, index, blocks }) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{day}</span>
                <fetcher.Form method="post" className="flex gap-2">
                  <input type="hidden" name="intent" value="add-hours" />
                  <input type="hidden" name="dayOfWeek" value={index} />
                  <Input
                    name="startTime"
                    type="time"
                    placeholder="Start"
                    className="w-32"
                    required
                  />
                  <Input
                    name="endTime"
                    type="time"
                    placeholder="End"
                    className="w-32"
                    required
                  />
                  <Button type="submit" size="sm">
                    Add Shift
                  </Button>
                </fetcher.Form>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <div key={block.id} className="flex items-center justify-between">
                    <span className="text-sm">
                      {block.startTime} - {block.endTime}
                    </span>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="delete-hours" />
                      <input type="hidden" name="id" value={block.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Remove
                      </Button>
                    </fetcher.Form>
                  </div>
                ))}
                {blocks.length === 0 && (
                  <p className="text-sm text-muted-foreground">Closed</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
