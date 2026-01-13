# Implementation Checklist: Cloudflare Service Integrations

## Quick Reference by Phase

---

## 🔴 PHASE 1: AI Gateway (Now - Week 1)

### Setup (30 mins)
- [ ] Create AI Gateway in Cloudflare Dashboard (`diner-ai-gateway`)
- [ ] Copy Gateway URL to `.dev.vars`: `CLOUDFLARE_AI_GATEWAY_URL`
- [ ] Generate & store API token: `CLOUDFLARE_AI_GATEWAY_TOKEN`
- [ ] Configure rate limits (10 req/min per tenant)
- [ ] Enable 5-min request caching

### Implementation (2-3 hours)
- [ ] Create `services/agent/src/clients/ai-gateway.ts`
- [ ] Update `services/agent/src/handlers/chat.ts` to use AI Gateway
- [ ] Add fallback to direct Workers AI if Gateway fails
- [ ] Update `services/agent/wrangler.toml` with Gateway config
- [ ] Add `X-Tenant-ID` header passing for rate limiting

### Testing (1 hour)
- [ ] Test local chat via `localhost:8791/api/chat`
- [ ] Verify rate limiting kicks in after 10 req/min
- [ ] Test fallback by disabling Gateway token
- [ ] Monitor cache hit rate in Gateway dashboard

### Validation ✅
- [ ] SMS commands work (Gateway or fallback)
- [ ] Web chat streams responses correctly
- [ ] Cost tracking in R2 metrics

**Expected Outcome:** 70% reduction in AI costs, per-tenant rate limits active

---

## 🟡 PHASE 2: Cloudflare Images (Phase 3: Weeks 5-6)

### Setup (15 mins)
- [ ] Get Cloudflare Images account hash from dashboard
- [ ] Add to `.dev.vars`:
  ```
  CLOUDFLARE_IMAGES_ACCOUNT_ID={account-id}
  CLOUDFLARE_IMAGES_HASH={hash}
  CLOUDFLARE_IMAGES_VARIANT=public
  ```
- [ ] No additional Cloudflare Dashboard config needed

### Implementation (2-3 hours)
- [ ] Create `packages/ui/components/OptimizedImage.tsx`:
  ```tsx
  export function OptimizedImage({ src, width, height, alt, ...props }) {
    const optimized = `/cdn-cgi/imagedelivery/${HASH}/${imageId}/w=${width}`;
    return <img src={optimized} alt={alt} {...props} />;
  }
  ```
- [ ] Replace all `<img>` tags in menu/theme components
- [ ] Add Save-Data header detection for AVIF fallback
- [ ] Update Store Dashboard image uploader to use Images service

### Testing (1 hour)
- [ ] Upload menu photo via dashboard
- [ ] Verify AVIF served on modern browsers
- [ ] Test with Save-Data header: `curl -H "Save-Data: on" <url>`
- [ ] Check WebP fallback on older browsers

### Validation ✅
- [ ] Menu photos load faster (measure LCP)
- [ ] R2 storage reduced (no pre-resizing needed)
- [ ] AVIF/WebP formats auto-negotiated

**Expected Outcome:** 30-40% faster image delivery, smaller R2 usage

---

## 🟡 PHASE 3: Email Sending (Phase 6: Weeks 11-12)

### Setup (15 mins)
- [ ] In Cloudflare Dashboard: **Email Sending** → Create Domain
- [ ] Verify domain ownership (add TXT records)
- [ ] Generate API token with Email Sending:Edit scope
- [ ] Add to `.dev.vars`: `CLOUDFLARE_EMAIL_API_TOKEN`

### Implementation (1-2 hours)
- [ ] Create `packages/email/src/cloudflare-email.ts`:
  ```typescript
  export async function sendTransactional(to: string, subject: string, html: string) {
    const response = await fetch('https://api.cloudflare.com/client/v4/accounts/{id}/email/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_EMAIL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        from: 'noreply@diner.local',
        subject,
        html,
      }),
    });
    return response.json();
  }
  ```
- [ ] Replace MailChannels calls with Email Sending for transactional emails (OTP, login confirmation)
- [ ] Keep MailChannels for template-heavy emails (ROI reports)

### Testing (1 hour)
- [ ] Send OTP email from login form
- [ ] Verify DKIM/SPF signed in recipient email headers
- [ ] Test rate limiting (100 emails/min per domain)

### Validation ✅
- [ ] Transactional emails deliver in < 1 sec
- [ ] Reduces dependency on third-party email services

**Expected Outcome:** Faster transactional email, simpler stack

---

## 🟢 PHASE 4: Turnstile (Phase 4: Weeks 7-8 - Optional)

### Setup (10 mins)
- [ ] Cloudflare Dashboard: **Turnstile** → Create Site
- [ ] Select "Managed" mode (Cloudflare handles bot detection)
- [ ] Copy Site Key & Secret Key to `.dev.vars`:
  ```
  CLOUDFLARE_TURNSTILE_SITE_KEY=
  CLOUDFLARE_TURNSTILE_SECRET_KEY=
  ```

### Implementation (1-2 hours)
- [ ] Add to login form (`apps/store/routes/_auth.login.tsx`):
  ```tsx
  import { Turnstile } from '@cloudflare/turnstile-react';
  
  <Turnstile sitekey={SITE_KEY} onSuccess={(token) => setToken(token)} />
  ```
- [ ] Verify token on server before issuing session

### Testing (30 mins)
- [ ] Test with bot user-agent → blocked
- [ ] Test with real browser → success

**Expected Outcome:** Prevents brute-force login attacks, better UX than CAPTCHA

---

## 🟢 PHASE 5: Pub/Sub (Phase 7: Weeks 13-14 - Optional, if polling bottleneck)

### Setup (20 mins)
- [ ] Cloudflare Dashboard: **Pub/Sub** → Create Namespace
- [ ] Name: `diner-updates`
- [ ] Add to `.dev.vars`: `CLOUDFLARE_PUBSUB_NAMESPACE=diner-updates`

### Implementation (3-4 hours)
- [ ] Create `services/jobs/src/pubsub/menu-updates.ts`:
  ```typescript
  export async function broadcastMenuUpdate(tenantId: string, env: Env) {
    const namespace = env.PUBSUB.get(PUBSUB_NAMESPACE);
    await namespace.publish('menu-changed', JSON.stringify({ tenantId }));
  }
  ```
- [ ] Subscribe in public site loader:
  ```typescript
  // Instead of checking KV cache every 60s, listen to Pub/Sub
  const subscription = namespace.subscribe('menu-changed');
  subscription.on('message', () => revalidate());
  ```

### Testing (1 hour)
- [ ] Change menu in Store Dashboard
- [ ] Verify Pub/Sub broadcast triggers
- [ ] Check visitor site auto-refreshes

**Expected Outcome:** Real-time menu updates instead of polling every 60s

---

## 🟢 PHASE 6: Vectorize (Phase 7: Weeks 13-14 - Optional, for semantic search)

### Setup (15 mins)
- [ ] Cloudflare Dashboard: **Vectorize** → Create Index
- [ ] Name: `diner-menu`
- [ ] Dimension: 1536 (for `@cf/baai/bge-base-en-v1.5`)
- [ ] Add to `.dev.vars`: `CLOUDFLARE_VECTORIZE_INDEX=diner-menu`

### Implementation (4-5 hours)
- [ ] Create `packages/ai/src/vectorize.ts`:
  ```typescript
  export async function indexMenuItem(item: MenuItem, env: Env) {
    const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: `${item.name} ${item.description}`,
    });
    
    await env.VECTORIZE.insert({
      id: `${item.tenantId}:${item.id}`,
      values: embedding.data[0],
      metadata: { tenantId: item.tenantId, itemId: item.id },
    });
  }
  ```
- [ ] Add semantic search to public site:
  ```typescript
  export async function searchMenu(query: string, tenantId: string, env: Env) {
    const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: query });
    const results = await env.VECTORIZE.query(queryEmbedding.data[0], {
      filter: { tenantId },
      limit: 10,
    });
    return results;
  }
  ```

### Testing (1 hour)
- [ ] Search "pumpkin" → returns "Pumpkin Pie" + "Pumpkin Spice Latte"
- [ ] Measure latency (should be < 200ms)

**Expected Outcome:** AI-powered menu search, better UX

---

## 🟢 PHASE 7: Page Shield (Phase 8: Week 15 - Optional, Security)

### Setup (5 mins)
- [ ] Cloudflare Dashboard: **Page Shield** → Enable
- [ ] No configuration needed

### Implementation (0 hours)
- [ ] Page Shield runs automatically on all pages
- [ ] Monitor for malicious scripts in Admin Dashboard

### Validation ✅
- [ ] Get alerted if unauthorized scripts injected
- [ ] Review quarantined scripts in dashboard

**Expected Outcome:** Prevents unauthorized third-party scripts

---

## Cloudflare Services NOT Needed ❌

| Service | Why | Alternative |
|---------|-----|-------------|
| Cloudflare Calls | SMS/voice already via Twilio + Workers AI (Whisper) | Twilio (10DLC ready) |
| Address Maps | SaaS doesn't need IP-to-address mapping | Not applicable |
| SSO Connector | Cloudflare Access is simpler for admin auth | Cloudflare Access |
| Browser Rendering | Already planned in Master Plan (Package scraper) | Puppeteer via package |

---

## Cost Breakdown (Annual)

| Integration | Effort | Cost Impact | ROI Breakeven |
|------------|--------|------------|--------------|
| **AI Gateway** | Low (1-2 days) | Save $55k @ 100 tenants | Month 1 |
| **Cloudflare Images** | Medium (2-3 days) | Save $2k | Month 2 |
| **Email Sending** | Low (1-2 days) | Save $0.5k | Month 3 |
| **Pub/Sub** | High (3-5 days) | Save $1k | Month 4 |
| **Vectorize** | High (4-5 days) | Save $2k (reduced compute) | Month 6 |
| **Turnstile** | Low (1-2 days) | Save $0.2k (no third-party CAPTCHAs) | Month 4 |

**Total Estimated Savings: $60k+/year @ scale**  
**Total Implementation Time: 15-20 days**

---

## Next Steps

1. **Now:** Set up AI Gateway (30 mins setup, 2-3 hours implementation)
2. **Week 1:** Test & validate AI Gateway cost savings
3. **Week 2-3:** Integrate Cloudflare Images
4. **Week 4-5:** Plan Phase 6 (Admin/Scaling) with other services ready
5. **Ongoing:** Monitor cost savings & usage in dashboards

---

## Support Links

- [AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)
- [Cloudflare Images Docs](https://developers.cloudflare.com/images/)
- [Pub/Sub Docs](https://developers.cloudflare.com/pub-sub/)
- [Vectorize Docs](https://developers.cloudflare.com/vectorize/)
- [Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Email Sending Docs](https://developers.cloudflare.com/email-sending/)
- [Page Shield Docs](https://developers.cloudflare.com/page-shield/)
