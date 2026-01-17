# Diner SaaS Deployment Checklist

## ✅ COMPLETED WITH WRANGLER

All infrastructure resources have been created and configured using `wrangler` CLI. Resource IDs have been updated in all `wrangler.toml` files.

### Database (D1)
- ✅ **Created:** `diner-core` database
- ✅ **ID:** `67be05e6-6d3d-45f4-bba6-b2b7450c919f`
- ✅ **Schema Applied:** 21 SQL statements executed, 33 rows read, 43 rows written
- ✅ **Tables:** tenants, theme_config, business_settings, authorized_users, operating_hours, special_dates, menu_items, categories, sessions, host_mapping

### Object Storage (R2)
- ✅ **Bucket:** `diner-assets` (already existed)
- ✅ **Updated in:** all `wrangler.toml` files

### Key-Value Storage (KV)
- ✅ **Created:** `diner-cache` namespace
- ✅ **ID:** `6fdb42f00f674f9b8fbb2dab755f3279`
- ✅ **Updated in:** all `wrangler.toml` files

### Queues (4x)
- ✅ `sms-inbound` - For inbound SMS messages
- ✅ `sms-outbound` - For outbound SMS delivery
- ✅ `social-media-sync` - For Instagram/social sync jobs
- ✅ `roi-reports` - For weekly ROI email reports

### Vectorize (Semantic Search)
- ✅ **Created:** `diner-menu-index`
- ✅ **Dimensions:** 768
- ✅ **Metric:** cosine
- ✅ **Already configured in:** `apps/agent/wrangler.toml`

### Updated wrangler.toml Files
- ✅ `apps/public/wrangler.toml` - D1 ID + KV ID
- ✅ `apps/store/wrangler.toml` - D1 ID + KV ID
- ✅ `apps/admin/wrangler.toml` - D1 ID + KV ID
- ✅ `apps/agent/wrangler.toml` - D1 ID + KV ID
- ✅ `services/jobs/wrangler.toml` - D1 ID + KV ID
- ✅ `services/workflows/wrangler.toml` - D1 ID

---

## 📋 REMAINING MANUAL STEPS

### 1. **Set Secrets in Cloudflare** (Required for deployment)

You must set these secrets using `wrangler secret put` before deploying:

```bash
export CLOUDFLARE_API_TOKEN="yJVHw7pLCiIX0LFnTR-a5nreZfPTbIPfVEs8Zgf3"

# Authentication secrets
wrangler secret put SESSION_SECRET
wrangler secret put MAGIC_LINK_SECRET

# Stripe (Payment)
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# Twilio (SMS/Voice)
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER

# Instagram (Social sync)
wrangler secret put INSTAGRAM_CLIENT_ID
wrangler secret put INSTAGRAM_CLIENT_SECRET

# Cloudflare API (for custom domains in workflows)
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put CLOUDFLARE_API_TOKEN

# Email delivery
wrangler secret put MAILCHANNELS_API_TOKEN
# OR
wrangler secret put RESEND_API_KEY

# Turnstile (Bot protection for Store Dashboard)
wrangler secret put TURNSTILE_SITE_KEY
wrangler secret put TURNSTILE_SECRET_KEY

# Google Services (optional, for Google Maps integration)
wrangler secret put GOOGLE_PLACES_API_KEY

# OpenAI (fallback if Workers AI quota exceeded)
wrangler secret put OPENAI_API_KEY
```

**Per-app secrets:**

```bash
# For Store app
cd apps/store
wrangler secret put SITE_URL  # e.g., https://store.example.com

# For Admin app (needs access to all projects)
cd apps/admin
wrangler secret put ADMIN_EMAIL
```

### 2. **Deploy Workers & Pages**

In strict order (due to binding dependencies):

```bash
export CLOUDFLARE_API_TOKEN="yJVHw7pLCiIX0LFnTR-a5nreZfPTbIPfVEs8Zgf3"

# Step 1: Deploy Agent Worker (Durable Object)
cd apps/agent
pnpm install
wrangler deploy

# Step 2: Deploy Workflows service
cd ../services/workflows
pnpm install
wrangler deploy

# Step 3: Deploy Jobs service (after workflows exists)
cd ../services/jobs
pnpm install
wrangler deploy

# Step 4: Deploy Store Dashboard (after agent exists)
cd ../apps/store
pnpm install
pnpm build
wrangler pages deploy build/client

# Step 5: Deploy Admin Dashboard (after agent + workflows exist)
cd ../apps/admin
pnpm install
pnpm build
wrangler pages deploy build/client

# Step 6: Deploy Public Site
cd ../apps/public
pnpm install
pnpm build
wrangler pages deploy build/client
```

### 3. **Create Doomsday Snapshots** (For R2 fallback)

After public site is deployed:

```bash
cd apps/public

# Generate static snapshot for fallback
pnpm build:snapshot

# Upload to R2 bucket
wrangler r2 object put diner-assets/fallback/index.html \
  --file=./build/doomsday/index.html
```

### 4. **Configure Custom Domains** (Optional but recommended)

For each tenant, you'll want to add custom domains. This is done via the Admin Dashboard after deployment. The workflows service handles Cloudflare for SaaS SSL certificate creation automatically.

### 5. **Set Up Email Delivery**

Choose one:

**Option A: MailChannels**
```bash
# Set DNS record for SPF
# TXT @ v=spf1 include:relay.mailchannels.net ~all

# Add DKIM for your mail domain (get from MailChannels dashboard)
```

**Option B: Resend**
```bash
# Just set RESEND_API_KEY secret (already done above)
```

### 6. **Set Up Stripe Webhooks** (For billing)

1. Go to Stripe Dashboard → Webhooks
2. Add webhook endpoint pointing to your API
3. Set `STRIPE_WEBHOOK_SECRET` (already done above)

### 7. **Set Up Twilio Webhooks** (For SMS/Voice)

1. Go to Twilio Console
2. Configure webhook URLs:
   - SMS: `https://agent-worker.example.com/sms`
   - Voice: `https://agent-worker.example.com/voice`
3. Verify webhook signatures using `TWILIO_AUTH_TOKEN` (already done above)

### 8. **Enable Observability** (Optional)

Observability is already enabled in `wrangler.toml` files. To view logs:

```bash
wrangler tail agent-worker
wrangler tail diner-store
wrangler tail diner-admin
wrangler tail diner-public
wrangler tail diner-jobs
wrangler tail diner-workflows
```

---

## 📊 DEPLOYMENT SUMMARY

### What's Ready Now
- ✅ All Cloudflare infrastructure (D1, R2, KV, Queues, Vectorize)
- ✅ All `wrangler.toml` files configured with resource IDs
- ✅ D1 schema applied and tested
- ✅ Code ready to deploy (all apps and services)

### What You Need to Do Before Deploy
1. Set all required secrets (see section "Set Secrets in Cloudflare")
2. Deploy in the correct order (see section "Deploy Workers & Pages")
3. Generate and upload doomsday snapshots
4. Configure email delivery (MailChannels or Resend)
5. Set up Stripe webhooks
6. Set up Twilio webhooks
7. Add custom domains via Admin Dashboard

### Estimated Time
- **Infrastructure setup (done):** ~10 minutes ✅
- **Set secrets:** ~5 minutes
- **Deploy all workers/pages:** ~10 minutes
- **Email + webhook setup:** ~10 minutes
- **Total remaining:** ~25 minutes

---

## 🔐 Resource IDs Reference

Save these for future use:

```
D1 Database:
  ID: 67be05e6-6d3d-45f4-bba6-b2b7450c919f
  Name: diner-core

R2 Bucket:
  Name: diner-assets
  (no explicit ID needed)

KV Namespace:
  ID: 6fdb42f00f674f9b8fbb2dab755f3279
  Name: diner-cache

Queues:
  sms-inbound
  sms-outbound
  social-media-sync
  roi-reports

Vectorize Index:
  Name: diner-menu-index
  Dimensions: 768
  Metric: cosine

Account ID:
  f482c5983695e4c0e3d5098a5727232b
```

---

## 🚀 After Deployment

1. **Test public site:** Visit `https://demo.diner-saas.com` or your custom domain
2. **Test store dashboard:** Log in with magic link
3. **Test admin onboarding:** Upload a website URL to scrape
4. **Monitor workers:** Use `wrangler tail` to watch logs
5. **Check analytics:** View in Cloudflare dashboard

---

## ⚠️ Important Notes

- **API Token Security:** Keep `CLOUDFLARE_API_TOKEN` secret. Never commit to git.
- **Secrets:** All secrets should be set per environment (production vs. staging)
- **D1 Backups:** Consider regular backups of D1 database
- **Rate Limiting:** Monitor queue depth and adjust concurrency if needed
- **Observability:** Logs are available in Cloudflare dashboard for 24 hours

---

## 📞 Support

If deployment fails:
1. Check `wrangler.toml` resource IDs match actual resources
2. Verify all secrets are set: `wrangler secret list`
3. Review worker logs: `wrangler tail <worker-name>`
4. Check Cloudflare dashboard for resource status

