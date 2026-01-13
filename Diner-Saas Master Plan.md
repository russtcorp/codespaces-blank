# **Master Plan v9.0: Diner SaaS (Definitive Expanded Golden Master)**

This document is the absolute blueprint for the Diner SaaS platform. It expands substantially on previous versions to provide not just the specifications, but the strategic reasoning, architectural implications, and implementation details necessary for a flawless "Cloudflare Native" execution.

## **1\. Executive Summary & Strategic Vision**

**The Product:** A Multi-Tenant SaaS platform designed specifically to host hundreds of rural diner websites from a single, unified codebase. This is not just a website builder; it is an "Operating System" for small diners, managing their online presence, menu availability, and customer interactions through automation.

**The Strategy:** "Cloudflare Native." We strictly adhere to a "Buy over Build" philosophy regarding infrastructure. We utilize the **Workers Paid Plan** ecosystem to eliminate custom server maintenance, scaling headaches, and high fixed costs. Every component—from the database to the AI brain—runs on the Edge.

### **The Ecosystem: A Holistic View**

* **Public Site (The Storefront):** A high-performance, offline-first Progressive Web App (PWA) built with Remix and Cloudflare Pages. It features a "Doomsday" resiliency protocol, ensuring that even if the database fails, a static snapshot serves the menu. It is designed for rural internet speeds, utilizing aggressive caching and lightweight assets.  
* **Store Dashboard (The Cockpit):** A secure Tenant Portal (Remix \+ Workers) where owners manage operations. It offers two modes of interaction: a traditional Visual GUI for granular control and an AI Manager for natural language updates (e.g., texting "86 the soup" to update the site).  
* **Omni-Channel Agent (The Brain):** A stateful AI entity built on **Durable Objects**. It synchronizes context across SMS, Voice, and Web Chat. It remembers conversation history, understands menu context, and acts as a firewall between the owner and repetitive customer queries.  
* **Async Processing (The Muscle):** **Cloudflare Queues** handle heavy lifting—such as marketing blasts, image optimization, and rigorous logging—decoupling these tasks from the user-facing request loop to ensure instant UI responsiveness.

### **The Architecture: Technical Pillars**

* **Compute:**  
  * **Workers:** Stateless execution for API endpoints and Server-Side Rendering (SSR). They handle the heavy lifting of routing and request processing.  
  * **Durable Objects:** Stateful, single-threaded entities that act as the "brain" for each diner. They guarantee strong consistency, critical for chat history and inventory management where race conditions must be avoided.  
  * **Workflows:** Durable orchestration for multi-step processes like onboarding, ensuring that if a step fails (e.g., scraping), it retries automatically without losing state.  
  * **Browser Rendering:** Headless browser instances running on the edge, used specifically for scraping legacy websites during the onboarding phase.  
* **Data:**  
  * **D1 (SQL):** The relational backbone for business data (Tenants, Menus, Hours). It provides the familiarity of SQL with the scalability of the Edge.  
  * **R2 (Object Storage):** Low-cost storage for assets (Photos), static fallbacks (Doomsday snapshots), and the Data Catalog (Logs). It replaces S3 with zero egress fees.  
  * **Vectorize:** The semantic memory bank. It stores embeddings of menu items, allowing the AI to understand fuzzy queries like "Do you have anything spicy?" by measuring semantic distance rather than just keyword matching.  
* **Media:**  
  * **Cloudflare Images:** Handles storage, resizing, and format optimization (AVIF/WebP) automatically. It serves as a CDN for all visual assets.  
  * **Satori:** A library running on Workers to dynamically generate Open Graph social images (e.g., for Facebook/Twitter links) using JSX templates, ensuring every shared link looks professional.  
* **Network:**  
  * **Email Routing:** Virtualizes email addresses (e.g., info@joesdiner.com) to forward to owners' real inboxes, allowing us to offer professional branding without managing mail servers.  
  * **Cloudflare for SaaS:** Automates SSL certificate issuance and lifecycle management for custom domains (e.g., joesdiner.com), a critical feature for a white-label platform.  
  * **WAF (Aggregator Shield):** Custom firewall rules specifically tuned to identify and block scrapers from third-party delivery apps (DoorDash, UberEats), protecting our tenants' data sovereignty.

## **2\. Comprehensive Database Schema (D1 \+ Vectorize)**

**Primary Source of Truth:** D1 (SQLite). This schema is strictly typed and designed for multi-tenancy. Every query *must* be scoped by tenant\_id to prevent data leakage.

\-- TENANTS & CONFIG  
\-- Core identity table. The 'slug' is used for the subdomain (joes.diner-saas.com),  
\-- while 'custom\_domain' manages the production URL.  
CREATE TABLE tenants (  
  id TEXT PRIMARY KEY,  
  slug TEXT UNIQUE, \-- e.g., "joes-diner"  
  custom\_domain TEXT UNIQUE, \-- e.g., "joesdiner.com"  
  business\_name TEXT,  
  google\_place\_id TEXT, \-- Critical for Google Maps API sync  
  stripe\_subscription\_id TEXT,  
  subscription\_status TEXT, \-- 'active', 'past\_due', 'trial', 'cancelled'  
  version\_channel TEXT DEFAULT 'stable', \-- 'beta' allows canary deployments of new features  
  status TEXT DEFAULT 'building', \-- Tracks onboarding progress  
  email\_alias TEXT, \-- "info@joesdiner.com" managed by Email Routing  
  created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
  deleted\_at DATETIME \-- Soft delete for data retention compliance  
);

\-- THEME CONFIG (Restored Logo)  
\-- Controls the look and feel. CSS is injected via Remix Resource Routes.  
CREATE TABLE theme\_config (  
  tenant\_id TEXT PRIMARY KEY,  
  primary\_color TEXT, \-- Hex code used for buttons/accents  
  secondary\_color TEXT, \-- Hex code for backgrounds  
  font\_heading TEXT, \-- Mapped internally to Cloudflare Fonts (privacy-preserving)  
  font\_body TEXT,  
  layout\_style TEXT, \-- "grid", "list", "print" (affects CSS grid/flexbox classes)  
  logo\_image\_cf\_id TEXT, \-- Restored from Original Plan: The navbar logo  
  hero\_image\_cf\_id TEXT, \-- The large splash image on the homepage  
  custom\_css TEXT \-- Emergency override field for hot-fixing visual bugs  
);

\-- AUTH & USERS  
\-- Manages access to the Store Dashboard. Supports multiple users per tenant.  
CREATE TABLE authorized\_users (  
  id INTEGER PRIMARY KEY,  
  tenant\_id TEXT,  
  phone\_number TEXT, \-- Primary key for SMS Auth and Agent recognition  
  email TEXT, \-- Primary key for Magic Link login  
  name TEXT,  
  role TEXT, \-- 'owner' (full access), 'manager' (restricted)  
  permissions TEXT, \-- JSON array: \["menu\_full", "hours\_edit", "analytics\_view"\]  
  notification\_preferences TEXT, \-- JSON: {"sms\_reviews": "5\_star\_only", "sms\_marketing": false}  
  security\_challenge\_code TEXT, \-- 6-digit OTP Code for 2FA actions  
  last\_login DATETIME,  
  deleted\_at DATETIME  
);

\-- BUSINESS SETTINGS (Restored Contact Info)  
\-- SEO and operational metadata.  
CREATE TABLE business\_settings (  
  tenant\_id TEXT PRIMARY KEY,  
  address TEXT, \-- Restored: Critical for Schema.org JSON-LD and Footer  
  phone\_public TEXT, \-- Restored: Displayed on the "Call" button  
  timezone TEXT DEFAULT 'America/New\_York', \-- Critical for accurate "Open/Closed" logic  
  is\_hiring BOOLEAN DEFAULT 0, \-- Toggles the global "Now Hiring" banner  
  marketing\_pixels TEXT, \-- JSON: {"facebook": "PIXEL\_ID", "google": "TAG\_ID"} for Zaraz  
  emergency\_close\_reason TEXT, \-- If populated, overrides all schedule logic to CLOSED  
  emergency\_reopen\_time DATETIME \-- Auto-clears the emergency status at this time  
);

\-- OPERATING HOURS  
\-- Supports sophisticated scheduling including "Split Shifts" (e.g., closing between lunch and dinner).  
CREATE TABLE operating\_hours (  
  id INTEGER PRIMARY KEY,  
  tenant\_id TEXT,  
  day\_of\_week INTEGER, \-- 0 (Sunday) to 6 (Saturday)  
  start\_time TEXT, \-- "06:00" (24-hour format)  
  end\_time TEXT \-- "11:00"  
  \-- Note: Multiple rows per tenant/day are allowed.  
  \-- Example: Rows for Monday 06:00-11:00 AND Monday 17:00-22:00 create a split shift.  
);

\-- SPECIAL DATES  
\-- Overrides standard operating hours for holidays or specific events.  
CREATE TABLE special\_dates (  
  id INTEGER PRIMARY KEY,  
  tenant\_id TEXT,  
  date\_iso TEXT, \-- "2024-12-25"  
  status TEXT, \-- "closed", "open", "limited"  
  reason TEXT \-- Displayed to the user: "Closed for Christmas"  
);

\-- MENU ITEMS  
\-- The core product catalog.  
CREATE TABLE menu\_items (  
  id INTEGER PRIMARY KEY,  
  tenant\_id TEXT,  
  category\_id INTEGER,  
  name TEXT,  
  description TEXT,  
  price DECIMAL(10,2),  
  image\_cf\_id TEXT, \-- Cloudflare Images ID  
  is\_available BOOLEAN DEFAULT 1, \-- The "86" toggle. 0 \= Hidden/Strikethrough  
  dietary\_tags TEXT, \-- JSON array: \["GF", "V", "N"\]  
  dietary\_tags\_verified BOOLEAN DEFAULT 0, \-- Liability Flag: Must be TRUE to show tags  
  sentiment\_score REAL, \-- 0.0-1.0 (Analyzed from reviews, affects sorting)  
  is\_highlighted BOOLEAN DEFAULT 0, \-- Puts item in "Featured" section  
  embedding\_version INTEGER \-- Increments on edit, triggers Vectorize re-indexing  
);

\-- CATEGORIES  
CREATE TABLE categories (  
  id INTEGER PRIMARY KEY,  
  tenant\_id TEXT,  
  name TEXT, \-- "Appetizers", "Main Courses"  
  sort\_order INTEGER,  
  is\_visible BOOLEAN DEFAULT 1  
);

## **3\. The "Store Dashboard" (Tenant Portal)**

**Route:** `/dashboard` **Technology:** Remix (SPA Mode) \+ Workers API. **Auth:** Passwordless (Magic Link) protected by **Turnstile** to prevent SMS pumping attacks.

### **Module A: The "AI Manager" (Cloudflare Agents)**

This is the "Headless" interface for the dashboard.

* **Core Infrastructure:** Built on the **Cloudflare Agents SDK**, running inside a **Durable Object**. This ensures a single stream of consciousness per tenant.  
* **Unified Context:** The Chat UI in the dashboard mirrors the SMS history on the owner's phone. If the owner texts "Close early" while driving, the dashboard reflects that command instantly via WebSocket.  
* **Capabilities & Intent Recognition:**  
  * **Natural Language Updates:** "Add Pumpkin Pie for $5" \-\> Parses intent \-\> Calls `d1.insert()`.  
  * **Review Response:** The Agent monitors Google Reviews (via Cron/API). It drafts replies based on the review sentiment and waits for owner approval (e.g., "Draft: Thanks for the feedback\!").  
  * **Business Queries:** "How many views yesterday?" \-\> Queries Workers Analytics Engine \-\> Returns natural language summary.

### **Module B: Visual Menu Editor**

This is the traditional GUI for detailed management.

* **Interface:** A Drag-and-drop Tree View allowing owners to reorder Categories and Items effortlessly.  
* **Media Pipeline:** Uses Direct Creator Uploads (DCU). The client requests a one-time upload URL from Cloudflare Images, bypassing our backend for large file transfers.  
* **AI Tools:**  
  * **"Generate Description":** Uses Llama 3 to turn "Cheeseburger" into "Juicy quarter-pound beef patty topped with melted cheddar..."  
  * **"Detect Allergens":** Analyzes description text to suggest tags (e.g., "Contains: Dairy, Gluten"). This sets `dietary_tags` but leaves `dietary_tags_verified` as FALSE until the human explicitly clicks "Verify."

### **Module C: Operations Center**

* **Hours Matrix:** A sophisticated Grid UI that supports **Split Shifts**. Users can add multiple rows for a single day (e.g., Breakfast 6-10am, Dinner 5-9pm).  
* **Holiday Calendar:** Pre-populated list of Federal Holidays. Users toggle \[Open\]/\[Closed\]/\[Custom Hours\] for each. Logic cascades: Special Date \> Weekly Hours.  
* **Emergency Button:** The "Big Red Button" (accessible via Web or SMS command "EMERGENCY CLOSE").  
  * **Action:** Updates `business_settings.emergency_close_reason`, triggers a global Cache Purge via API, and updates the public site banner immediately.  
* **Hiring Toggle:** A simple switch that reveals/hides the "Now Hiring" banner and application link on the public site.  
* **Google Business Wizard:**  
  * **Verification:** User inputs the 5-digit Postcard Code \-\> Worker submits to Google My Business API to claim the listing.  
  * **Sync:** A **Cron Trigger** runs daily to push D1 Operating Hours \-\> Google Maps, ensuring the two never drift apart.

### **Module D: Settings & Marketing**

* **Notification Prefs:** Granular controls stored in `authorized_users`. Example: "Text me for All Reviews" vs. "Text me for 5-star only."  
* **Integrations:** Input fields for Facebook Pixel and Google Tag IDs. These values update the **Cloudflare Zaraz** configuration dynamically, injecting tracking scripts at the edge without bloating the client bundle.  
* **Usage Alerts:** A "Staleness" Monitor. A Cron job checks the `menu_items` table. If `last_updated` \> 7 days, it triggers an email via `Cloudflare Queues` \-\> MailChannels: "Update your specials to keep customers interested\!"

---

## **4\. The Super Admin Dashboard ("God Mode")**

**Route:** `/admin` **Auth:** **Cloudflare Access** (Zero Trust). No custom auth code; relies on Cloudflare's identity provider.

### **Module A: Fleet Management**

* **Tenant List:** A sortable table filtering by Monthly Revenue (Stripe data), Deployment Status (Building/Active), and Version Channel.  
* **Global Broadcast:** A mechanism to write a system message to KV, which is then pulled by all Store Dashboards (e.g., "Scheduled Maintenance Tonight at 2 AM").  
* **Impersonation:** A "Log In As Owner" button. This generates a short-lived, signed session cookie for a specific tenant, allowing support staff to see exactly what the user sees.  
* **Billing:** Displays Stripe Connect status. Allows admin to manually override subscription tiers or pause billing.

### **Module B: "Magic Start" Onboarding (Workflows)**

**Orchestration:** Replaces fragile client-side logic with **Cloudflare Workflows** for durability.

1. **Step 1 (Scrape Configuration):**  
   * **Inputs:** Business Name, Address, URL (optional).  
   * **Source Checkboxes (Restored):** \[x\] Google Maps (Reviews/Details), \[x\] Wayback Machine (Old Menus \- useful if current site is down), \[x\] Instagram API (Photos).  
2. **Step 2 (Execution):** The Workflow triggers **Cloudflare Browser Rendering**.  
   * It spins up a headless browser.  
   * Extracts JSON-LD (structured data), meta tags, and scrapes high-res images.  
   * Captures a screenshot of the existing site for reference.  
3. **Step 3 (Parse):** The raw text is piped to Workers AI (Llama 3).  
   * Prompt: "Extract menu items from this text into JSON format matching this schema..."  
4. **Step 4 (Verify \- Visual Diff):** The Admin sees a split screen: Source Site (Iframe/Screenshot) vs. Parsed Data (Editable Table). This human-in-the-loop step prevents AI hallucinations from going live.  
5. **Step 5 (Provision):** Upon approval, the Workflow commits data to D1, triggers the **Cloudflare for SaaS** API to issue SSL certificates for the custom domain, and sends the Welcome Email.

### **Module C: Infrastructure**

* **AI Monitor:** A dashboard tracking token usage (Input/Output) per tenant for Llama 3 and Whisper. critical for cost analysis.  
* **Audit Logs:** An interface querying the **R2 Data Catalog**. It uses **R2 SQL** (or Athena over R2) to search immutable logs (e.g., "Show me all menu edits by Tenant X in the last 24 hours").  
* **Global Template Editor:** A code editor allowing Admins to push CSS updates to the shared `theme.css` file stored in R2, propagating design fixes to all tenants instantly.

---

## **5\. The "Diner Agent" (Backend Logic)**

**Infrastructure:** Durable Objects \+ Workers AI \+ AI Gateway \+ Queues.

### **A. Omni-Channel Connectivity**

* **Security:** All inbound webhooks verify the `X-Twilio-Signature` to prevent spoofing.  
* **2FA Challenge:** For high-risk actions (e.g., "Delete Site" or "Change Bank Info"), the Agent triggers a logic flow:  
  * Generate 6-digit OTP.  
  * Send via SMS to Owner's verified phone number.  
  * Pause execution until the next message matches the OTP.  
* **Inputs:**  
  * **SMS:** Twilio Webhook \-\> **Cloudflare Queue** (Buffer) \-\> Consumer Worker \-\> Durable Object. Buffering ensures we don't drop messages during traffic spikes.  
  * **Voice:** Twilio Voice \-\> **Workers AI (Whisper)**. The audio is transcribed to text, processed by the Agent, and a response is generated.  
  * **Vision (Foodstagram):** If an owner MMS's a photo of a special board, a Worker intercepts the image, runs **Workers AI (Vision)**, extracts the text, and creates a "Draft" menu item in the dashboard.

### **B. Logic & RAG (Retrieval-Augmented Generation)**

* **Memory:** The Agent uses **Vectorize** (`diner-menu-index`) to perform semantic searches. If a user asks, "Do you have anything spicy?", the system converts "spicy" to an embedding, queries the index, and retrieves items like "Jalapeno Burger."  
* **System Prompt (Restored Constraint):** "You are a website manager for \[Diner Name\]. You are NOT a waiter. You cannot take orders or process payments. If asked to order, politely tell the user to call the diner at \[Phone Number\]."  
* **Commands:**  
  * "Out of Ribeye" \-\> Fuzzy Match "Ribeye Steak" \-\> Toggle `is_available = false`.  
  * "Open late until 10pm" \-\> Update `operating_hours` for the current day.

---

## **6\. Public Site (Visitor Experience)**

**Tech:** Remix (SSR) \+ Cloudflare Pages \+ Edge Cache.

### **A. Reliability & Performance**

* **Doomsday Protocol:** The ultimate failover.  
  * **Level 1:** Service Worker caches `menu.json`, CSS, and Fonts. The site works fully offline for returning visitors.  
  * **Level 2:** **R2 Fallback**. If the D1 database or Remix rendering throws a 500 error, the Edge Worker catches the exception and serves a pre-rendered static `index.html` snapshot stored in R2.  
* **Lite Mode:** The Worker inspects the `Save-Data` header. If present, it rewrites image URLs to request highly compressed, low-quality AVIF variants from Cloudflare Images.

### **B. Features & Logic**

* **Truth Hierarchy:** The logic for "Is it Open?" is:  
  1. Check `business_settings.emergency_close_reason`. If set \-\> CLOSED.  
  2. Check `special_dates` for today. If present \-\> Use those status/hours.  
  3. Check `operating_hours` for today's day of week (handling split shifts).  
* **Empty Category Hiding:** A filter runs before rendering: `if (category.items.filter(item => item.is_available).length === 0) return null;`. This prevents showing headers like "Soups" with no visible items underneath.  
* **Call Interception:** If the status is CLOSED, clicking the "Call" button doesn't dial immediately. Instead, a modal appears: "We are currently closed. We open in \[X\] minutes. Call anyway?" This saves owners from nuisance calls.  
* **Print Mode:** A dedicated CSS `@media print` sheet. It hides the hero image, navigation, and footer, and reformats the menu into a high-contrast, black-and-white, two-column layout suitable for physical printing.  
* **Hiring Banner:** Conditional rendering. If `business_settings.is_hiring === true`, a sticky banner appears at the bottom: "We are Hiring\! Apply Now."

### **C. SEO & Discovery**

* **Dynamic SEO:** **Satori** runs on the edge to generate Open Graph images. Instead of a generic logo, shared links show "Today's Special: Meatloaf \- $12" overlaid on the diner's brand colors.  
* **Voice Search:** The daily special and core menu items are wrapped in **Speakable** JSON-LD Schema, allowing Siri/Alexa to read them aloud when asked "What's the special at Joe's?"  
* **Translation:** The app detects `Accept-Language` headers. If the browser is Spanish, it triggers Client-side translation via Workers AI to translate menu descriptions on the fly.  
* **Liability Disclaimer:** A hard-coded footer component: "Dietary tags are AI suggestions. Please confirm allergens with staff."

---

## **7\. Backend Infrastructure & Security**

### **Sync & Retention**

* **IndexNow:** A Worker triggers a ping to Bing and Google immediately upon any `menu_items` update, ensuring search results are fresh.  
* **ROI Emails:** A Weekly Cron job aggregates analytics (Views, Call Clicks, Direction Clicks). It pushes a job to **Cloudflare Queues**, which triggers a consumer to render an email template (`packages/email`) and send it via MailChannels.  
* **Social Sync:** A Workflow periodically fetches the Tenant's Instagram feed. It downloads new media to Cloudflare Images and updates a "Social Gallery" component on the public site.

### **Security**

* **Aggregator Shield:** **WAF Custom Rules** are configured to identify and block User-Agents associated with DoorDash, UberEats, and GrubHub. This prevents them from scraping the menu and creating unauthorized "Ghost Kitchen" listings.  
* **Secrets Store:** All API keys (Stripe, Twilio, Instagram) are stored in Cloudflare's encrypted Secrets Store, accessed via `env.SECRET_NAME`.  
* **Immutable Logs:** All write actions (D1 inserts/updates) emit an event to a **Logpush** pipeline, which appends the data to R2. This creates a permanent, tamper-proof audit trail.

---

## **8\. Development Roadmap & Timeline**

### **Phase 1: Foundation (Week 1\)**

* **Goal:** Operational Local Dev Environment.  
* **Deliverables:**  
  * TurboRepo setup with `ui`, `db`, `ai` packages.  
  * Local D1 emulation.  
  * `wrangler.toml` configuration for service bindings.  
  * Deployment of the `tenants`, `theme_config`, `special_dates`, and `authorized_users` schemas.

### **Phase 2: Data & Core Services (Weeks 2-3)**

* **Goal:** Database Integrity and Basic Operations.  
* **Deliverables:**  
  * Implementation of "Safe Query" Middleware (Tenant Isolation).  
  * Visual Editor backend with Cloudflare Images integration.  
  * Operations logic: Hours Matrix (Split Shifts) & Holiday Calendar.  
  * "Emergency Button" API and Cache purging logic.

### **Phase 3: The Agent (Weeks 4-6)**

* **Goal:** The AI Brain.  
* **Deliverables:**  
  * `DinerAgent` Durable Object class implementation.  
  * Twilio Webhook handlers (SMS/Voice) with signature verification.  
  * Workers AI (Whisper) integration.  
  * Cloudflare Queues for buffering inbound/outbound messages.  
  * 2FA Challenge logic.

### **Phase 4: Public Site (Weeks 7-9)**

* **Goal:** The Customer Experience.  
* **Deliverables:**  
  * Remix Loaders with `tenant_id` resolution via Host header.  
  * Cloudflare Fonts integration.  
  * Logic for Empty Category Hiding.  
  * Implementation of "Doomsday" R2 Fallback generator.  
  * Call Intercept Modal and Print CSS.

### **Phase 5: Advanced & Automation (Weeks 10-12)**

* **Goal:** Marketing and Onboarding.  
* **Deliverables:**  
  * "Magic Start" Onboarding Workflow (Browser Rendering \+ Llama 3).  
  * Visual Diff UI for admin verification.  
  * PDF Flyer Generator (`@react-pdf`) resource route.  
  * Satori Open Graph image generation.  
  * Vision AI integration for "Foodstagram" menu drafts.

### **Phase 6: Polish & Compliance (Weeks 13-14)**

* **Goal:** Production Readiness.  
* **Deliverables:**  
  * Twilio A2P 10DLC registration flow.  
  * Web Analytics injection.  
  * Usage Alerts (Staleness Monitor).  
  * WAF "Aggregator Shield" configuration.  
  * Final Load Testing via k6.

---

## **9\. Final "Ready to Code" Checklist**

1. **Repo:** Clone the Monorepo structure.  
2. **Env:** Copy `.dev.vars.example` to `.dev.vars` and fill in API keys (Stripe, Twilio).  
3. **Install:** Run `pnpm install`.  
4. **DB:** Run `pnpm db:local` to push the schema to local D1.  
5. **Seed:** Run the seed script to create the "Default Dev Tenant."  
6. **Hosts:** Map `dev.localhost` to `127.0.0.1` in system hosts file.  
7. **Run:** Execute `pnpm dev`.

**Technical Addendum: Developer Execution Guide**

### **1\. The "Glue" Matrix (Service Bindings)**

In a Cloudflare Monorepo, apps are isolated. You must explicitly bind them in wrangler.toml to allow communication without exposing them to the public internet.

**Developer Action:** Ensure every wrangler.toml contains these specific binding blocks.

| Consumer App | Resource Needed | Configuration Required in wrangler.toml |
| :---- | :---- | :---- |
| **All Apps** | **D1 Database** | \[\[d1\_databases\]\]  binding \= "DB"  database\_name \= "diner-core"  database\_id \= "..." |
| **All Apps** | **R2 Storage** | \[\[r2\_buckets\]\]  binding \= "ASSETS"  bucket\_name \= "diner-assets" |
| **Store Dashboard** | **Diner Agent (DO)** | \[\[durable\_objects\]\]  binding \= "AGENT\_DO"  class\_name \= "DinerAgent"  script\_name \= "agent-worker" (Name of the agent worker) |
| **Agent Worker** | **Queues** | \[\[queues.consumers\]\]  queue \= "sms-inbound"  max\_batch\_size \= 10 |
| **Jobs Worker** | **Queues** | \[\[queues.producers\]\]  queue \= "sms-outbound"  binding \= "SMS\_QUEUE" |
| **Jobs Worker** | **Store Dashboard** | \[\[services\]\]  binding \= "STORE\_SERVICE"  service \= "store-remix" (For triggering cache purges) |

###  **\# Add to all apps needing cache/session access (Public, Store, Admin)**

### **\[\[kv\_namespaces\]\]**

### **binding \= "KV"**

### **id \= "xxxxxxxxxxxx" \# Namespace ID for "diner-cache"**

###  **2\. Secrets & Environment Variables Manifest**

The developer needs a checklist of secrets to provision in .dev.vars (local) and wrangler secret put (production).

**packages/config/.env.example**

Bash  
\# \--- Infrastructure \---  
\# (Auto-provided by Cloudflare in Prod, needed for local dev if mocking)  
CLOUDFLARE\_ACCOUNT\_ID=  
CLOUDFLARE\_API\_TOKEN=

\# \--- Authentication (Module D) \---  
SESSION\_SECRET="super-long-random-string-for-cookie-signing"  
MAGIC\_LINK\_SECRET="another-random-string-for-token-encryption"

\# \--- Integrations \---  
\# Stripe Connect (Module A)  
STRIPE\_SECRET\_KEY="sk\_live\_..."  
STRIPE\_WEBHOOK\_SECRET="whsec\_..."

\# Twilio (Agent Connectivity)  
TWILIO\_ACCOUNT\_SID="AC..."  
TWILIO\_AUTH\_TOKEN="..."  
TWILIO\_PHONE\_NUMBER="+1555..."

\# Instagram (Marketing Sync)  
INSTAGRAM\_CLIENT\_ID="..."  
INSTAGRAM\_CLIENT\_SECRET="..."

\# \--- AI (Optional Fallbacks) \---  
\# If Workers AI limit hit, fallback to OpenAI  
OPENAI\_API\_KEY="sk-..." 

### **3\. Local Development Port Strategy**

To run the full stack simultaneously (pnpm dev), assign static ports in wrangler.toml to prevent conflicts.

* **Public Site:** http://localhost:3000  
* **Store Dashboard:** http://localhost:3001  
* **Admin Dashboard:** http://localhost:3002  
* **Agent Worker:** http://localhost:8787 (Standard Worker port)  
* **Jobs Worker:** http://localhost:8788

**Recommended package.json script:**

JSON  
"scripts": {  
  "dev": "turbo run dev \--parallel",  
  "db:local": "wrangler d1 execute diner-core \--local \--file=./packages/db/schema.sql",  
  "db:studio": "drizzle-kit studio"  
}

### **4\. D1 Migration Workflow**

Since D1 is SQLite, schema changes must be managed carefully.

1. **Generate Migration:** drizzle-kit generate:sqlite (Creates .sql file).  
2. **Apply Local:** wrangler d1 execute diner-core \--local \--file=./migrations/0001\_init.sql.  
3. **Apply Production:** wrangler d1 execute diner-core \--file=./migrations/0001\_init.sql.  
   * *Warning:* Always backup production data using wrangler d1 backup before applying remote migrations.

### **5\. Deployment Sequence (Critical)**

Dependencies exist between the apps. Deploying in the wrong order will cause 500 errors.

1. **Database:** Deploy D1 Schema & Migrations first.  
2. **Queues:** Create queues (wrangler queues create sms-inbound).  
3. **Agent:** Deploy the apps/agent worker. (The Durable Object class must exist before other apps can bind to it).  
4. **Dashboards:** Deploy apps/store and apps/admin.  
5. **Public:** Deploy apps/public.

### **6\. "Doomsday" Snapshot Automation**

The plan mentions R2 fallback but lacks the *generation* logic.

**Add to apps/public/package.json:**

* **Script:** "build:snapshot": "remix build && node scripts/generate-static-snapshot.js"  
* **Logic:** The script should render the generic \_index.tsx to an HTML string and upload it to the diner-assets R2 bucket under fallback/index.html.  
* **Trigger:** Run this on every deployment to ensure the "Doomsday" static file is never stale.

### **7\. Missing Package Recommendation**

For **Phase 4 (Visual Menu Editor)**, you requested a "Tree View."

* **Recommendation:** Add @dnd-kit/core and @dnd-kit/sortable.  
* *Why:* It is the most robust React library for accessible drag-and-drop lists, essential for moving menu items between categories.

### **8\. Testing Strategy (Clarification)**

For **Phase 8 (Load Testing)**, standard tools like JMeter don't test Durable Objects well.

* **Recommendation:** Use **k6** with the Cloudflare Worker extension.  
* *Why:* It can simulate thousands of concurrent WebSocket connections to test the Agent's concurrency limits.

### **1\. The "Magic Link" Email Deliverability Strategy**

* **Context:** The plan uses "Magic Links" for authentication.  
* **Risk:** If these emails land in spam, owners cannot log in.  
* **Missing Detail:** Explicit instructions on DNS records for MailChannels (or Resend) to ensure high deliverability.  
* **Addendum:**  
  * **SPF Record:** `v=spf1 include:relay.mailchannels.net ~all`  
  * **DKIM:** Instructions to generate and add the DKIM CNAME record to the Cloudflare DNS dashboard for the sending domain (`auth.diner-saas.com` or similar).

### **2\. D1 "Safe Query" Middleware \- Edge Case Handling**

* **Context:** The middleware enforces `tenant_id` isolation.  
* **Risk:** The Super Admin dashboard *must* bypass this to see all tenants, but the middleware might block it if not configured correctly.  
* **Addendum:**  
  * **Bypass Logic:** The middleware code in `packages/db/src/safe-query.ts` must accept an optional `isSuperAdmin` flag or check for a specific `ADMIN_ROLE` token to skip the `where(eq(tenant_id, ...))` injection.

### **3\. Cloudflare Images "Signed URL" Expiration**

* **Context:** Direct Creator Uploads (DCU) are used.  
* **Risk:** If the signed upload URL expires too quickly, users on slow rural connections might fail to upload large photos.  
* **Addendum:**  
  * **Configuration:** Set the `expiry` time for signed upload URLs to at least **30 minutes** (default is often shorter) to accommodate the target demographic's potentially unstable internet.

### **4\. Vectorize Index Dimension Mismatch**

* **Context:** `bge-base-en-v1.5` is mentioned for embeddings.  
* **Risk:** If the Vectorize index is created with the wrong dimension count, all AI queries will fail.  
* **Addendum:**  
  * **Command:** `wrangler vectorize create diner-menu-index --dimensions=768 --metric=cosine` (Explicitly confirm 768 dimensions matches the chosen model).

### **5\. "Doomsday" Snapshot Triggering \- Automation Detail**

* **Context:** The snapshot should run on "every deployment."  
* **Risk:** If the public site is updated via a git push, the snapshot might be generated *before* the new code is fully live/propagated, caching an old or broken version.  
* **Addendum:**  
  * **Pipeline Logic:** The `build:snapshot` script should ideally run as a *post-deployment* hook or via a GitHub Action that waits for the "Success" status from Cloudflare Pages before triggering the snapshot generation against the *live* URL (not local build).

### **6\. Local Development "Host" Header Emulation**

* **Context:** The public site uses the `Host` header to determine the tenant.  
* **Risk:** In `localhost`, the host is always `localhost:3000`. Developers cannot easily test multi-tenancy locally.  
* **Addendum:**  
  * **Dev Tip:** Instruct developers to edit their `/etc/hosts` file (or use a tool like `ngrok` or Cloudflare Tunnel) to map `joes-diner.localhost` to `127.0.0.1`.  
  * **Code Update:** Ensure the `root.tsx` loader explicitly handles `localhost` by falling back to a "default dev tenant" ID defined in `.dev.vars`.

### **7\. Durable Object Migration Strategy**

* **Context:** Durable Objects have persistent storage.  
* **Risk:** If the `DinerAgent` class schema changes (e.g., changing how chat history is stored), old objects might crash.  
* **Addendum:**  
  * **Migration Rule:** Explicitly state that any changes to the DO class state structure must include a migration logic (e.g., `state.blockConcurrencyWhile(async () => { ... })`) to upgrade existing objects lazily.

### **8\. Handling "Split Shifts" in Semantic Search**

* **Context:** Vectorize is used for menu queries.  
* **Risk:** Embeddings are for *menu items*. If a user asks "Are you open for lunch?", the vector search might just return "Lunch Menu" items rather than checking *Operating Hours*.  
* **Addendum:**  
  * **Agent Logic:** Clarify that the Agent must *first* check the `operating_hours` table logic (deterministic) before or in parallel with the Vectorize query (semantic) to answer availability questions accurately.

### **Final "Ready to Code" Checklist for the Developer**

1. **Repo:** Clone the Monorepo structure.  
2. **Env:** Copy `.dev.vars.example` to `.dev.vars` and fill in API keys (Stripe, Twilio).  
3. **Install:** Run `pnpm install`.  
4. **DB:** Run `pnpm db:local` to push the schema to local D1.  
5. **Seed:** Run the seed script to create the "Default Dev Tenant."  
6. **Hosts:** Map `dev.localhost` to `127.0.0.1` in system hosts file.  
7. **Run:** Execute `pnpm dev`.

### **1\. Public Website (Visitor PWA)**

**Core Functionality**

* **Offline-First Architecture:** Service Worker caching for `menu.json`, CSS, and fonts to enable full functionality without network connectivity.  
* **"Doomsday" Protocol (R2 Fallback):** Automated failover to serve a static `index.html` snapshot from R2 storage if the primary D1 database or Workers throw 500 errors.  
* **Lite Mode:** Automatic detection of the `Save-Data` request header to serve highly compressed AVIF images.  
* **Client-Side Translation:** Automatic detection of browser language with on-the-fly translation via Workers AI.

**User Experience & Interaction**

* **Smart Call Interception:** Modal intervention when users click "Call" during closed hours ("We open in X mins. Call anyway?").  
* **Print Mode:** Dedicated CSS `@media print` stylesheet that reformats the menu into a high-contrast, black-and-white layout for physical printing.  
* **Hiring Banner:** Conditional global banner rendering based on the `is_hiring` boolean flag.  
* **Empty Category Hiding:** Logic to automatically remove menu categories from the view if all contained items are marked unavailable.  
* **Liability Disclaimer:** Footer injection of legal text: "Dietary tags are AI suggestions. Please confirm allergens with staff."

**SEO & Discovery**

* **Dynamic Open Graph Images:** Server-side generation of social sharing images (OG Images) using **Satori** (e.g., displaying "Today's Special").  
* **Voice Search Optimization:** JSON-LD **Speakable** Schema markup wrapping daily specials for assistant readouts.  
* **IndexNow Integration:** Automated pinging of Bing/Google search engines immediately upon menu updates.

### **2\. Store Dashboard (Tenant Portal)**

**Module A: AI Manager (Cloudflare Agents)**

* **Unified Context Engine:** Stateful Durable Object maintaining synchronized conversation history across Web Chat and SMS.  
* **Natural Language Menu Updates:** Processing of commands like "Add Pumpkin Pie for $5" to execute D1 database inserts.  
* **Review Response Drafting:** AI generation of replies to Google Reviews based on business context.  
* **Business Intelligence Queries:** Natural language interface for analytics (e.g., "How many views yesterday?").  
* **Foodstagram (Vision AI):** Processing of MMS photos sent by owners to draft new menu items automatically.

**Module B: Visual Menu Editor**

* **Drag-and-Drop Interface:** Tree-view organization for Category and Item management.  
* **Direct Media Upload:** Integration with Cloudflare Images for auto-cropping and optimization.  
* **AI Description Generator:** Llama 3 generation of appetizing text based on item names.  
* **AI Allergen Detection:** Llama 3 analysis of ingredients to auto-tag dietary restrictions (requires manual liability verification toggle).

**Module C: Operations Center**

* **Split-Shift Support:** Hours Matrix UI allowing multiple start/end time blocks per day.  
* **Holiday Calendar:** Management of Federal Holidays with status toggles (\[Open\]/\[Closed\]/\[Custom\]).  
* **Emergency "Big Red Button":** Immediate "Emergency Close" trigger via Web or SMS that updates `business_settings` and flushes the Edge Cache.  
* **Hiring Toggle:** Global switch to control the public-facing "Now Hiring" banner.  
* **Google Business Wizard:**  
  * Postcard verification code submission flow.  
  * Cron-triggered one-way synchronization of D1 Operating Hours to Google Maps.

**Module D: Settings & Marketing**

* **Granular Notification Preferences:** Role-based toggles (e.g., "Text me for 5-star reviews only").  
* **Zaraz Configuration:** Input fields for Pixel IDs (Facebook, Google) that dynamically update Cloudflare Zaraz injection rules.  
* **Staleness Usage Alerts:** Cron job checking `last_updated` timestamp; triggers email to owner if \>7 days inactive.  
* **QR Flyer Generator:** On-demand generation of print-ready PDF table tents using `@react-pdf/renderer`.

### **3\. Super Admin Dashboard ("God Mode")**

**Module A: Fleet Management**

* **Tenant List Filtering:** Sort/Filter by Revenue, Deployment Status, and Version Channel.  
* **Global Broadcast System:** System-wide notification injection into all Tenant Dashboards.  
* **Impersonation Mode:** "Log In As Owner" functionality for support and debugging.  
* **Billing Management:** Stripe Connect status monitoring and subscription tier controls.

**Module B: "Magic Start" Onboarding (Workflows)**

* **Scrape Configuration:**  
  * Inputs: Business Name, Address.  
  * Source Selection: Checkboxes for Google Maps (Reviews), Wayback Machine (Archives), Instagram API (Photos).  
* **Browser Rendering Orchestration:** Automated Puppeteer execution to extract JSON-LD, meta tags, and high-res assets.  
* **AI Parsing:** Llama 3 conversion of unstructured scraped text into the strict Menu JSON schema.  
* **Visual Diff UI:** Side-by-side iframe comparison (Source vs. Scraped Data) for admin verification before commit.  
* **Automated Provisioning:** Atomic execution of D1 writes and Cloudflare for SaaS custom domain setup.

**Module C: Infrastructure Tools**

* **AI Token Monitor:** Per-tenant tracking of Llama 3/Whisper usage.  
* **Audit Log Explorer:** SQL interface via R2 Data Catalog to query immutable system logs.  
* **Global Template Editor:** Code editor for shared CSS components affecting all tenants.

### **4\. Omni-Channel Agent Backend**

**Connectivity & Security**

* **Twilio Webhook Handling:** Inbound SMS processing via Cloudflare Queues with `X-Twilio-Signature` verification.  
* **Voice Processing:** Twilio Voice webhook integration \-\> Workers AI (Whisper) transcription \-\> Agent Logic \-\> Text-to-Speech callback.  
* **2FA Challenge System:** SMS-based 6-digit OTP challenge triggered by high-risk actions (e.g., "Delete Site").

**Logic & RAG (Retrieval-Augmented Generation)**

* **Semantic Memory:** Vectorize integration (`diner-menu-index`) for retrieving menu context during interactions.  
* **Inventory Commands:** Fuzzy matching logic for "86 \[Item Name\]" commands to toggle availability.  
* **System Prompt Constraints:** Strict enforcement of "Website Manager" persona (explicitly rejecting "Waiter" tasks).

### **5\. Backend Infrastructure & Security**

**Data & Storage**

* **D1 Database:** SQLite storage for Tenants, Config, Auth, Hours, and Menu Items.  
* **R2 Storage:** Object storage for Assets (Images) and Immutable Logs (Data Catalog).  
* **Vectorize:** Vector database for semantic search indices.

**Network & Security**

* **Aggregator Shield:** WAF Custom Rule configuration to block known User-Agents from third-party delivery aggregators (DoorDash/UberEats) to prevent unauthorized scraping.  
* **Secrets Store:** Encrypted storage for API Keys (Stripe, Twilio).  
* **Email Routing:** Inbound handling for tenant email aliases (e.g., `info@joesdiner.com`).

**Async Processing**

* **Cloudflare Queues:** Decoupled processing for SMS Inbound/Outbound and Marketing Blasts.  
* **Social Sync Workflow:** Periodic fetching of Instagram media for Cloudflare Images synchronization.  
* **ROI Reporting:** Weekly Cron job generating and sending performance reports via MailChannels.

### **. Monorepo Architecture Overview**

The system is split into three primary layers:

1. **Apps:** The deployable endpoints (Admin Dashboard, Store Dashboard, Public PWA, Agent Worker).  
2. **Packages:** Shared internal libraries (Database schema, UI components, AI wrappers).  
3. **Services:** Background workers (Cron jobs, Queues).

### **2\. Comprehensive File Structure**

Plaintext  
/monorepo  
├── package.json                   \# Root scripts (dev, build, deploy)  
├── pnpm-workspace.yaml            \# Workspace definition  
├── turbo.json                     \# TurboRepo pipeline config  
├── tsconfig.json                  \# Base TypeScript config  
├── .gitignore                     \# Global ignore rules  
├── .dev.vars                      \# Local secrets (API Keys)  
├── README.md                      \# Documentation

├── apps/  
│   ├── public/                    \# (Visitor PWA \- Remix \+ Pages)  
│   │   ├── package.json  
│   │   ├── wrangler.toml          \# Bindings: D1, R2, AI, KV  
│   │   ├── vite.config.ts  
│   │   ├── tsconfig.json  
│   │   ├── public/  
│   │   │   ├── favicon.ico  
│   │   │   ├── manifest.json      \# Dynamic manifest fallback  
│   │   │   └── robots.txt  
│   │   └── app/  
│   │       ├── root.tsx           \# Global Layout \+ Theme Injection \+ Zaraz  
│   │       ├── entry.server.tsx   \# SSR Entry  
│   │       ├── entry.client.tsx   \# Hydration Entry  
│   │       ├── routes/  
│   │       │   ├── \_index.tsx     \# Homepage (Hero, Hours, Map)  
│   │       │   ├── $slug.tsx      \# Sub-pages  
│   │       │   ├── api.manifest.ts \# Dynamic PWA Manifest Generator  
│   │       │   └── qr-flyer.ts    \# PDF Generation Resource Route  
│   │       ├── components/  
│   │       │   ├── MenuSection.tsx  
│   │       │   ├── MenuItem.tsx   \# (Hides empty categories)  
│   │       │   ├── HoursDisplay.tsx  
│   │       │   ├── Footer.tsx     \# (Liability Disclaimer)  
│   │       │   ├── CallModal.tsx  \# (Interception Logic)  
│   │       │   └── Doomsday.tsx   \# (R2 Fallback Component)  
│   │       └── services/  
│   │           ├── session.server.ts  
│   │           └── theme.server.ts \# KV Cache Logic  
│   │  
│   ├── store/                     \# (Tenant Dashboard \- Remix \+ Workers)  
│   │   ├── package.json  
│   │   ├── wrangler.toml  
│   │   ├── vite.config.ts  
│   │   ├── tsconfig.json  
│   │   └── app/  
│   │       ├── root.tsx  
│   │       ├── routes/  
│   │       │   ├── \_auth.login.tsx \# Magic Link / OTP Form  
│   │       │   ├── dashboard.tsx  \# Layout Shell  
│   │       │   ├── dashboard.\_index.tsx \# Analytics (Recharts)  
│   │       │   ├── dashboard.chat.tsx   \# Omni-Channel AI Chat  
│   │       │   ├── dashboard.menu.tsx   \# Visual Editor (Tree View)  
│   │       │   └── dashboard.settings.tsx \# Hours, Holidays, Notifications  
│   │       ├── components/  
│   │       │   ├── VisualEditor.tsx  
│   │       │   ├── ChatInterface.tsx  
│   │       │   └── HoursMatrix.tsx  
│   │       └── services/  
│   │           └── auth.server.ts  
│   │  
│   ├── admin/                     \# (Super Admin \- Remix \+ Access)  
│   │   ├── package.json  
│   │   ├── wrangler.toml  
│   │   ├── vite.config.ts  
│   │   ├── tsconfig.json  
│   │   └── app/  
│   │       ├── root.tsx  
│   │       ├── routes/  
│   │       │   ├── \_index.tsx  
│   │       │   ├── admin.tenants.tsx     \# List/Filter  
│   │       │   ├── admin.onboarding.tsx  \# "Magic Start" Wizard  
│   │       │   ├── admin.logs.tsx        \# R2 Log Explorer  
│   │       │   └── admin.billing.tsx     \# Stripe Connect  
│   │       └── services/  
│   │           ├── scraper.server.ts  
│   │           └── billing.server.ts  
│   │  
│   └── agent/                     \# (The Brain \- Cloudflare Worker)  
│       ├── package.json  
│       ├── wrangler.toml          \# \[\[durable\_objects\]\] binding  
│       ├── tsconfig.json  
│       └── src/  
│           ├── index.ts           \# Route Handler (Webhooks)  
│           ├── durable-object.ts  \# DinerAgent Class (State)  
│           └── handlers/  
│               ├── sms.ts         \# Twilio Logic \+ Signature Verification  
│               ├── voice.ts       \# Whisper Transcription  
│               ├── chat.ts        \# Vercel AI SDK Stream  
│               └── tools.ts       \# D1 Update Functions (86 item, etc)  
│  
├── packages/  
│   ├── db/                        \# (Data Layer)  
│   │   ├── package.json  
│   │   ├── drizzle.config.ts  
│   │   └── src/  
│   │       ├── index.ts           \# Client Export  
│   │       ├── schema.ts          \# Table Definitions (tenants, menu, etc)  
│   │       └── safe-query.ts      \# Tenant Isolation Middleware  
│   │  
│   ├── ui/                        \# (Shared Design System)  
│   │   ├── package.json  
│   │   ├── tailwind.config.ts  
│   │   └── src/  
│   │       ├── index.ts  
│   │       ├── utils.ts           \# cn() helper  
		`assets/fonts/Inter-Bold.ttf`  
│   │       └── components/        \# Shadcn/UI Primitives  
│   │           ├── button.tsx  
│   │           ├── input.tsx  
│   │           ├── dialog.tsx  
│   │           ├── card.tsx  
│   │           └── toast.tsx  
│   │  
│   ├── ai/                        \# (AI Wrappers)  
│   │   ├── package.json  
│   │   └── src/  
│   │       ├── index.ts  
│   │       ├── prompts.ts         \# "You are a website manager..."  
│   │       └── client.ts          \# Workers AI / Vercel AI SDK setup  
│   │  
│   ├── scraper/                   \# (Browser Rendering)  
│   │   ├── package.json  
│   │   └── src/  
│   │       ├── index.ts  
│   │       ├── browser.ts         \# Puppeteer Config  
│   │       └── extractors/        \# Parsing Logic  
│   │  
│   └── email/                     \# (Transactional Email)  
│       ├── package.json  
│       └── src/  
│           ├── index.ts  
│           └── templates/         \# ROI Report, Welcome Email  
│  
└── services/  
    └── jobs/                      \# (Background Worker)  
        ├── package.json  
        ├── wrangler.toml          \# Queues & Cron Triggers  
        └── src/  
            ├── index.ts  
            ├── queues/  
            │   ├── sms-outbound.ts  
            │   ├── social-sync.ts  
            │   └── roi-report.ts  
            └── cron/  
                ├── google-sync.ts  
                └── usage-alerts.ts

### **3\. Comprehensive Package List**

This is the consolidated list of dependencies required in `package.json` files across the monorepo.

#### **A. Global Development Dependencies (Root)**

* `turbo`: ^1.10.0 (Build system)  
* `typescript`: ^5.0.0  
* `wrangler`: ^3.0.0 (Cloudflare CLI)  
* `vitest`: ^1.0.0 (Testing)  
* `eslint`: ^8.0.0  
* `prettier`: ^3.0.0  
* `npm-run-all`: ^4.1.5

#### **B. Application Dependencies (Apps)**

**Remix Apps (`public`, `store`, `admin`):**

* `@remix-run/cloudflare`: ^2.8.0  
* `@remix-run/react`: ^2.8.0  
* `@remix-run/server-runtime`: ^2.8.0  
* `react`: ^18.2.0  
* `react-dom`: ^18.2.0  
* `isbot`: ^4.1.0 (Bot detection)  
* `remix-auth`: ^3.6.0 (Authentication)  
* `remix-auth-form`: ^1.4.0  
* `zod`: ^3.22.0 (Validation)  
* `zod-form-data`: ^2.0.0  
* `clsx`: ^2.0.0 (Styling)  
* `tailwind-merge`: ^2.0.0  
* `lucide-react`: ^0.300.0 (Icons)  
* `@radix-ui/react-*`: (Various primitives: dialog, slot, toast, label)

**Agent Worker (`agent`):**

* `hono`: ^4.0.0 (Optional lightweight router, or standard Fetch API)  
* `ai`: ^3.0.0 (Vercel AI SDK for streaming)  
* `@cloudflare/ai`: ^1.0.0 (Workers AI bindings)  
* `twilio`: ^4.23.0 (SMS/Voice SDK)

#### **C. Shared Package Dependencies**

**Database (`packages/db`):**

* `drizzle-orm`: ^0.30.0  
* `drizzle-kit`: ^0.20.0 (Dev dependency)  
* `better-sqlite3`: ^9.0.0 (For local mocking)

**UI System (`packages/ui`):**

* `tailwindcss`: ^3.4.0  
* `postcss`: ^8.4.0  
* `autoprefixer`: ^10.4.0  
* `class-variance-authority`: ^0.7.0

**Scraper (`packages/scraper`):**

* `@cloudflare/puppeteer`: ^0.0.10  
* `cheerio`: ^1.0.0-rc.12 (HTML parsing)

**PDF Generation (`apps/public`, `apps/store`):**

* `@react-pdf/renderer`: ^3.1.0  
* `qrcode`: ^1.5.3

**Email (`packages/email`):**

* `resend`: ^3.0.0 (or MailChannels fetch wrapper)  
* `@react-email/components`: ^0.0.12

**Utilities:**

* `date-fns`: ^3.0.0  
* `date-fns-tz`: ^2.0.0 (Timezone handling for diners)

### **4\. Cloudflare Bindings Summary**

For `wrangler.toml` configuration:

* **D1 Database:** `diner-core` (Bound to all apps)  
* **R2 Bucket:** `diner-assets` (Images, Logs, Doomsday snapshots)  
* **KV Namespace:** `diner-cache` (Hostname mapping, Session storage)  
* **Workers AI:** `AI` (Bound to `agent` and `store`)  
* **Queues:**  
  * `sms-inbound`  
  * `sms-outbound`  
  * `social-media-sync`  
  * `roi-reports`  
* **Durable Object:** `DinerAgent` (Exported by `agent`, bound to `store`)

**Phase 1: The Foundation & Monorepo Configuration**

* **Duration:** 1 Week  
* **Goal:** Establish a robust local development environment that mirrors the Cloudflare production ecosystem, utilizing a Monorepo structure for code sharing and efficiency.  
* **Key Deliverables:**  
  * **Monorepo Initialization:**  
    * Initialize a `pnpm` workspace using TurboRepo.  
    * Configure `tsconfig.base.json` with Strict Mode enabled for type safety.  
    * Set up global code quality tools: `eslint` and `prettier`.  
  * **Package Implementation:**  
    * `packages/ui`: Install Shadcn/UI, Tailwind CSS, and Radix primitives. Create the `cn()` utility function for class merging.  
    * `packages/config`: Define shared constants such as supported timezones and plan limits.  
    * `packages/db`: Install Drizzle ORM and `sqlite-core`.  
  * **Cloudflare Local Environment Setup:**  
    * Configure `wrangler.toml` files for empty placeholder apps (Admin, Store, Public).  
    * Verify that `wrangler dev` successfully launches all apps simultaneously on different ports.  
* **Definition of Done:** `pnpm dev` command successfully runs "Hello World" instances for Admin, Store, and Public apps concurrently.

**Phase 2: Data Architecture (The Source of Truth)**

* **Duration:** 2 Weeks  
* **Goal:** Implement the core database schema, enforce tenant isolation at the query level, and establish security boundaries.  
* **Key Deliverables:**  
  * **Schema Implementation (D1):**  
    * Create D1 tables: `tenants`, `menu_items`, `categories`, `operating_hours`, `authorized_users`.  
    * **Critical:** Add `deleted_at` (Soft Delete) and `tenant_id` columns to all relevant tables.  
    * **Critical:** Add a `version` column to `menu_items` to support optimistic locking for AI edits.  
  * **"Safe Query" Middleware:**  
    * Build a Drizzle wrapper in `packages/db`.  
    * **Logic:** Enforce a mandatory `tenantId` context for every query (e.g., `db.query.menu_items.findMany(..., { where: eq(tenant_id, ctx.tenantId) })`).  
  * **Seeding Script:**  
    * Create a script to populate a dummy tenant ("Joe’s Diner") with 5 sample menu items and standard operating hours for testing.  
* **Definition of Done:** Local D1 database allows structured queries via Drizzle Studio. Tenant isolation is verified; queries cannot cross tenant boundaries.

**Phase 3: The Public Site (Visitor Experience)**

* **Duration:** 2 Weeks  
* **Goal:** A high-performance, read-only Progressive Web App (PWA) that renders a functional diner website ("Joe's Diner").  
* **Core Objective:** Deliver a site that loads at `localhost`, displays the menu, accurately calculates "Open/Closed" status based on complex rules, and functions entirely offline.

**Key Deliverables:**

1. **Routing & Hostname Logic:**  
   * **Route Implementation:** Build `app/routes/$slug.tsx` to handle dynamic tenant pages.  
   * **KV Cache Layer:** Implement middleware that inspects the `Host` header.  
     * **Logic:** Look up the `tenant_id` in Cloudflare KV. If found, pass it to the Remix Loader. If missed, query D1 and populate KV (TTL: 60 mins).  
2. **Core Components:**  
   * **Menu Display:** Build `MenuSection` and `MenuItem` components.  
     * **Logic:** Implement "Empty Category Hiding" — `if (category.items.filter(is_available).length === 0) return null;`.  
   * **Status Display:** Build `HoursDisplay` component.  
     * **Logic:** Determine status based on the "Truth Hierarchy": Emergency Close \> Special Date/Holiday Rule \> Weekly Schedule (Split-Shift aware).  
3. **Theming Engine:**  
   * **Server-Side Injection:** Inject CSS variables (e.g., `--primary`, `--font-body`) into the `<head>` based on the Tenant DB configuration.  
   * **Constraint:** Must occur during Server-Side Rendering (SSR) to prevent Flash of Unstyled Content (FOUC).  
4. **Offline Capability:**  
   * **Service Worker:** Implement a Service Worker to cache `menu.json`, CSS, and critical assets, ensuring 100% offline functionality.  
5. **"Doomsday" Fallback:**  
   * **Static Generator:** Create a static `index.html` generator.  
   * **Worker Configuration:** Configure the Cloudflare Worker to catch 500 errors (Remix/DB crashes) and serve the static backup from R2 storage.

**Definition of Done:**

* "Joe's Diner" loads successfully at `localhost`.  
* Menu items render correctly with hiding logic for unavailable categories.  
* "Open/Closed" status is accurate based on current time and rules.  
* The site functions without a network connection (Offline Mode).

**Phase 4: Store Dashboard (Tenant Portal)**

* **Duration:** 3 Weeks  
* **Goal:** Build the secure, operational interface for diner owners (`/dashboard`), enabling menu management, schedule configuration, and visual settings via a Remix \+ Workers application.  
* **Key Deliverables:**  
  * **Authentication & Security (Module D):**  
    * **Magic Link Auth:** Implement passwordless login flow using `remix-auth`.  
      * *Flow:* User enters email \-\> System generates token (signed JWT) \-\> Emails link via `packages/email` \-\> User clicks link \-\> Session cookie set.  
    * **Turnstile Protection:** Integrate Cloudflare Turnstile widget on the login form to prevent bot abuse.  
    * **Session Management:** Implement secure HTTP-only cookies stored in Cloudflare KV (`diner-cache`).  
  * **Visual Menu Editor (Module B):**  
    * **Tree View UI:** Build a drag-and-drop interface (`dnd-kit` or similar) for organizing Categories and Menu Items.  
    * **Cloudflare Images Integration:**  
      * *Upload:* Direct Creator Upload (DCU) implementation. Client requests one-time URL \-\> Uploads directly to Cloudflare \-\> Returns ID.  
      * *Optimization:* Display logic using Cloudflare Image variants (e.g., `avatar`, `thumbnail`).  
    * **AI Assistants (Stubbed):** Add UI triggers for "Generate Description" and "Detect Allergens" (Logic implementation connected in Phase 5).  
  * **Operations Center (Module C):**  
    * **Hours Matrix:** Create a complex grid component supporting "Split Shifts" (multiple start/end times per day).  
      * *Validation:* Ensure end time \> start time; no overlapping blocks.  
    * **Holiday Calendar:** Build a UI to manage the `special_dates` table.  
      * *Features:* List federal holidays, allow status toggle (Open/Closed/Limited), add custom dates.  
    * **Emergency Controls:** Implement the "Big Red Button" UI.  
      * *Action:* Updates `business_settings.emergency_close_reason` and triggers a "Cache Purge" event.  
  * **Settings & Compliance (Module D):**  
    * **Notification Preferences:** UI to update `authorized_users` JSON preferences (e.g., toggle SMS for reviews).  
    * **Zaraz Configuration:** Form to save pixel IDs to `business_settings`. (Background sync logic stubbed).  
  * **Marketing Assets (Module D):**  
    * **QR Flyer Route:** Create resource route `routes/api.flyer.ts` using `@react-pdf/renderer`.  
      * *Output:* dynamically generated PDF containing the diner's WiFi code (from settings) and a QR code pointing to the public URL.  
* **Definition of Done:**  
  * Owners can log in via Magic Link (protected by Turnstile).  
  * Menu items can be created, edited, reordered, and deleted via the Visual Editor.  
  * Images can be uploaded directly to Cloudflare and displayed.  
  * Operating hours (including split shifts) and holidays persist correctly to D1.  
  * Emergency Close button successfully updates the database state.  
  * PDF Flyer generates and downloads correctly.

**Phase 5: Advanced & Automation (Onboarding & Marketing)**

* **Duration:** 3 Weeks  
* **Goal:** Automate the "Magic Start" onboarding process using Cloudflare Browser Rendering and Workflows, and enable dynamic marketing asset generation (`api.flyer.ts`, `api.og.ts`) to maximize tenant value immediately upon signup.  
* **Key Deliverables:**  
  * **Browser Rendering Service (`packages/scraper`):**  
    * **Puppeteer Implementation:** Configure `@cloudflare/puppeteer` to launch headless Chrome sessions within a Worker.  
    * **Extraction Logic:** Build extractors for:  
      * **JSON-LD:** Identify and parse `application/ld+json` blocks (Restaurant, Menu).  
      * **Meta Tags:** Extract `og:image`, `description`, `title`.  
      * **High-Res Assets:** Identify largest image candidates (\>1000px) for hero backgrounds.  
    * **Fallback Logic:** If the target URL returns 404/DNS error, query the **Wayback Machine API** for the most recent valid snapshot.  
  * **Onboarding Workflow (`services/workflows`):**  
    * **Cloudflare Workflow Orchestration:** Define a multi-step, durable workflow:  
      * **Ingest:** Receive Business Name & Address.  
      * **Scrape:** Trigger Scraper Service (Step 1).  
      * **Parse (AI):** Pipe scraped text to **Workers AI (Llama 3\)** with a schema-enforcing prompt to output valid `menu_items` JSON.  
      * **Hydrate:** Upload valid images to Cloudflare Images; discard broken links.  
      * **Provision:** Write to D1 (`tenants`, `menu_items`) and trigger SSL for SaaS (`custom_domain`).  
  * **Visual Diff UI (Admin Module):**  
    * **Interface:** Build a split-pane view in `/admin`. Left: Live Iframe of source site. Right: Parsed JSON tree.  
    * **Interaction:** Allow Admin to manually correct AI hallucinations (e.g., price extraction errors) before committing to D1.  
  * **Dynamic Marketing Assets (`apps/public`):**  
    * **PDF Generator:** Implement `routes/api.flyer.ts` using `@react-pdf/renderer`.  
      * *Logic:* Fetch WIFI credentials and Logo from `theme_config`. Generate QR code linking to the live site. Render print-ready PDF (CMYK profile if possible, otherwise high-res RGB).  
    * **Satori OG Images:** Implement `routes/api.og.ts`.  
      * *Logic:* Accept `?item_id` query param. Fetch item details. Render a JSX template (Photo \+ Price \+ "Today's Special") to PNG using Satori \+ Resvg (WASM). Cache at Edge.  
  * **Voice & Vision AI Stub:**  
    * **Whisper Integration:** Set up the basic worker handler to receive audio blobs and return text.  
    * **Vision Analysis:** Set up the basic worker handler to receive image blobs, run Llama 3 Vision, and return a JSON description (e.g., "Burger with fries on a wooden board").  
* **Definition of Done:**  
  * Admin can input a URL, and the system auto-generates a complete, functional diner site with \>80% accuracy.  
  * Scraper successfully handles 404s via Wayback Machine fallback.  
  * PDF Flyers are generated on-the-fly with correct QR codes.  
  * Social sharing links (Facebook/Twitter) display dynamic, food-specific images instead of generic logos.

**Phase 6: Polish, Compliance & Fleet Management**

* **Duration:** 2 Weeks  
* **Goal:** Finalize the platform for production by implementing legal compliance (A2P 10DLC), hardening security (WAF), enabling fleet-wide oversight (Billing/Logs), and activating deep telemetry. This phase ensures the "Super Admin" has full visibility and control over the deployed fleet.

**Key Deliverables:**

1. **Compliance & Legal (Module B/D):**  
   * **A2P 10DLC Registration:** Implement the interface and API calls to register tenants' business profiles and campaigns with Twilio to ensure SMS deliverability.  
   * **Liability Disclaimers:** Verify global footer injection of the AI dietary disclaimer across all tenant sites.  
2. **Security & Infrastructure (Module C):**  
   * **Aggregator Shield (WAF):** Configure Cloudflare WAF Custom Rules to identify and block User-Agents from known delivery platforms (DoorDash, UberEats, GrubHub) to prevent unauthorized menu scraping.  
   * **Secrets Management:** Finalize the rotation and storage strategy for Stripe and Twilio API keys in Cloudflare Secrets.  
   * **Immutable Audit Logs:** Configure **R2 Logpush** to capture all mutation events (D1 writes, Config changes) and store them in an R2 bucket (Data Catalog) for compliance auditing.  
3. **Fleet Management (Module A \- Super Admin):**  
   * **Tenant Operations:**  
     * **List/Filter:** Build the Admin UI to filter tenants by Revenue (Stripe), Deployment Status, and Version Channel (Stable/Beta).  
     * **Impersonation:** Implement "Log In As Owner" logic using `remix-auth` to generate a short-lived session token for support staff.  
     * **Global Broadcast:** Create a system to inject dismissible notification banners into all Tenant Dashboards (e.g., "Scheduled Maintenance").  
   * **Billing Integration:**  
     * **Stripe Connect:** Finalize the status webhook listeners to sync `subscription_status` in D1 with Stripe events.  
4. **Telemetry & Analytics (Module D):**  
   * **Web Analytics:** Inject the Cloudflare Web Analytics JS snippet into the `root.tsx` of the Public Site app.  
   * **Usage Alerts:** Configure a Cron Trigger (Worker) to scan `menu_items` for staleness (`last_updated` \> 7 days) and dispatch reminder emails via `packages/email`.  
   * **AI Monitor:** Implement a dashboard widget in Admin to visualize token consumption (Llama 3/Whisper) per tenant to track costs.

**Definition of Done:**

* Tenants can successfully send SMS messages (A2P registered).  
* Scrapers from DoorDash/UberEats are blocked (403 Forbidden).  
* Super Admin can search tenants, log in as them, and see billing status.  
* System logs are actively flowing to R2.  
* Stale tenants receive automated engagement emails.

