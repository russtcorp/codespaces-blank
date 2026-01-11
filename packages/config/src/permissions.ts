/**
 * User roles in the system
 */
export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  ADMIN: 'admin', // Super admin
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Granular permissions for tenant users
 */
export const PERMISSIONS = {
  MENU_FULL_ACCESS: 'menu_full_access',
  MENU_READ_ONLY: 'menu_read_only',
  HOURS_EDIT: 'hours_edit',
  HOURS_READ_ONLY: 'hours_read_only',
  REVIEWS_RESPOND: 'reviews_respond',
  REVIEWS_READ_ONLY: 'reviews_read_only',
  SETTINGS_EDIT: 'settings_edit',
  BILLING_ACCESS: 'billing_access',
  ANALYTICS_VIEW: 'analytics_view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Default permissions by role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    PERMISSIONS.MENU_FULL_ACCESS,
    PERMISSIONS.HOURS_EDIT,
    PERMISSIONS.REVIEWS_RESPOND,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.BILLING_ACCESS,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  manager: [
    PERMISSIONS.MENU_FULL_ACCESS,
    PERMISSIONS.HOURS_EDIT,
    PERMISSIONS.REVIEWS_RESPOND,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  admin: [], // Super admin has all permissions implicitly
};
