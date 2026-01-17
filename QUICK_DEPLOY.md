# Quick Deploy Commands

## Copy-Paste Ready Commands

### 1. Set All Required Secrets

```bash
#!/bin/bash
export CLOUDFLARE_API_TOKEN="yJVHw7pLCiIX0LFnTR-a5nreZfPTbIPfVEs8Zgf3"

echo "Setting secrets for Agent Worker..."
cd /workspaces/codespaces-blank/apps/agent

# Core secrets (same for all workers)
wrangler secret put SESSION_SECRET
wrangler secret put MAGIC_LINK_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER
wrangler secret put INSTAGRAM_CLIENT_ID
wrangler secret put INSTAGRAM_CLIENT_SECRET
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put MAILCHANNELS_API_TOKEN
wrangler secret put OPENAI_API_KEY

echo ""
echo "Setting secrets for Workflows service..."
cd ../services/workflows
wrangler secret put SESSION_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put CLOUDFLARE_API_TOKEN

echo ""
echo "Setting secrets for Jobs service..."
cd ../jobs
wrangler secret put SESSION_SECRET
wrangler secret put MAILCHANNELS_API_TOKEN

echo ""
echo "Setting secrets for Store Dashboard..."
cd ../../apps/store
wrangler secret put TURNSTILE_SITE_KEY
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put SITE_URL

echo ""
echo "Setting secrets for Admin Dashboard..."
cd ../admin
# Admin inherits from parent but may need ADMIN_EMAIL
wrangler secret put ADMIN_EMAIL

echo ""
echo "✅ All secrets configured!"
```

### 2. Deploy All Workers & Pages (Correct Order!)

```bash
#!/bin/bash
export CLOUDFLARE_API_TOKEN="yJVHw7pLCiIX0LFnTR-a5nreZfPTbIPfVEs8Zgf3"
cd /workspaces/codespaces-blank

echo "📦 Step 1: Install dependencies..."
pnpm install

echo ""
echo "🚀 Step 2: Deploy Agent Worker (Durable Object)..."
cd apps/agent
pnpm build
wrangler deploy

echo ""
echo "🚀 Step 3: Deploy Workflows service..."
cd ../services/workflows
pnpm build
wrangler deploy

echo ""
echo "🚀 Step 4: Deploy Jobs service..."
cd ../jobs
pnpm build
wrangler deploy

echo ""
echo "🚀 Step 5: Build & Deploy Store Dashboard..."
cd ../../apps/store
pnpm build
wrangler pages deploy build/client

echo ""
echo "🚀 Step 6: Build & Deploy Admin Dashboard..."
cd ../admin
pnpm build
wrangler pages deploy build/client

echo ""
echo "🚀 Step 7: Build & Deploy Public Site..."
cd ../public
pnpm build
wrangler pages deploy build/client

echo ""
echo "✅ All deployments complete!"
```

### 3. Generate & Upload Doomsday Snapshots

```bash
#!/bin/bash
export CLOUDFLARE_API_TOKEN="yJVHw7pLCiIX0LFnTR-a5nreZfPTbIPfVEs8Zgf3"
cd /workspaces/codespaces-blank/apps/public

echo "🎬 Generating doomsday snapshot..."
pnpm build:snapshot

echo ""
echo "📤 Uploading to R2..."
wrangler r2 object put diner-assets/fallback/index.html \
  --file=./build/doomsday/index.html

echo ""
echo "✅ Doomsday snapshot uploaded!"
```

### 4. Verify Deployment

```bash
#!/bin/bash
export CLOUDFLARE_API_TOKEN="yJVHw7pLCiIX0LFnTR-a5nreZfPTbIPfVEs8Zgf3"

echo "🔍 Checking database..."
wrangler d1 list | grep diner-core

echo ""
echo "🔍 Checking queues..."
wrangler queues list

echo ""
echo "🔍 Checking Vectorize..."
wrangler vectorize list | grep diner-menu-index

echo ""
echo "🔍 Checking R2 bucket..."
wrangler r2 bucket list | grep diner-assets

echo ""
echo "🔍 Checking KV namespace..."
wrangler kv namespace list | grep diner-cache

echo ""
echo "✅ All infrastructure verified!"
```

### 5. Watch Logs

```bash
#!/bin/bash
export CLOUDFLARE_API_TOKEN="yJVHw7pLCiIX0LFnTR-a5nreZfPTbIPfVEs8Zgf3"

# Choose which worker to tail:
wrangler tail agent-worker
# OR
wrangler tail diner-store
# OR
wrangler tail diner-admin
# OR
wrangler tail diner-public
# OR
wrangler tail diner-jobs
# OR
wrangler tail diner-workflows
```

---

## What Each Command Does

| Command | Purpose |
|---------|---------|
| `wrangler secret put KEY` | Interactively set a secret (you'll be prompted to enter the value) |
| `wrangler deploy` | Deploy a Worker/service |
| `wrangler pages deploy` | Deploy a Pages project |
| `pnpm build` | Build the project (required before deploy) |
| `wrangler tail` | Stream real-time logs from a worker |
| `wrangler d1 list` | List all D1 databases |
| `wrangler queues list` | List all queues |

---

## Secrets Explained

### Authentication & Sessions
- `SESSION_SECRET` - Signing key for session cookies (generate random 64+ char string)
- `MAGIC_LINK_SECRET` - Signing key for magic link tokens (generate random 64+ char string)

### Payment
- `STRIPE_SECRET_KEY` - From Stripe Dashboard → API Keys
- `STRIPE_WEBHOOK_SECRET` - From Stripe Dashboard → Webhooks

### SMS/Voice
- `TWILIO_ACCOUNT_SID` - From Twilio Console
- `TWILIO_AUTH_TOKEN` - From Twilio Console  
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number (with country code)

### Social Media
- `INSTAGRAM_CLIENT_ID` - From Meta Developers Dashboard
- `INSTAGRAM_CLIENT_SECRET` - From Meta Developers Dashboard

### Cloudflare (for workflows)
- `CLOUDFLARE_ACCOUNT_ID` - Your account ID (already known: f482c5983695e4c0e3d5098a5727232b)
- `CLOUDFLARE_API_TOKEN` - Your API token (already known: yJVHw7pLCiIX0LFnTR-a5nreZfPTbIPfVEs8Zgf3)

### Email
- `MAILCHANNELS_API_TOKEN` - From MailChannels Dashboard (or use Resend instead)

### Bot Protection
- `TURNSTILE_SITE_KEY` - From Cloudflare Dashboard → Challenges
- `TURNSTILE_SECRET_KEY` - From Cloudflare Dashboard → Challenges

### URL Configuration
- `SITE_URL` - Public URL of store dashboard (e.g., https://store.example.com)

### Optional Fallback
- `OPENAI_API_KEY` - From OpenAI Dashboard (fallback if Workers AI quota exceeded)

---

## Troubleshooting

**"Couldn't find worker binding"**
- Make sure wrangler.toml has the resource ID (already fixed for you)
- Redeploy with `wrangler deploy`

**"D1 database not found"**
- Database ID must match: `67be05e6-6d3d-45f4-bba6-b2b7450c919f`
- Use `--remote` flag: `wrangler d1 execute diner-core --remote`

**"Secrets not set"**
- Verify: `wrangler secret list`
- Secrets are per-worker, set them in each worker directory

**"Pages deploy failed"**
- Make sure you ran `pnpm build` first
- Check build output in `build/client` directory exists

**"Service binding not found"**
- Deploy services in order: agent → workflows → jobs → pages
- Pages projects depend on workers being deployed first

