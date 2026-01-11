import type { Permission } from '@diner/config';

type Session = {
  userId: number;
  tenantId: string;
  role: string;
  permissions: string[];
};

export function hasPermission(session: Session, permission: Permission): boolean {
  // Super admins and owners have all permissions
  if (session.role === 'admin' || session.role === 'owner') {
    return true;
  }

  return session.permissions.includes(permission);
}

export function requirePermission(session: Session, permission: Permission) {
  if (!hasPermission(session, permission)) {
    throw new Response('Forbidden', { status: 403 });
  }
}

export function canEditMenu(session: Session): boolean {
  return hasPermission(session, 'menu_full_access');
}

export function canEditHours(session: Session): boolean {
  return hasPermission(session, 'hours_edit');
}

export function canEditSettings(session: Session): boolean {
  return hasPermission(session, 'settings_edit');
}

export function canAccessBilling(session: Session): boolean {
  return hasPermission(session, 'billing_access');
}

export function canViewAnalytics(session: Session): boolean {
  return hasPermission(session, 'analytics_view');
}
