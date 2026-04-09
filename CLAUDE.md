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
- **ESLint 9** flat config with react-hooks and react-refresh plugins

## Architecture

**Entry flow:** `index.html` → `src/main.jsx` (BrowserRouter) → `src/App.jsx` (auth gate + layout + routes)

**Auth:** Supabase Auth with email/password. `App.jsx` checks session on mount — unauthenticated users see `Login.jsx`. User profiles stored in `profiles` table with roles (admin, user, contractor, guest).

**Layout:** Dark sidebar navigation + light TopBar header wrapping a `<Routes>` outlet. The `useSupabaseData` hook manages all persistent state. Sidebar is collapsible.

**Data layer** (`src/hooks/useSupabaseData.js`):
- Single hook that loads all data from Supabase on mount
- Falls back to initial mock data if Supabase is unavailable (local mode)
- CRUD setters auto-sync to Supabase and auto-log activities
- Snake_case ↔ camelCase transforms between DB and React

**Supabase config:**
- Client in `src/lib/supabase.js`, credentials in `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Schema in `supabase-schema.sql` — run in Supabase SQL Editor to create tables
- Tables: `clients`, `projects`, `sows`, `activities`, `settings`, `profiles`

**Pages** (`src/pages/`):
- `Login.jsx` — Auth screen with sign-in/sign-up, animated gradient background
- `Dashboard.jsx` — KPI stats, pipeline bars, activity feed, industry breakdown
- `Clients.jsx` — Client tracker with search/filter, card grid, modals, status management
- `Pipeline.jsx` — Kanban board with drag-and-drop across 5 stages
- `SOWGenerator.jsx` — Multi-step SOW/proposal wizard with preview and print/PDF export
- `Invoices.jsx` — Invoice creation with line items, status tracking, print/export
- `TimeTracker.jsx` — Live timer per project, manual time logging, summaries
- `BrandingGuide.jsx` — Color palette, typography, visual elements, usage guidelines
- `Settings.jsx` — Company profile, SOW defaults, data management

**Components** (`src/components/`): `Sidebar.jsx`, `TopBar.jsx`

## Styling

- **Professional light theme** — white cards, stone backgrounds, subtle shadows
- **Fonts:** Playfair Display (display/headings), DM Sans (body/UI), IBM Plex Mono (data) — Google Fonts
- **Brand color:** warm amber `#b45309` with pale/wash variants
- **Dark sidebar** with light main content area
- All styles in `src/App.css`, organized by component section
- CSS variables defined in `src/index.css`

## ESLint Notes

- `no-unused-vars` ignores identifiers matching `^[A-Z_]` — prefix intentionally unused destructured vars with `_`
- React Refresh plugin active — exported components should be direct function declarations
