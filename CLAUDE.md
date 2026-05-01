# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build (output to `dist/`)
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint across the project
- `npx tsc --noEmit` — Type-check the codebase (TypeScript files only; JS files coexist via `allowJs: true, checkJs: false`)
- `npx supabase db query --linked < supabase-migration.sql` — Run SQL against the linked Supabase project. Requires `SUPABASE_ACCESS_TOKEN` in env. (Migrations are now usually run via the dashboard SQL editor — see Migration Workflow section.)

No test framework is configured.

## Deployment

GitHub `main` → Cloudflare Pages (auto-deploy). Any commit pushed to `main` deploys to production. There is no staging environment. Local edits never reach production until pushed — `git push origin HEAD:main` is the standard ship step. PRs are not currently used; direct-to-main is the established pattern.

## Tech Stack

React 19, Vite 8, React Router DOM 7, Supabase (PostgreSQL + Auth + Edge Functions), Stripe (PaymentElement + webhooks via Edge Functions), Anthropic SDK (Claude API), ESLint 9 flat config, **TypeScript 6** (per-file adoption), **Tailwind CSS v4** (per-component adoption).

**TypeScript** is configured (`tsconfig.json`) and ready for use on a per-file basis. Existing `.jsx` files are unchanged and unchecked (`allowJs: true`, `checkJs: false`); any new file written as `.tsx` gets full strict type-checking. Shared types live in `src/lib/types.ts` (Profile, Client, Application, ServiceTicket, AppScreenshot, MarkupSet, etc.). No migration deadline — convert files when you touch them.

**Tailwind CSS v4** is wired in via `@tailwindcss/vite`. Theme tokens in `src/index.css` (under the `@theme {}` block) reference the existing CSS variables. Note: Tailwind v4's default palettes (slate, stone, neutral) collide with our `@theme` overrides of the same name, so for those colors prefer arbitrary values like `text-[var(--slate)]` over `text-slate`. Most existing components still use the custom CSS classes in `App.css`; per-component Tailwind migration is opportunistic, not required.

## Architecture

### Entry & Auth Flow

`index.html` → `src/main.jsx` (BrowserRouter) → `src/App.jsx`

App.jsx is the central hub. On mount it checks the Supabase session, fetches the user's profile, and **routes based on role**:

- `profile.role === 'client'` → renders `<ClientPortal />` (entirely separate component tree under `/portal/*`)
- Any other role → renders the admin app with its sidebar + topbar
- Public token-shared routes (`/sign/:token`, `/invoice/:token`) and `/onboard` render outside the auth gate
- `/accept-invite` renders before any auth check so it can handle the magic-link handoff (newly invited portal users land here to set their password + name before entering the portal)

`App.jsx` destructures ALL admin data from `useSupabaseData()` and passes props down to every page. ClientPortal has its own data hook (`useClientPortalData`) — see Client Portal section.

### Layout

Admin: fixed dark sidebar (`Sidebar.jsx`) + `TopBar.jsx` (with `NotificationBell.jsx`) wrapping a `<Routes>` outlet. Sidebar is collapsible. Pages with `page--fill` class fill viewport height.

Client portal: separate `<PortalSidebar />` + `<PortalTopBar />` + content area. The `app__content` and `portal-content` containers each manage their own scrolling.

### Data Layer

Two parallel hooks for two parallel apps:

**Admin: `src/hooks/useSupabaseData.js`** — single source of truth for the admin app. Loads all entities in one `Promise.all` on mount, exposes setters built by a `makeSetter()` factory. Each setter auto-syncs to Supabase, auto-logs to the activities feed, and auto-converts snake_case (DB) ↔ camelCase (React).

**Portal: `src/hooks/useClientPortalData.js`** — scoped data hook for the client portal. Loads only the active client's data (filtered by `client_id` from `client_users`). Supports multi-company users via `setActiveClientId` (the topbar shows a switcher when a user belongs to >1 client).

**Entities currently managed:**
- Core admin: clients, projects, sows, activities, settings, invoices, timeEntries, events, contractors, deals, crmActivities, channelPartners, documents, notifications, automations, recurringExpenses, financeEntries, taxPayments
- Portal foundation (Phase 1): clientUsers (auth user ↔ client mapping), profiles (with role: admin/user/contractor/guest/**client**)
- Phase 4c: projectMilestones (admin defines, client approves/rejects via RPC)
- Phase 4d: serviceTickets, ticketComments (threaded support)
- Phase 4e: applications (living deliverables — clients OWN apps, projects BUILD them)
- Phase 5: appScreenshots, annotationPins, markupSets (visual review workflow)

**To add a new entity:**
1. Add the table to `supabase-migration.sql` with RLS policies (admin: all; client: scoped if relevant)
2. Add the camelCase interface to `src/lib/types.ts`
3. In `useSupabaseData.js`: add to TABLE_COLUMNS map, add useState, add to loadAll Promise.all, add a makeSetter call, return it
4. If the portal also needs it, repeat in `useClientPortalData.js` with appropriate filtering
5. In `App.jsx` (and/or `ClientPortal.jsx`): destructure from hook, pass as props to relevant routes

### Props-Down Pattern

Pages do NOT call Supabase directly for routine CRUD — all mutations go through setters from the hook so activity-logging stays consistent.

**Exceptions (intentional):**
- `Onboarding.jsx` — public insert into `onboarding_submissions`
- `OnboardingReview.jsx` — reads `onboarding_submissions`
- Public token-shared pages (`/sign`, `/invoice`) — call SECURITY DEFINER RPCs instead of direct queries (Phase 3 RLS blocks anon table reads)
- `AcceptInvite.jsx` — authenticated user updating own profile + own client_users row
- Portal write paths that need to bypass admin-only RLS — use RPCs (e.g. `client_decide_milestone`)
- `AppScreenshotsSection` / `MarkupSetWorkspace` — call supabase directly for screenshot/pin CRUD because the section is shared between admin and portal contexts

## Client Portal (Phases 1–5)

The portal is a parallel React app living under `/portal/*`, mounted by `App.jsx` when `profile.role === 'client'`. Routes:

- `/portal` — dashboard (KPI cards, recent projects/invoices/applications)
- `/portal/projects`, `/portal/projects/:id` — projects list + detail (with milestone approval UI)
- `/portal/applications`, `/portal/applications/:id` — apps list + detail (with billing summary, status, screenshots/markup modal)
- `/portal/invoices` — list with View & Pay (opens `/invoice/:token` in new tab)
- `/portal/proposals` — list with Review & Sign + direct PDF download
- `/portal/expenses` — recurring expenses list
- `/portal/tickets`, `/portal/tickets/:id` — service ticket list + threaded detail
- `/portal/documents` — file list with download links
- `/portal/account` — profile, role, sign out

### Public Share-Token Routes (legacy, now via RPCs)

Phase 3 hardened RLS so anon users can no longer SELECT directly from tables. The public `/sign/:token` and `/invoice/:token` pages now call SECURITY DEFINER RPCs that bypass RLS and validate the token internally:

- `get_invoice_by_token(token)` / `get_client_by_invoice_token(token)`
- `mark_invoice_manual_processing(token)` — public bank-transfer flow
- `get_sow_by_token(token)` / `get_client_by_sow_token(token)`
- `accept_sow_by_token(token, signature, notes, selections, snapshot, packages)`
- `decline_sow_by_token(token, notes, selections)`

Settings table (used by these pages for branding) keeps `FOR SELECT TO anon, authenticated USING (true)` since it's not sensitive.

### Client Portal Invite Flow (Phase 1)

1. Admin clicks "Invite User" on a client's Portal Access tab → fills email + portal_role (owner / billing / viewer)
2. The `invite-client-user` Edge Function (Deno + service role): verifies caller is admin, calls `auth.admin.inviteUserByEmail`, force-updates the new profile to `role='client'` (the `on_auth_user_created` trigger creates it as 'admin' by default; we override), upserts a `client_users` row, logs an activity
3. Invitee receives a Supabase magic-link email (sent via Resend SMTP — configured in Supabase Auth settings)
4. Invitee clicks link → lands on `/accept-invite` which collects full name + password, calls `auth.updateUser({ password, data })`, updates `profiles.full_name`, marks `client_users.accepted_at`, redirects to root
5. App.jsx role check routes them to `<ClientPortal />`

The `client` role MUST be in the `profiles.role` CHECK constraint. The Phase 3 migration adds it; if you're working on a fresh DB, ensure that CHECK includes 'client'.

### Multi-Company Portal Users

A single auth user can belong to multiple client companies via multiple `client_users` rows. `useClientPortalData` exposes `linkedClients` and `setActiveClientId`; PortalTopBar shows a `<select>` switcher when there's more than one. All scoped queries use `activeClientId`, so switching companies reloads everything for that company.

## Applications (Phase 4e)

A new top-level entity that sits alongside Clients and Projects:
- **Client** = the company you work with
- **Project** = a finite engagement (build phase)
- **Application** = a *living* deliverable that exists post-launch and gets *maintained* over time

A project BUILDS an application; an application is what gets MAINTAINED. Hosting, monitoring, recurring billing, support tickets, and visual markup all hang off applications rather than projects.

`applications` table fields: client_id, name, description, url, type (website/web-app/mobile-app/api/other), status (planning/in-development/staging/live/maintenance/archived), launched_at, monthly_cost, notes, **thumbnail_url** (data URI), metadata (JSONB).

Apps live as a tab on the admin client profile page (`Clients.jsx` → ClientProfile → "Applications" tab) and as their own section in the portal (`PortalApplications`, `PortalApplicationDetail`). Both surfaces share the `<AppCard />` component (`src/components/AppCard.jsx`) which renders the 16:9 thumbnail + title + status pill + URL link.

`recurring_expenses.application_id` is an optional FK so a hosting/SaaS expense can roll up under the right app's billing summary.

## Service Tickets (Phase 4d)

Threaded support inside the portal.

Tables:
- `service_tickets` — subject, description, priority (low/normal/high/urgent), status (open/in_progress/resolved/closed), optional application_id and project_id for context, submitted_by, assigned_to
- `ticket_comments` — body, author_id, **is_internal** boolean (admin-only notes hidden from the client by RLS)

Status flow: `open` → `in_progress` (admin starts work or replies non-internally) → `resolved` (admin marks done) → `closed`. Reopen from any state pre-`closed`.

RLS:
- Tickets: admin all; client SELECT/INSERT for own client_id; updates admin-only
- Comments: admin all; client sees + posts non-internal comments on own tickets; the `is_internal AND ...` check in the SELECT policy prevents internal notes from leaking

Admin inbox at `/tickets`. Portal inbox at `/portal/tickets`. Both use the same threaded UI.

## Visual Markup (Phase 5 + 5b)

Visual review workflow tied to applications. Tables:
- `app_screenshots` — image_url (data URI for now; will be Storage in future), caption, captured_by, **set_id** (FK to markup_sets, nullable for legacy/unfiled)
- `annotation_pins` — screenshot_id, x_pct, y_pct (percentages so pins stay positioned at any rendered size), body, status (open/resolved), author_id, resolved_by/at
- `markup_sets` (Phase 5b) — name, description, target_date, status (active/completed/archived), application_id

Sets group screenshots into a "review package" (e.g. "Pre-launch QA", "Phase 2 review") so old and new markups don't mix. Admin can mark a set complete only when ALL its pins are resolved.

The shared component tree:
- `<AppScreenshotsSection />` — top-level dispatcher: shows a sets list OR the workspace for a selected set
- `<MarkupSetWorkspace />` — for a selected set: top bar (name, status, mark complete button), color-coded sidebar (pins grouped by screenshot), main viewer with prev/next nav + keyboard arrows
- `<AnnotatedScreenshot />` — renders the image + overlaid pins, click-to-add-pin with comment popup. Supports controlled mode via `forceExpandPinId` so the workspace sidebar can drive which pin's popup is open.

Both admin (`Clients.jsx` → Applications tab → "Markups" button on each app card) and portal (`PortalApplicationDetail` → "Open Markup Reviews" button) open the same workspace inside a 95vw × 94vh modal.

Image upload supports: file picker, drag-drop, **paste from clipboard** (Ctrl+V works anywhere on the page; ignores text inputs). Stored as base64 data URIs in `image_url` (5MB cap). Phase 5+ migration to Supabase Storage is planned.

## Row Level Security (Phase 3)

After Phase 3, RLS is enforced on every table. Two helper functions back all the policies:

```sql
auth_is_admin()       -- true if profile.role = 'admin'
auth_client_ids()     -- returns text[] of client_ids the caller is in client_users for
```

Pattern A: client-scoped tables (clients, projects, sows, invoices, documents, recurring_expenses, applications):
```sql
USING (auth_is_admin() OR client_id = ANY(auth_client_ids()))
```

Pattern B: admin-only tables (time_entries, events, contractors, deals, crm_activities, channel_partners, automations, automation_logs, activities, finance_entries, tax_payments):
```sql
FOR ALL USING (auth_is_admin())
```

Pattern C: per-user (notifications, client_users, profiles, ticket_comments):
- Custom predicates per table (own row checks via `auth.uid()`)

Pattern D: anon access via SECURITY DEFINER RPCs — no anon SELECT/UPDATE policies on the underlying tables; instead the RPC validates the token and runs as the function owner.

If you're adding new tables, follow these patterns and **don't re-introduce permissive policies**.

### RBAC

`src/lib/permissions.js` exports `can(role, permission)`. Five roles: admin, user, contractor, guest, **client**. The `client` role has no admin-app permissions (clients route to the portal entirely; permissions inside the portal are checked by the data-scoping in `useClientPortalData` + `portalRole` field on the client_users row: owner/billing/viewer).

## Supabase

- Client init: `src/lib/supabase.js`, credentials in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Project ref: `qbrcqkgkzcwgnsmdyegd`
- Schema files:
  - `supabase-schema.sql` — full schema for fresh databases
  - `supabase-migration.sql` — append-only incremental migrations (uses `IF NOT EXISTS` and `DO $$ BEGIN ... EXCEPTION` blocks for idempotency)
- Auth: email/password + magic-link invites via Resend SMTP

### Migration Workflow

The `supabase-migration.sql` file is the canonical record of every DB change. When adding a migration:
1. Append the new SQL block at the bottom (with a `-- ============= PHASE Xy =============` header comment)
2. Make it idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, etc.)
3. Provide the user the same SQL block to run in the Supabase SQL Editor (https://supabase.com/dashboard/project/qbrcqkgkzcwgnsmdyegd/sql/new). Don't expect them to use the CLI — multiple runs have failed via `npx supabase db query` because of access token issues.

### Supabase Edge Functions

Deno functions in `supabase/functions/`:
- `create-payment-intent` — Stripe PaymentIntent for invoice share-token flow (`verify_jwt = false`)
- `stripe-webhook` — Stripe payment events → updates invoice (`verify_jwt = false`)
- `list-stripe-methods` — Returns enabled Stripe payment method labels (`verify_jwt = false`)
- `invite-client-user` — admin-only client portal invite (verifies caller, sends invite, creates profile + client_users link). Default `verify_jwt = true`.

All four use service-role auth on the Supabase side (no client JWT required for the share-token ones; admin JWT required for invite).

Deploy: `npx supabase functions deploy <name>` from project root after running `npx supabase link`.

## Stripe Integration

Frontend uses `@stripe/react-stripe-js <PaymentElement>`. Configuration in `src/lib/stripe.js`:
- `stripePromise` — loaded from `VITE_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_CONFIGURED` — boolean fallback flag for "no Stripe = manual bank transfer only"
- `getStripeAppearance()` — reads `data-theme` so the Payment Element matches dark/light mode

Bank details (manual transfer fallback) are shown in the live payment panel only — never embedded in the downloadable PDF.

## AI Integration

`src/lib/aiClient.js` calls Claude API. Two modes:
- Direct browser if `VITE_ANTHROPIC_API_KEY` set (dev only — key exposed)
- Edge Function proxy if `VITE_AI_ENDPOINT` set (production)

`src/data/aiTemplates.js` defines pre-built prompt templates. The AI Assistant page injects business context via `buildContext()`.

## Email

**Transactional email** (Supabase Auth invites, password resets) goes through **Resend SMTP**, configured in Supabase Dashboard → Auth → SMTP Settings:
- Host: `smtp.resend.com` · Port: `465` · User: `resend` · Password: Resend API key
- Sender: `noreply@cladforgesystems.com` (custom domain verified in Resend)

**Invoice & proposal emails** still use the legacy `mailto:` + clipboard pattern (the user pastes the formatted body over the single-line `mailto:` body that Proton Mail strips). Template codes (Settings):
`{{name}}`, `{{full_name}}`, `{{recipient_email}}`, `{{invoice_number}}` / `{{proposal_number}}`, `{{invoice_link}}` / `{{proposal_link}}`, `{{project_title}}`, `{{total_due}}` / `{{total_amount}}`, `{{due_date}}`, `{{valid_until}}`, `{{payment_terms}}`, `{{client_company}}`, `{{company_name}}`, `{{company_email}}`, `{{company_phone}}`, `{{owner_name}}`, `{{br}}` (literal newline).

## Branded PDF Rendering

Two shared modules:
- `src/pages/Invoices.jsx` exports `buildInvoiceHTML(invoice, client, settings)` — used by both admin Invoices page and public InvoiceView for identical PDF output
- `src/lib/proposalPdf.js` exports `buildProposalHTML` and `downloadProposalPDF` — same pattern for proposals

Pattern: `window.open('')` → `w.document.write(html)` → `setTimeout(() => w.print(), 500)`. Logo and brand tokens come from `src/lib/brand.js` (`CLAD_FORGE_LOGO_DATA_URI`, `BRAND`, `BRAND_FONTS_LINK`).

Invoice PDF download is available anytime (was originally gated to paid-only, ungated per client feedback). Same pattern for proposals.

## Image Upload Pattern

Used in three places: client thumbnails (clients.brand_logo_url), application thumbnails (applications.thumbnail_url), and screenshot uploads (app_screenshots.image_url).

Shared approach:
1. `<input type="file" accept="image/*">` (visually hidden, wrapped in a styled label)
2. `FileReader.readAsDataURL(file)` → base64 data URI
3. Stored directly in TEXT column (no Supabase Storage bucket yet)
4. Size cap: 2MB for thumbnails, 5MB for screenshots — enforced client-side

For screenshots specifically, the `<AppScreenshotsSection>` and `<MarkupSetWorkspace>` also support:
- **Paste from clipboard** (`Ctrl+V` anywhere on page, ignores text inputs)
- **Drag and drop** (with visual overlay during drag)
All three paths funnel into the same `uploadFile(file)` handler.

Future Phase: migrate to Supabase Storage with proper buckets (will be required when auto-screenshot capture for markup lands; large-volume image storage in TEXT columns isn't viable long-term).

## Styling

Two CSS files: `src/index.css` (CSS variables, base) and `src/App.css` (all component styles, ~3000 lines, organized by section comments).

Key conventions:
- CSS variables on `:root` with `data-theme` attribute for light/dark switching
- Brand color: `--brand` (#ff8c00 amber) with `--brand-pale`, `--brand-wash`, `--brand-mid` variants
- Fonts: Plus Jakarta Sans (display), Inter (body), JetBrains Mono (data) via Google Fonts
- Reusable patterns: `.panel`/`.panel__header`, `.stat-card`, `.modal-overlay`/`.modal`, `.form-group`/`.form-grid`, `.btn`/`.btn--primary`/`.btn--secondary`/`.btn--ghost`/`.btn--sm`, `.filter-chip`, `.status-pill`, `.data-table`
- Status pills come in many variants: `.status-pill--{status}` for project stages, `.status-pill--app-{status}` for applications, `.status-pill--ticket-{status}` for tickets, `.status-pill--mset-{status}` for markup sets, `.priority-pill--{priority}` for ticket priority
- `@layer base { ... }` is used for the global `a { color: var(--brand) }` rule so Tailwind utilities can override on a per-element basis (otherwise unlayered CSS wins the cascade)
- Pages that should fill viewport: add `page--fill` class

## ESLint

- `no-unused-vars` ignores identifiers matching `^[A-Z_]` — prefix unused destructured vars with `_`
- React Refresh plugin active — exported components must be direct function declarations
- TypeScript files use `typescript-eslint` recommended; same capital-letter ignore convention
- `supabase/functions/**` is in globalIgnores (Deno files have their own runtime/typings)

## Codebase Conventions

- **Always confirm destructive actions** — every delete must go through `window.confirm()`. Past data loss from unconfirmed deletes is the reason this rule exists.
- **No hardcoded colors** — the app has a working light/dark theme via `data-theme` and CSS variables. Use `var(--brand)`, `var(--ink)`, `var(--slate)`, `var(--success)`, `var(--danger)` etc.; never raw hex values in JSX or App.css rules.
- **Activity feed is implicit** — the `makeSetter()` factory auto-logs an entry on every insert/update/delete via the activities entity. Don't manually push to `activities` from page code; let the setter do it.
- **Settings is a singleton** — single row with `id = 'default'`. `setSettings(updater)` upserts that row.
- **Run migrations yourself; don't ask the user to.** When a feature needs SQL, append it to `supabase-migration.sql` AND give the user a copy-paste block for the SQL Editor. Don't say "please run X" without providing the exact SQL.

## Proton Drive Sync — KNOWN HAZARD

**The project lives on Proton Drive, which has bitten the codebase multiple times.** Symptoms:
1. **"Name clash" duplicate files** — Proton creates files like `useSupabaseData (# Name clash 2026-04-30 n41ff3C #).js` when its sync conflicts with active edits. These get accidentally committed if you `git add -A` blindly. **Always check `git status --short | grep -i "Name clash"` before committing.** If found, `git rm` them and recommit.
2. **Silent reverts** — sometimes Proton will overwrite recent edits with an older version mid-session. If a section of code you JUST wrote isn't there when you re-read the file, it's likely Proton. The fix is to rewrite the affected section. This has happened on `AcceptInvite.jsx`, `useSupabaseData.js`, and `PortalSidebar.jsx` so far.
3. **Path resolution issues** — running CLI commands from inside the Proton Drive path can fail because of restricted permissions or the path's special chars (parentheses, spaces). Use `Set-Location -LiteralPath` instead of `cd` on Windows.

If a fresh session is doing extensive file work, expect this to happen at least once. Don't panic — re-read, re-write the lost section, re-commit.

## Phase Status (rough timeline)

The build progressed through clearly-labeled phases. Each phase shipped as its own commit with a detailed message; `git log --oneline` will give the chronology. Rough summary:

- **Phase 1** — Client portal foundations: client_users table, invite-client-user edge function, AcceptInvite page (password + name), role gate in App.jsx
- **Phase 2** — Read-only client portal: full sidebar/topbar/dashboard/projects/invoices/proposals/recurring/documents/account
- **Phase 3** — RLS hardening: helper functions (auth_is_admin, auth_client_ids), strict policies on every table, RPCs for share-token public flows. **The security boundary that allows real clients to be invited.**
- **Phase 4a** — Pay invoices when logged in: drafts filtered, direct PDF download from portal
- **Phase 4b** — Proposals view/download: extracted `proposalPdf.js`, ungated download
- **Phase 4c** — Project milestones with client approval (separate from `projects.deliverables` checklist; explicit decision points with audit trail and `client_decide_milestone` RPC)
- **Phase 4d** — Service tickets: tickets + comments with internal/external visibility, app-aware
- **Phase 4e** — Applications: new top-level entity (clients OWN apps, projects BUILD them); thumbnails (manual upload), monthly cost rollup via `recurring_expenses.application_id`
- **Phase 5** — Screenshot annotation: app_screenshots + annotation_pins, paste/drop/picker upload, click-to-pin overlay
- **Phase 5b** — Markup sets: review packages with sidebar nav, prev/next, keyboard arrows, mark-set-complete

**Stack modernization** (parallel to phases): TypeScript installed and configured for per-file adoption; Tailwind v4 installed and configured. PortalSidebar partially migrated (TS kept, Tailwind reverted due to v4 palette-name collisions — see Tech Stack note).

When starting new feature work in a fresh session, read recent commit messages for context (`git log --oneline -20`).
