import { drizzle } from "drizzle-orm/d1";
import { menuItems, businessSettings } from "@diner-saas/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
// ... (other potential imports)

// ... (existing tool functions: eightySixItem, updateItemPrice, etc.)

// New Tool for Context Efficiency
async function getMenuSummary(db: D1Database, tenantId: string) {
  const dbClient = drizzle(db);
  const items = await dbClient.select({ name: menuItems.name, price: menuItems.price }).from(menuItems).where(eq(menuItems.tenantId, tenantId)).all();
  const summary = items.map(i => `${i.name} ($${i.price})`).join(", ");
  return { summary: summary || "No items on the menu." };
}

export async function executeCommand(
  db: D1Database,
  vectorize: any,
  ai: any,
  queues: { marketingBroadcast: Queue },
  tenantId: string,
  command: string
) {
  // ... (RAG logic would go here if we were using it for general knowledge, but we are using tools for specific data)

  const tools = {
    updateItemPrice: { /* ... */ },
    setEmergencyClosure: { /* ... */ },
    marketingBroadcast: { /* ... */ },
    eightySixItem: { /* ... */ },
    getMenuSummary: {
      tool: async () => {
        return await getMenuSummary(db, tenantId);
      },
      description: "Get a list of all items on the menu and their prices. Use this before answering questions about what is on the menu.",
      parameters: z.object({}),
    },
  };
  
  // ... (rest of the function, calling generateTool or similar)
import { createDb, createSafeDb, getOpenStatus } from "@diner-saas/db";
import type { SafeDatabase } from "@diner-saas/db";
import type { InboundMessage } from "@diner-saas/ai";
import type { Env } from "../durable-object";

export interface CommandResult {
  response?: string;
}

export async function handleInboundCommand(env: Env, msg: InboundMessage): Promise<CommandResult> {
  const tenantId = msg.tenantId || msg.to || "default-tenant";
  const db = createDb(env.DB);
  const safeDb = createSafeDb(db, { tenantId });

  // Determine timezone
  const tz = (await safeDb.businessSettings().findOne())?.timezone || "America/New_York";

  const parsed = parseCommand(msg.body || "");
  switch (parsed.type) {
    case "STATUS": {
      const status = await getOpenStatus(safeDb, tz);
      const text = status.isOpen
        ? status.nextCloseTime
          ? `We are OPEN. Closes at ${status.nextCloseTime}.`
          : `We are OPEN.`
        : status.reason
          ? `We are CLOSED: ${status.reason}`
          : status.nextOpenTime
            ? `We are CLOSED. Next open at ${status.nextOpenTime}.`
            : `We are CLOSED.`;
      return { response: text };
    }
    case "OUT_OF_STOCK": {
      const updated = await markItemAvailability(env, tenantId, parsed.item, false);
      return { response: updated ? `86'd ${updated}` : `Could not find item '${parsed.item}'.` };
    }
    case "OPEN_LATE": {
      const ok = await extendHours(env, tenantId, tz, parsed.until);
      return { response: ok ? `Extended today's closing time to ${parsed.until}.` : `Failed to update hours.` };
    }
    default:
      return { response: "Got it! Your message has been received." };
  }
}

export function parseCommand(body: string):
  | { type: "STATUS" }
  | { type: "OUT_OF_STOCK"; item: string }
  | { type: "OPEN_LATE"; until: string }
  | { type: "UNKNOWN" } {
  const text = body.toLowerCase();

  if (/are you open|open\?/i.test(body)) {
    return { type: "STATUS" };
  }

  const match86 = text.match(/^(?:86|out of)\s+(.+)/);
  if (match86) {
    return { type: "OUT_OF_STOCK", item: match86[1].trim() };
  }

  const matchLate = text.match(/open (?:late )?(?:until|till)\s+([0-9]{1,2}(:[0-9]{2})?\s?(am|pm)?)/);
  if (matchLate) {
    return { type: "OPEN_LATE", until: normalizeTime(matchLate[1]) };
  }

  return { type: "UNKNOWN" };
}

function normalizeTime(raw: string): string {
  return raw.trim().toUpperCase();
}

async function markItemAvailability(env: Env, tenantId: string, query: string, isAvailable: boolean): Promise<string | null> {
  const db = env.DB;
  const all = await db
    .prepare("SELECT id, name FROM menu_items WHERE tenantId = ? AND deletedAt IS NULL")
    .bind(tenantId)
    .all<{ id: number; name: string }>();
  if (!all || !all.results || all.results.length === 0) return null;

  const best = pickBestMatch(all.results, query);
  if (!best) return null;

  await db
    .prepare("UPDATE menu_items SET isAvailable = ? WHERE id = ? AND tenantId = ?")
    .bind(isAvailable ? 1 : 0, best.id, tenantId)
    .run();

  return best.name;
}

async function extendHours(env: Env, tenantId: string, tz: string, until: string): Promise<boolean> {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
  const dayStr = formatter.format(now); // Mon, Tue ...
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[dayStr.slice(0, 3)];
  if (day === undefined) return false;

  const update = await env.DB
    .prepare(`UPDATE operating_hours SET endTime = ? WHERE tenantId = ? AND dayOfWeek = ?`)
    .bind(until, tenantId, day)
    .run();

  // If no row updated, insert a new shift
  if ((update.meta?.changes ?? 0) === 0) {
    await env.DB
      .prepare(
        `INSERT INTO operating_hours (tenantId, dayOfWeek, startTime, endTime)
         VALUES (?, ?, '06:00', ?)`
      )
      .bind(tenantId, day, until)
      .run();
  }
  return true;
}

export function pickBestMatch(items: { id: number; name: string }[], query: string) {
  const q = query.toLowerCase();
  let best: { id: number; name: string } | null = null;
  let bestScore = -1;
  for (const item of items) {
    const name = item.name.toLowerCase();
    if (name.includes(q)) {
      const score = q.length / name.length;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    } else {
      const score = similarity(name, q);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
  }
  return best;
}

// Simple similarity metric based on longest common substring length
function similarity(a: string, b: string): number {
  const m: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  let longest = 0;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        const val = (m[i - 1]?.[j - 1] ?? 0) + 1;
        const row = m[i];
        if (row) row[j] = val;
        if (val > longest) longest = val;
      }
    }
  }
  return longest / Math.max(a.length, b.length, 1);
}
