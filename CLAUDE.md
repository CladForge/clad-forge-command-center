# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build (output to `dist/`)
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint across the project

No test framework is configured.

## Tech Stack

React 19 (JSX, no TypeScript), Vite 8, React Router DOM 7, Supabase (PostgreSQL + Auth), ESLint 9 flat config.

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

App.jsx passes data as props to every page. Pages do NOT call Supabase directly (except `OnboardingReview.jsx` which reads `onboarding_submissions` and `Onboarding.jsx` which inserts publicly). All mutations go through the setter functions from the hook.

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

### AI Integration

`src/lib/aiClient.js` calls Claude API. Supports two modes:
- Direct browser calls if `VITE_ANTHROPIC_API_KEY` is set (dev only — key exposed in browser)
- Edge Function proxy if `VITE_AI_ENDPOINT` is set (production)

`src/data/aiTemplates.js` defines pre-built prompt templates. The AI Assistant page injects business context (clients, projects, invoices) into the system prompt via `buildContext()`.

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
