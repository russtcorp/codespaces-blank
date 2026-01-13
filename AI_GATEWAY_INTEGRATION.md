# AI Gateway Integration Guide

## Overview

This guide walks through integrating Cloudflare AI Gateway with Workers AI to reduce costs and add per-tenant rate limiting for the Diner Agent service.

---

## Phase 1: Setup (Now)

### 1.1 Create AI Gateway in Cloudflare Dashboard

1. Go to **Cloudflare Dashboard** → **AI** → **AI Gateway**
2. Click **Create**
3. Enter name: `diner-ai-gateway`
4. Select **Workers AI** as the origin
5. Click **Create**
6. Copy the **Gateway URL** (looks like: `https://api.ai.cloudflare.com/v1/accounts/{account-id}/ai_gateway/`)
7. Generate an **API Token** with scope: `Workers AI:Edit`
8. Copy token and update `.dev.vars`:
   ```bash
   CLOUDFLARE_AI_GATEWAY_URL=https://api.ai.cloudflare.com/v1/accounts/{account-id}/ai_gateway/
   CLOUDFLARE_AI_GATEWAY_TOKEN=your-token-here
   ```

### 1.2 Configure Rate Limits in AI Gateway Dashboard

1. In the AI Gateway settings, go to **Rate Limiting**
2. Add rule:
   - **Identifier:** Tenant ID (from header)
   - **Limit:** 10 requests/minute per tenant
   - **Action:** Queue or Reject

### 1.3 Enable Caching

1. Go to **Caching** settings
2. Enable **Request Deduplication:**
   - TTL: 5 minutes (for identical prompts)
3. Enable **Response Caching:**
   - TTL: 300 seconds for inference results

---

## Phase 2: Implementation (Week 1)

### 2.1 Create AI Gateway Client Wrapper

**File:** `services/agent/src/clients/ai-gateway.ts`

```typescript
import type { Env } from '../types';

export interface AIGatewayRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream?: boolean;
  tenantId?: string;
}

/**
 * Proxy requests through Cloudflare AI Gateway for:
 * - Request caching (identical prompts)
 * - Per-tenant rate limiting
 * - Cost attribution
 * - Request logging
 */
export async function callAIGateway(req: AIGatewayRequest, env: Env) {
  const gatewayUrl = env.CLOUDFLARE_AI_GATEWAY_URL;
  const gatewayToken = env.CLOUDFLARE_AI_GATEWAY_TOKEN;

  if (!gatewayUrl || !gatewayToken) {
    throw new Error('AI Gateway not configured. Falling back to direct Workers AI.');
  }

  const headers = new Headers({
    'Authorization': `Bearer ${gatewayToken}`,
    'Content-Type': 'application/json',
    ...(req.tenantId && { 'X-Tenant-ID': req.tenantId }),
  });

  const response = await fetch(`${gatewayUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      stream: req.stream ?? false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI Gateway error: ${response.status} ${error}`);
  }

  return response;
}

/**
 * Stream response from AI Gateway (for web chat UI)
 */
export async function streamAIGateway(req: AIGatewayRequest, env: Env) {
  const response = await callAIGateway({ ...req, stream: true }, env);
  return response.body; // Return ReadableStream
}

/**
 * Get non-streaming response (for simple queries)
 */
export async function queryAIGateway(req: AIGatewayRequest, env: Env) {
  const response = await callAIGateway(req, env);
  return response.json();
}
```

### 2.2 Update Agent Handler

**File:** `services/agent/src/handlers/chat.ts`

```typescript
import { streamAIGateway, queryAIGateway } from '../clients/ai-gateway';
import type { Env } from '../types';

export async function handleWebChat(request: Request, env: Env, tenantId: string) {
  const body = await request.json();
  const { messages } = body;

  // Use AI Gateway instead of direct Workers AI
  const stream = await streamAIGateway(
    {
      model: 'llama-3-8b-instruct',
      messages: [
        {
          role: 'system',
          content: `You are a helpful diner manager assistant. Respond only to diner management tasks.
Forbidden: taking customer orders, financial advice, personal information collection.
You have access to a database of menu items and operating hours.`,
        },
        ...messages,
      ],
      tenantId,
    },
    env,
  );

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

export async function handleSMSCommand(smsText: string, env: Env, tenantId: string) {
  // For SMS, use simpler non-streaming response
  const result = await queryAIGateway(
    {
      model: 'llama-3-8b-instruct',
      messages: [
        {
          role: 'system',
          content: `Parse this diner management command concisely. Output: action (update_price|toggle_available|change_hours|close_emergency), target (item_name or time), value.`,
        },
        { role: 'user', content: smsText },
      ],
      tenantId,
    },
    env,
  );

  return result.choices[0]?.message?.content;
}
```

### 2.3 Update Wrangler Config

**File:** `services/agent/wrangler.toml`

```toml
# ... existing config ...

[env.production]
vars = { CLOUDFLARE_AI_GATEWAY_URL = "https://api.ai.cloudflare.com/v1/accounts/{your-account-id}/ai_gateway/" }

[[env.production.vars]]
name = "CLOUDFLARE_AI_GATEWAY_TOKEN"
# Set via `wrangler secret put CLOUDFLARE_AI_GATEWAY_TOKEN` in production
```

---

## Phase 3: Monitoring & Optimization (Week 2)

### 3.1 Add Metrics Collection

Create telemetry wrapper to track:
- Cache hit rate
- Requests per tenant
- Response latency
- Cost per tenant

**File:** `services/agent/src/clients/ai-gateway-metrics.ts`

```typescript
export interface AIMetrics {
  tenantId: string;
  model: string;
  cacheHit: boolean;
  latency_ms: number;
  tokens_used?: number;
  cost_usd?: number;
  timestamp: string;
}

export async function logAIMetric(metric: AIMetrics, env: Env) {
  // Write to D1 or R2 for analysis
  // This enables billing per tenant + usage alerts
  const date = new Date().toISOString().slice(0, 10);
  const key = `ai-metrics/${date}/${metric.tenantId}.jsonl`;

  await env.R2.put(key, JSON.stringify(metric) + '\n', {
    customMetadata: { tenantId: metric.tenantId },
  });
}
```

### 3.2 Dashboard Analytics Query

**File:** `apps/admin/routes/admin.ai-usage.tsx`

```typescript
export async function loader({ context }) {
  const env = context.env;
  const today = new Date().toISOString().slice(0, 10);
  const metricsKey = `ai-metrics/${today}/`;

  // List all metrics for today
  const list = await env.R2.list({ prefix: metricsKey });

  const metrics = await Promise.all(
    list.objects.map(async (obj) => {
      const data = await env.R2.get(obj.key);
      return JSON.parse(await data.text());
    }),
  );

  // Aggregate by tenant
  const byTenant = metrics.reduce((acc, m) => {
    if (!acc[m.tenantId]) acc[m.tenantId] = { count: 0, totalCost: 0, cacheHits: 0 };
    acc[m.tenantId].count++;
    acc[m.tenantId].totalCost += m.cost_usd || 0;
    if (m.cacheHit) acc[m.tenantId].cacheHits++;
    return acc;
  }, {});

  return { byTenant };
}
```

---

## Phase 4: Fallback Strategy

If AI Gateway is unavailable, fall back to direct Workers AI:

**File:** `services/agent/src/clients/ai-gateway.ts` (updated)

```typescript
export async function callAIGateway(req: AIGatewayRequest, env: Env) {
  const gatewayUrl = env.CLOUDFLARE_AI_GATEWAY_URL;
  const gatewayToken = env.CLOUDFLARE_AI_GATEWAY_TOKEN;

  // Fallback if not configured
  if (!gatewayUrl || !gatewayToken) {
    console.warn('AI Gateway not configured, using direct Workers AI');
    return callWorkersAIDirect(req, env);
  }

  try {
    const response = await fetch(`${gatewayUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gatewayToken}`,
        'Content-Type': 'application/json',
        ...(req.tenantId && { 'X-Tenant-ID': req.tenantId }),
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        stream: req.stream ?? false,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway returned ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('AI Gateway failed, falling back to Workers AI:', error);
    return callWorkersAIDirect(req, env);
  }
}

async function callWorkersAIDirect(req: AIGatewayRequest, env: Env) {
  // Direct Workers AI call as backup
  const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: req.messages,
    stream: req.stream ?? false,
  });

  return new Response(JSON.stringify(response));
}
```

---

## Expected Benefits

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| **Cost per LLM request** | $0.0025 | $0.00075 | 70% ↓ |
| **Latency (cached)** | 800ms | 50ms | 94% ↓ |
| **Per-tenant visibility** | ❌ None | ✅ Full | New |
| **Rate limit enforcement** | Manual | Automatic | Time ↓ |

---

## Testing

### Local Testing

```bash
# Test AI Gateway integration
curl -X POST http://localhost:8791/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant-test" \
  -d '{
    "messages": [
      {"role": "user", "content": "How do I mark coffee as sold out?"}
    ]
  }'
```

### Production Validation

1. Deploy `services/agent` to Cloudflare Workers
2. Monitor AI Gateway dashboard for cache hit rate
3. Verify per-tenant rate limiting is working
4. Check R2 metrics for cost attribution

---

## FAQ

**Q: Will this change the user experience?**  
A: No. Users won't notice—it's transparent. Actual responses may be faster due to caching.

**Q: What if AI Gateway is down?**  
A: Automatic fallback to direct Workers AI. No service interruption.

**Q: Can I use this with voice/vision?**  
A: AI Gateway currently supports chat models. Vision/Whisper still use Workers AI directly.

**Q: How do I estimate cost savings?**  
A: If 70% of prompts are duplicated (common in multi-tenant SaaS), you save 70% on AI costs.
