import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { useState } from 'react';
import { createDb, createTenantDb, authorizedUsers } from '@diner/db';
import { eq } from 'drizzle-orm';
import { requireUserSession } from '~/services/auth.server';
import { createMagicLinkToken } from '~/services/auth.server';
import { sendMagicLinkEmail } from '~/services/email.server';
import { USER_ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '@diner/config';
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

type User = {
  id: number;
  email: string | null;
  phoneNumber: string | null;
  name: string | null;
  role: string;
  permissions: string[];
  lastLogin: string | null;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, session.tenantId);

  const users = await tdb.select(authorizedUsers);

  return json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      phoneNumber: u.phoneNumber,
      name: u.name,
      role: u.role,
      permissions: u.permissions ? JSON.parse(u.permissions) : [],
      lastLogin: u.lastLogin,
    })) as User[],
    currentUserId: session.userId,
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
    if (intent === 'add-user') {
      const email = formData.get('email');
      const name = formData.get('name');
      const role = formData.get('role');

      if (!email || !role) {
        return json({ error: 'Email and role required' }, { status: 400 });
      }

      const defaultPermissions = ROLE_PERMISSIONS[role.toString() as keyof typeof ROLE_PERMISSIONS] || [];

      await tdb.insert(authorizedUsers, {
        email: email.toString(),
        name: name?.toString() || null,
        role: role.toString(),
        permissions: JSON.stringify(defaultPermissions),
      });

      // Send invite email
      const token = await createMagicLinkToken(env, email.toString(), session.tenantId);
      const verifyUrl = new URL('/verify', request.url);
      verifyUrl.searchParams.set('token', token);
      await sendMagicLinkEmail(env, email.toString(), verifyUrl.toString());

      return json({ success: true, message: 'User added and invite sent' });
    }

    if (intent === 'delete-user') {
      const id = formData.get('id');
      if (!id) {
        return json({ error: 'ID required' }, { status: 400 });
      }

      const userId = parseInt(id.toString(), 10);

      // Prevent deleting yourself
      if (userId === session.userId) {
        return json({ error: 'Cannot delete yourself' }, { status: 400 });
      }

      // Check if last owner
      const users = await tdb.select(authorizedUsers);
      const owners = users.filter((u) => u.role === 'owner' && u.id !== userId);
      
      if (owners.length === 0) {
        return json({ error: 'Cannot delete the last owner' }, { status: 400 });
      }

      await db.delete(authorizedUsers).where(eq(authorizedUsers.id, userId));

      return json({ success: true, message: 'User removed' });
    }

    return json({ error: 'Unknown intent' }, { status: 400 });
  } catch (error) {
    console.error('User management error:', error);
    return json({ error: 'Operation failed' }, { status: 500 });
  }
}

export default function Users() {
  const { users, currentUserId } = useLoaderData<typeof loader>();
  const [showAddUser, setShowAddUser] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const fetcher = useFetcher();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage who has access to your dashboard</p>
        </div>
        <Button onClick={() => setShowAddUser(true)}>Add User</Button>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Authorized Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.name || user.email}</p>
                    {user.id === currentUserId && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">You</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{user.role}</span>
                    {user.lastLogin && (
                      <span className="text-xs text-gray-500">
                        Last login: {new Date(user.lastLogin).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {user.id !== currentUserId && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmDelete(user.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">No users found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Dialog open={showAddUser} onOpenChange={(open) => !open && setShowAddUser(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="add-user" />
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium">Name</label>
              <Input id="name" name="name" placeholder="John Doe" className="mt-1" />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="user@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium">Role</label>
              <select
                id="role"
                name="role"
                required
                className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
              >
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Owners have full access. Managers cannot edit billing or users.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
              <Button type="submit">Send Invite</Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Removal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this user? They will lose access to the dashboard.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="delete-user" />
              <input type="hidden" name="id" value={confirmDelete || ''} />
              <Button type="submit" variant="destructive">Remove User</Button>
            </fetcher.Form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
