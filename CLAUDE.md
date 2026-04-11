# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build (output to `dist/`)
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint across the project

## Tech Stack

- **React 19** with JSX (no TypeScript)
- **Vite 8** with the React plugin (Oxc compiler)
- **React Router DOM 7** — client-side routing with `BrowserRouter`
- **Supabase** — PostgreSQL backend with Auth (email/password), profiles, and data persistence
- **Claude API** — AI features via `src/lib/aiClient.js` (direct API or Edge Function proxy)
- **ESLint 9** flat config with react-hooks and react-refresh plugins

## Architecture

**Entry flow:** `index.html` → `src/main.jsx` (BrowserRouter) → `src/App.jsx` (auth gate + layout + routes)

**Auth:** Supabase Auth with email/password. `App.jsx` checks session on mount — unauthenticated users see `Login.jsx` (or `Onboarding.jsx` at `/onboard`). User profiles stored in `profiles` table with roles (admin, user, contractor, guest).

**Public routes:** `/onboard` is accessible without authentication (rendered outside the auth gate in App.jsx).

**Layout:** Dark sidebar navigation + TopBar header (with NotificationBell) wrapping a `<Routes>` outlet. The `useSupabaseData` hook manages all persistent state. Sidebar is collapsible.

**Data layer** (`src/hooks/useSupabaseData.js`):
- Single hook that loads ALL data from Supabase on mount
- Falls back to initial mock data if Supabase is unavailable (local mode)
- Generic `makeSetter()` factory creates CRUD wrappers for each entity
- CRUD setters auto-sync to Supabase and auto-log activities
- Snake_case ↔ camelCase transforms between DB and React
- Entities managed: clients, projects, sows, activities, settings, invoices, timeEntries, events, contractors, deals, crmActivities, channelPartners, documents, notifications, automations

**Supabase config:**
- Client in `src/lib/supabase.js`, credentials in `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Schema in `supabase-schema.sql` — run in Supabase SQL Editor to create tables
- Tables: `clients`, `projects`, `sows`, `activities`, `settings`, `profiles`, `invoices`, `time_entries`, `events`, `contractors`, `deals`, `crm_activities`, `channel_partners`, `documents`, `notifications`, `automations`, `automation_logs`, `onboarding_submissions`

**RBAC:** `src/lib/permissions.js` exports `can(role, permission)` helper with admin/user/contractor/guest role maps.

**AI:** `src/lib/aiClient.js` handles Claude API calls. `src/data/aiTemplates.js` defines template prompts. Set `VITE_ANTHROPIC_API_KEY` for direct API access or `VITE_AI_ENDPOINT` for a proxy.

**Pages** (`src/pages/`):
- `Login.jsx` — Auth screen with sign-in/sign-up
- `Dashboard.jsx` — KPI stats, pipeline bars, activity feed, pending onboarding review
- `Clients.jsx` — Client tracker with search/filter, card grid, modals, status management
- `Pipeline.jsx` — Kanban board with drag-and-drop across 5 stages
- `CRM.jsx` — Deals pipeline (Kanban/grid/table), Active Clients tab, Channel Partners tab
- `Contractors.jsx` — Contractor management with card grid, profile view, CRUD
- `Proposals.jsx` — Multi-step SOW/proposal wizard with preview and print/PDF export
- `Invoices.jsx` — Invoice creation with line items, status tracking, print/export
- `Documents.jsx` — Document management with client/project filtering
- `TimeTracker.jsx` — Live timer per project, manual time logging, summaries
- `Reports.jsx` — Real KPIs computed from invoices, projects, time entries
- `Calendar.jsx` — Real events + auto-generated deadlines, CRUD modal
- `AIAssistant.jsx` — Claude-powered chat with business context, templates
- `Automations.jsx` — Workflow builder with trigger/action wizard, presets
- `BrandingGuide.jsx` — Color palette, typography, visual elements
- `Settings.jsx` — Company profile, SOW defaults, data management
- `Onboarding.jsx` — Public multi-step client onboarding form (no auth required)

**Components** (`src/components/`): `Sidebar.jsx`, `TopBar.jsx`, `NotificationBell.jsx`, `OnboardingReview.jsx`

## Styling

- **Dark theme** with CSS variables (supports light theme via `data-theme`)
- **Fonts:** Playfair Display (display/headings), DM Sans (body/UI), IBM Plex Mono (data) — Google Fonts
- **Brand color:** warm amber `#ff8c00` / `#b45309` with pale/wash variants
- All styles in `src/App.css`, organized by component section
- CSS variables defined in `src/index.css`

## ESLint Notes

- `no-unused-vars` ignores identifiers matching `^[A-Z_]` — prefix intentionally unused destructured vars with `_`
- React Refresh plugin active — exported components should be direct function declarations
