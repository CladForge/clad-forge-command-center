# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build (output to `dist/`)
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint across the project
- `npx supabase db query --linked < supabase-migration.sql` — Run SQL against the linked Supabase project (for migrations). Requires `SUPABASE_ACCESS_TOKEN` in env.

No test framework is configured.

## Deployment

GitHub `main` → Cloudflare Pages (auto-deploy). Any commit pushed to `main` deploys to production. There is no staging environment. Local edits never reach production until pushed — `git push origin HEAD:main` is the standard ship step (recent commit history shows direct-to-main is the established pattern; PRs are not currently used).

## Tech Stack

React 19 (JSX, no TypeScript), Vite 8, React Router DOM 7, Supabase (PostgreSQL + Auth + Edge Functions), Stripe (PaymentElement + webhooks via Edge Functions), Anthropic SDK (Claude API), ESLint 9 flat config.

## Architecture

### Entry & Auth Flow

`index.html` → `src/main.jsx` (BrowserRouter) → `src/App.jsx`

App.jsx is the central hub: it checks Supabase session on mount, gates all routes behind auth except `/onboard`, destructures ALL data from `useSupabaseData()`, and passes props down to every page. Unauthenticated users see `Login.jsx`. The `/onboard` route renders `Onboarding.jsx` outside the auth gate for public client intake.

### Layout

Fixed dark sidebar (`Sidebar.jsx`) + `TopBar.jsx` (with `NotificationBell.jsx`) wrapping a `<Routes>` outlet. Sidebar is collapsible. The `app__content` container uses flexbox — pages with `page--fill` class expand to fill viewport height (Calendar, Pipeline, AI Assistant).

### Data Layer — The Central Hook

**`src/hooks/useSupabaseData.js`** is the single source of truth. It:
- Loads ALL entities from Supabase in one `Promise.all` on mount
- Falls back to mock data from `src/data/initialData.js` if Supabase is unavailable
- Provides CRUD setters built by a `makeSetter()` factory — each setter auto-syncs to Supabase and auto-logs to the activities feed
- Transforms snake_case (DB) ↔ camelCase (React) automatically

Entities managed: clients, projects, sows, activities, settings, invoices, timeEntries, events, contractors, deals, crmActivities, channelPartners, documents, notifications, automations.

**To add a new entity:**
1. Add the table to `supabase-schema.sql` and `supabase-migration.sql`
2. Add `initialEntityName = []` export to `src/data/initialData.js`
3. In `useSupabaseData.js`: import it, add `useState`, add to `loadAll()` Promise.all, add a `makeSetter()` call, add to the return object
4. In `App.jsx`: destructure it from the hook, pass as props to the relevant `<Route>`
5. If it needs a nav entry: add to `navSections` in `Sidebar.jsx` and add an icon to the `icons` object

### Props-Down Pattern

App.jsx passes data as props to every page. Authenticated pages do NOT call Supabase directly — all mutations go through setters from the hook so activity-logging stays consistent.

**Exceptions (intentional):**
- `Onboarding.jsx` — public insert into `onboarding_submissions`
- `OnboardingReview.jsx` — reads `onboarding_submissions`
- `ProposalSign.jsx` and `InvoiceView.jsx` — public token-shared pages (see "Public Share-Token Routes" below). These look up records by `share_token`, do their own direct mutations (e.g. mark invoice processing), and InvoiceView subscribes to Supabase Realtime for webhook-driven status changes.

### Public Share-Token Routes

Three routes render outside the auth gate and are how clients interact with the app without accounts:
- `/onboard` — public intake form
- `/sign/:token` — proposal acceptance/signing (looks up `sows` by `share_token`)
- `/invoice/:token` — invoice view + Stripe payment (looks up `invoices` by `share_token`)

The pattern: setter generates `share_token = generateId() + generateId()` on send, the public page queries by token, and the same token is used as the access key by the Stripe edge function. Anyone with the link is treated as the legitimate recipient — there is no additional auth.

### Client Data Model

Clients represent **companies**, not individuals. The `company` field is the primary identifier. Individual contacts are stored in the `contacts` array within each client object and managed via the "People" tab on the client profile. Client value is auto-calculated from the sum of linked project budgets — there is no manual value field.

### Supabase

- Client init: `src/lib/supabase.js`, credentials in `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Full schema: `supabase-schema.sql` (for fresh databases)
- Incremental: `supabase-migration.sql` (for existing databases — uses `IF NOT EXISTS` and exception handling for policies)
- Auth: email/password, profiles table with roles (admin, user, contractor, guest)
- RLS: currently permissive (`FOR ALL USING (true)`) except onboarding_submissions (public insert, authenticated read/update)

### RBAC

`src/lib/permissions.js` exports `can(role, permission)`. Four roles with granular permissions. Currently used for client-side visibility checks — not enforced by RLS.

### Supabase Edge Functions

Deno functions in `supabase/functions/` (deployed separately via `supabase functions deploy`):
- `create-payment-intent` — Looks up invoice by `share_token`, creates or reuses a Stripe PaymentIntent, calculates the surcharge based on payment method (card 2.9%+$0.30, ACH 0.8% capped at $5, BNPL 5.99%+$0.30), returns `client_secret` + breakdown to the public InvoiceView page.
- `stripe-webhook` — Verifies Stripe signature, handles `payment_intent.succeeded` / `payment_intent.payment_failed` / `charge.refunded`, updates the invoice row. Public InvoiceView gets the change instantly via Supabase Realtime subscription.
- `list-stripe-methods` — Returns labels for whatever payment methods are enabled in the Stripe dashboard, so the "Pay Online" button only advertises methods the client will actually see.

All three use service-role auth on the Supabase side (no client JWT required) and are the secure boundary for the Stripe secret key.

### Stripe Integration

Frontend uses `@stripe/react-stripe-js` `<PaymentElement>`. Configuration in `src/lib/stripe.js`:
- `stripePromise` — loaded from `VITE_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_CONFIGURED` — boolean used to gracefully fall back to manual bank transfer if Stripe isn't set up
- `getStripeAppearance()` — reads current `data-theme` and returns appearance config so the Payment Element matches dark/light mode

Bank details (manual transfer fallback) are shown in the live payment panel only — never embedded in the downloadable PDF.

### AI Integration

`src/lib/aiClient.js` calls Claude API. Supports two modes:
- Direct browser calls if `VITE_ANTHROPIC_API_KEY` is set (dev only — key exposed in browser)
- Edge Function proxy if `VITE_AI_ENDPOINT` is set (production)

`src/data/aiTemplates.js` defines pre-built prompt templates. The AI Assistant page injects business context (clients, projects, invoices) into the system prompt via `buildContext()`.

### Email Templates & Send Pattern

Invoice and proposal emails use a shared template-code system (configurable in Settings):
- Codes: `{{name}}`, `{{full_name}}`, `{{recipient_email}}`, `{{invoice_number}}` / `{{proposal_number}}`, `{{invoice_link}}` / `{{proposal_link}}`, `{{project_title}}`, `{{total_due}}` / `{{total_amount}}`, `{{due_date}}`, `{{valid_until}}`, `{{payment_terms}}`, `{{client_company}}`, `{{company_name}}`, `{{company_email}}`, `{{company_phone}}`, `{{owner_name}}`, `{{br}}` (literal newline)
- Send flow: `applyTemplate()` substitutes codes → opens `mailto:` → simultaneously copies the formatted body to the clipboard. Proton Mail strips line breaks from `mailto:` body, so the user pastes (Ctrl+V) over the single-line version. The toast that explains this fires after a delay so it doesn't interrupt the mailto handoff.

### Branded PDF Rendering

`buildInvoiceHTML(invoice, client, settings)` is **exported** from `src/pages/Invoices.jsx` and reused by `InvoiceView.jsx` (the public page) so the printable PDF is identical from both sides. Pattern: `window.open('')` → `w.document.write(html)` → `setTimeout(() => w.print(), 500)`. Logo and brand tokens come from `src/lib/brand.js` (`CLAD_FORGE_LOGO_DATA_URI`, `BRAND`, `BRAND_FONTS_LINK`).

## Styling

All styles in two files: `src/index.css` (CSS variables, base) and `src/App.css` (all component styles, ~2000 lines, organized by section comments).

Key conventions:
- CSS variables on `:root` with `data-theme` attribute for light/dark switching
- Brand color: `--brand` (#ff8c00 amber) with `--brand-pale`, `--brand-wash`, `--brand-mid` variants
- Fonts: Playfair Display (display), DM Sans (body), IBM Plex Mono (data) via Google Fonts
- Reusable CSS patterns: `.panel`/`.panel__header`/`.panel__body`, `.stat-card`, `.modal-overlay`/`.modal`, `.form-group`/`.form-grid`, `.btn`/`.btn--primary`/`.btn--secondary`/`.btn--ghost`/`.btn--sm`, `.filter-chip`, `.status-badge--{status}`, `.data-table`, `.client-grid`/`.client-card`
- Pages that should fill viewport: add `page--fill` class to the root div

## ESLint

- `no-unused-vars` ignores identifiers matching `^[A-Z_]` — prefix unused destructured vars with `_`
- React Refresh plugin active — exported components must be direct function declarations (not arrow functions assigned to variables)

## Codebase Conventions

- **Always confirm destructive actions** — every delete must go through `window.confirm()`. Past data loss from unconfirmed deletes is the reason this rule exists.
- **No hardcoded colors** — the app has a working light/dark theme via `data-theme` and CSS variables. Use `var(--brand)`, `var(--ink)`, `var(--slate)`, `var(--success)`, `var(--danger)` etc.; never raw hex values in JSX or `App.css` rules.
- **Activity feed is implicit** — the `makeSetter()` factory auto-logs an entry on every insert/update/delete via the activities entity. Don't manually push to `activities` from page code; let the setter do it.
- **Settings is a singleton** — single row with `id = 'default'`. `setSettings(updater)` upserts that row.
