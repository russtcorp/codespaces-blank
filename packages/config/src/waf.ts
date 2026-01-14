/**
 * WAF Aggregator Shield Configuration
 * Blocks scraping bots from DoorDash, UberEats, GrubHub, etc.
 * This file documents the rules that should be configured in Cloudflare WAF
 */

/**
 * WAF Custom Rules for Aggregator Shield
 * These rules should be added to the Cloudflare WAF for the account
 * 
 * Rules block known User-Agents from third-party delivery platforms
 * Helps prevent unauthorized menu scraping and ghost kitchen listings
 */
export const AGGREGATOR_SHIELD_RULES = [
  {
    name: "Block DoorDash Bot",
    description: "Blocks DoorDash scraper from accessing menus",
    expression:
      '(cf.http.user_agent contains "doordash" or cf.http.user_agent contains "grubhub" or cf.http.user_agent contains "ubereats")',
    action: "challenge", // or "block" for stricter enforcement
    priority: 1,
  },
  {
    name: "Block Grubhub Bot",
    description: "Blocks GrubHub scraper from accessing menus",
    expression:
      'cf.http.user_agent contains "grubhub" or cf.http.user_agent contains "seamless"',
    action: "challenge",
    priority: 2,
  },
  {
    name: "Block UberEats Bot",
    description: "Blocks UberEats scraper from accessing menus",
    expression: 'cf.http.user_agent contains "ubereats"',
    action: "challenge",
    priority: 3,
  },
  {
    name: "Block DoorDash Spider",
    description: "Blocks common DoorDash crawler patterns",
    expression:
      '(cf.http.user_agent contains "DoorDash" or cf.http.user_agent contains "Grubhub" or cf.http.user_agent contains "UberEats")',
    action: "challenge",
    priority: 4,
  },
];

/**
 * Instructions for configuring WAF via Cloudflare Dashboard
 *
 * 1. Navigate to Security > WAF
 * 2. Select your zone/account
 * 3. Click "Create rule"
 * 4. For each rule above:
 *    - Set Expression: Copy the expression field
 *    - Set Action: "Challenge" (force CAPTCHA) or "Block" (403 Forbidden)
 *    - Set Priority: Lower number = checked first
 *
 * Alternative: Use Terraform/API to manage WAF rules programmatically
 * (See wrangler.toml for future Cloudflare Workers-based rule management)
 */

/**
 * WAF Rule as Terraform configuration
 * This can be added to a terraform file for Infrastructure-as-Code management
 *
 * resource "cloudflare_waf_rule" "aggregator_shield" {
 *   zone_id = var.cloudflare_zone_id
 *   rule_id = "100000"
 *   group_id = "de677e8baf3e11e5a475022ae4d6670f"
 *   mode    = "challenge"
 * }
 */

/**
 * Runtime check for blocked scraper User-Agents
 * Can be used in Worker middleware for additional protection
 */
export function isBlockedAggregator(userAgent: string): boolean {
  const blockedPatterns = [
    /doordash/i,
    /grubhub/i,
    /ubereats/i,
    /seamless/i,
    /delivery\.com/i,
    /postmates/i,
    /caviar/i,
  ];

  return blockedPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Rate limiting configuration for APIs
 * Prevents abuse from legitimate but aggressive scrapers
 */
export const RATE_LIMIT_CONFIG = {
  // Per IP, per minute
  defaultLimit: 60,
  // Stricter limit for menu/pricing endpoints
  menuEndpointLimit: 30,
  // Stricter limit for search
  searchLimit: 10,
  // Window in seconds
  window: 60,
};
