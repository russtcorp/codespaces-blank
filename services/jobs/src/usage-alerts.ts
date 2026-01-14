/**
 * Usage Alerts Service
 * Cron job that checks for stale menu items and sends reminder emails
 * Also monitors AI token usage per tenant
 */

export async function handleUsageAlertsCron(
  db: D1Database,
  kv: KVNamespace
): Promise<{
  checkedTenants: number;
  alertsSent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let checkedTenants = 0;
  let alertsSent = 0;

  try {
    // Get all active tenants
    const tenantsResult = await db
      .prepare(
        `SELECT id, business_name, email_alias 
         FROM tenants 
         WHERE subscription_status = 'active' 
         AND deleted_at IS NULL`
      )
      .all<{ id: string; business_name: string; email_alias?: string }>();

    const tenants = tenantsResult.results || [];

    for (const tenant of tenants) {
      checkedTenants++;

      try {
        // Check menu staleness (no updates in 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const staleDateStr = sevenDaysAgo.toISOString();

        const staleItemsResult = await db
          .prepare(
            `SELECT COUNT(*) as count FROM menu_items 
             WHERE tenant_id = ? 
             AND (updated_at IS NULL OR updated_at < ?)
             AND is_available = 1`
          )
          .bind(tenant.id, staleDateStr)
          .first<{ count: number}>();

        const staleCount = staleItemsResult?.count || 0;

        if (staleCount > 0) {
          // Queue email via KV - would be picked up by background worker
          const alertKey = `usage-alert:${tenant.id}:${Date.now()}`;
          await kv.put(
            alertKey,
            JSON.stringify({
              type: "stale_menu",
              tenantId: tenant.id,
              businessName: tenant.business_name,
              email: tenant.email_alias,
              staleItemCount: staleCount,
              createdAt: new Date().toISOString(),
            }),
            { expirationTtl: 86400 } // Keep for 24 hours
          );

          alertsSent++;
        }

        // Check AI token usage (track in analytics)
        const tokenUsageKey = `ai-tokens:${tenant.id}:monthly`;
        const tokenUsage = await kv.get(tokenUsageKey);
        const tokens = tokenUsage ? parseInt(tokenUsage, 10) : 0;

        // If tokens exceed 100k, flag for admin review
        if (tokens > 100000) {
          const flagKey = `high-usage-flag:${tenant.id}`;
          await kv.put(
            flagKey,
            JSON.stringify({
              tenantId: tenant.id,
              businessName: tenant.business_name,
              tokenUsage: tokens,
              flaggedAt: new Date().toISOString(),
            }),
            { expirationTtl: 86400 * 30 } // Keep for 30 days
          );
        }
      } catch (error) {
        errors.push(`Error checking tenant ${tenant.id}: ${error}`);
      }
    }

    return {
      checkedTenants,
      alertsSent,
      errors,
    };
  } catch (error) {
    errors.push(`Cron job failed: ${error}`);
    return {
      checkedTenants,
      alertsSent,
      errors,
    };
  }
}

/**
 * Email template for stale menu alert
 */
export function createStaleMenuEmailBody(
  businessName: string,
  staleItemCount: number
): string {
  return `
Hi there!

We noticed that your menu at ${businessName} hasn't been updated in the last 7 days. 

You have ${staleItemCount} items that might be out of date.

Keeping your menu fresh helps customers know what's available and improves your ranking in search results. 

Log in to your dashboard and update your menu today: 
https://diner-saas.com/dashboard/menu

Questions? Reply to this email or contact support.

Best regards,
The Diner SaaS Team
  `;
}

/**
 * High token usage alert for admin
 */
export function createHighTokenUsageAlert(
  businessName: string,
  tokenUsage: number
): string {
  return `
<alert>
  <title>High AI Token Usage</title>
  <description>${businessName} has used ${tokenUsage.toLocaleString()} tokens this month</description>
  <action>Review AI usage in admin dashboard</action>
</alert>
  `;
}
