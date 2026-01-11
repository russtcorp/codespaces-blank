# Store Dashboard (Phase 4)

Protected tenant portal for owners/managers to manage their diner.

## Features Implemented

### Authentication
- **Magic Link Login** (`/login`) - Email-based passwordless auth with MailChannels integration
- **Token Verification** (`/verify`) - Anti-scanner confirmation page
- **Session Management** - 7-day secure cookie sessions
- **Logout** - Session destruction

### Dashboard Layout
- **Protected Routes** - Auth check in `dashboard.tsx` parent route
- **Sidebar Navigation** - Icon-based nav (Dashboard, Menu, Hours, Operations, Settings)
- **Top Navigation** - User email, role display + logout button
- **Responsive Design** - Mobile-friendly layout

### Menu Management (`/dashboard/menu`)
- View all categories with item counts
- Add/edit/delete categories with modals
- View items per category
- Add/edit items with full form (name, description, price, dietary tags)
- Image upload to R2 with preview
- Dietary tag verification checkbox (liability protection)
- Toggle item availability ("86" button)
- Delete items with confirmation
- Real-time updates with optimistic UI
- Cache invalidation on all changes

### Hours Management (`/dashboard/hours`)
- 7-day grid showing all time blocks
- Add multiple shifts per day (split shift support)
- Remove individual shifts
- Inline time pickers
- Cache invalidation on changes

### Operations (`/dashboard/operations`)
- **Emergency Close Toggle** - Instant close with reason input
- **Special Dates** - Add/remove holiday closures or custom hours
- Visual status indicators
- Public site updates immediately

### Settings (`/dashboard/settings`)
- **Business Information:**
  - Address editing
  - Public phone editing
  - Timezone selection
- **Theme Customization:**
  - Primary/secondary color pickers
  - Heading/body font selectors
  - Layout style selection
  - Live updates to public site

## Routes

```
/                           → Redirect to /login
/login                      → Email login form with MailChannels integration
/verify?token=...          → Confirmation page (anti-scanner)
/logout                     → Destroy session
/dashboard                  → Dashboard home (protected)
/dashboard/menu             → Full menu CRUD with image upload
/dashboard/hours            → Hours matrix
/dashboard/operations       → Emergency close + special dates
/dashboard/settings         → Business info + theme customization
/api/upload                 → Image upload to R2
```

## Auth Flow

1. User enters email at `/login`
2. System generates magic link token (15min TTL)
3. Token stored in KV with email+tenantId
4. Email sent with verification link (currently logged to console in dev)
5. User clicks link → `/verify?token=...`
6. Confirmation button prevents email scanners from auto-clicking
7. On confirm: token validated, session created, redirect to `/dashboard`

## Data Access

All mutations use `createTenantDb` for tenant isolation:
```ts
const db = createDb(env.DB);
const tdb = createTenantDb(db, session.tenantId);
await tdb.select(categories);
```

## Session Data

Stored in secure HTTP-only cookie:
- `userId` - Authorized user ID
- `tenantId` - Tenant scope
- `email` - User email
- `role` - 'owner' or 'manager'
- `permissions` - Array of permission strings

## Dependencies

- `remix-auth` - Auth framework
- `@dnd-kit/*` - Drag-and-drop (ready for future)
- `zod` - Schema validation
- `date-fns` - Date utilities
- `@radix-ui/react-dialog` - Modals
- `@radix-ui/react-toast` - Toast notifications

## Running

```bash
pnpm dev  # Starts on port 8789
```

## Environment Variables

Requires in `.dev.vars`:
```
SESSION_SECRET=your-secret-key-here
MAILCHANNELS_API_KEY=optional-for-email
```

Wrangler bindings required:
- `DB` - D1 database
- `KV` - Session and token storage
- `R2` - Image uploads

## Phase 4 Status

✅ Complete authentication (magic link + sessions)
✅ Protected dashboard layout with sidebar nav
✅ Full menu CRUD with modals
✅ Image upload to R2 with preview
✅ Category edit/delete
✅ Item edit/delete with confirmation
✅ Hours matrix CRUD
✅ Emergency close toggle
✅ Special dates management
✅ Settings page (business info + theme)
✅ Cache invalidation on all mutations
✅ Toast notifications
✅ Email integration (MailChannels)
✅ Form validation schemas (Zod)
⏳ Drag-and-drop reordering (dependencies installed)
⏳ SMS OTP backup (helpers ready, route needed)
⏳ User management (future phase)
⏳ Permission-based access control (future phase)
