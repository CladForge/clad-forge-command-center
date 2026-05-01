-- ================================================================
-- CLAD FORGE — Migration: Add New Tables
-- Run this if you already have the base schema (clients, projects, sows, activities, settings, profiles)
-- ================================================================

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_number TEXT NOT NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT DEFAULT '',
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  project_title TEXT DEFAULT '',
  items JSONB DEFAULT '[]'::jsonb,
  tax_rate NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  due_date TEXT DEFAULT '',
  sent_date TEXT DEFAULT '',
  paid_date TEXT DEFAULT '',
  paid_amount NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- TIME ENTRIES
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  hours INTEGER DEFAULT 0,
  minutes INTEGER DEFAULT 0,
  date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to time_entries" ON time_entries FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- EVENTS (Calendar)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT NOT NULL,
  time TEXT DEFAULT '',
  end_time TEXT DEFAULT '',
  type TEXT DEFAULT 'custom' CHECK (type IN ('custom','deadline','meeting','milestone','invoice','follow-up')),
  color TEXT DEFAULT '',
  entity_type TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to events" ON events FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CONTRACTORS
CREATE TABLE IF NOT EXISTS contractors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  specialty TEXT DEFAULT 'other',
  rate TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','preferred')),
  website TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  date_added TEXT DEFAULT '',
  assigned_projects JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to contractors" ON contractors FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DEALS (CRM Pipeline)
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  company TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  contact_title TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead','contacted','proposal','negotiation','won','lost')),
  source TEXT DEFAULT '',
  value NUMERIC DEFAULT 0,
  probability INTEGER DEFAULT 10,
  expected_close_date TEXT DEFAULT '',
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'warm' CHECK (priority IN ('hot','warm','cold')),
  next_step TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to deals" ON deals FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CRM ACTIVITIES
CREATE TABLE IF NOT EXISTS crm_activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  deal_id TEXT REFERENCES deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'note' CHECK (type IN ('call','email','meeting','note','follow-up')),
  description TEXT DEFAULT '',
  activity_date TEXT DEFAULT '',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to crm_activities" ON crm_activities FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CHANNEL PARTNERS
CREATE TABLE IF NOT EXISTS channel_partners (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  title TEXT DEFAULT '',
  company TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE channel_partners ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to channel_partners" ON channel_partners FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN ('contract','invoice','proposal','report','other')),
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  file_url TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to documents" ON documents FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  entity_type TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  read BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AUTOMATIONS
CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'new_client','deal_stage_change','project_milestone',
    'invoice_overdue','invoice_paid','time_threshold',
    'no_contact','scheduled','onboarding_received'
  )),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','draft')),
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to automations" ON automations FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AUTOMATION LOGS
CREATE TABLE IF NOT EXISTS automation_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  automation_id TEXT REFERENCES automations(id) ON DELETE CASCADE,
  trigger_data JSONB DEFAULT '{}'::jsonb,
  actions_executed JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'success' CHECK (status IN ('success','failed','partial')),
  error TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to automation_logs" ON automation_logs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ONBOARDING SUBMISSIONS
CREATE TABLE IF NOT EXISTS onboarding_submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_name TEXT NOT NULL,
  company_website TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  company_size TEXT DEFAULT '',
  primary_contact_name TEXT NOT NULL,
  primary_contact_email TEXT NOT NULL,
  primary_contact_phone TEXT DEFAULT '',
  primary_contact_title TEXT DEFAULT '',
  brand_colors JSONB DEFAULT '[]'::jsonb,
  brand_fonts JSONB DEFAULT '{}'::jsonb,
  brand_tone TEXT DEFAULT '',
  brand_logo_url TEXT DEFAULT '',
  project_types JSONB DEFAULT '[]'::jsonb,
  project_description TEXT DEFAULT '',
  budget_range TEXT DEFAULT '',
  timeline TEXT DEFAULT '',
  preferences JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','converted','rejected')),
  converted_client_id TEXT REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE onboarding_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow public insert on onboarding" ON onboarding_submissions FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow authenticated read on onboarding" ON onboarding_submissions FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow authenticated update on onboarding" ON onboarding_submissions FOR UPDATE USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ADD CONTACTS AND BRANDING COLUMNS TO CLIENTS
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_fonts JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_tone TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_logo_url TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_size TEXT DEFAULT '';

-- PROJECT DASHBOARD COLUMNS
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_of_work TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS proposal_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_number TEXT DEFAULT '';

-- ================================================================
-- CLIENT PORTAL — Phase 1 (foundations)
-- Maps Supabase auth users to client companies. One client company can have
-- many portal users (CEO, billing, project manager, etc.). Each user has a
-- role within that company. This table is admin-managed via the invite flow.
-- ================================================================
CREATE TABLE IF NOT EXISTS client_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  portal_role TEXT NOT NULL DEFAULT 'viewer' CHECK (portal_role IN ('owner','billing','viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_client_users_auth_user ON client_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users(client_id);
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to client_users" ON client_users FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow 'client' as a profile role. The original CHECK constraint only
-- permitted admin/user/contractor/guest, which would block portal users
-- from being correctly classified. Drop the old constraint and replace
-- with one that includes 'client'.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','user','contractor','guest','client'));

-- ================================================================
-- PHASE 3 — RLS HARDENING
-- Replaces every "Allow all access" permissive policy with strict ones:
--   * Admins (profile.role='admin') keep full read/write on everything
--   * Portal clients (profile.role='client') see only rows for the
--     companies they're linked to via client_users
--   * Anonymous users get NO direct table access; the public share-token
--     pages call RPC functions (SECURITY DEFINER) instead
--
-- ROLLBACK: if anything breaks, run this single block to restore the
-- original permissive policies (note: this will RE-OPEN cross-client
-- data exposure):
--   DO $$ DECLARE t text; BEGIN
--     FOR t IN SELECT unnest(ARRAY['clients','projects','sows','invoices',
--       'time_entries','events','contractors','deals','crm_activities',
--       'channel_partners','documents','notifications','automations',
--       'automation_logs','activities','settings','recurring_expenses',
--       'finance_entries','tax_payments','client_users']) LOOP
--       EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
--       EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', t, t);
--       EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', t, t);
--       EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', t, t);
--       EXECUTE format('DROP POLICY IF EXISTS %I_admin_all ON %I', t, t);
--       EXECUTE format('CREATE POLICY %I_all_legacy ON %I FOR ALL USING (true) WITH CHECK (true)', t, t);
--     END LOOP;
--   END $$;
-- ================================================================

-- ── Helper functions ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_client_ids()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(client_id), ARRAY[]::text[])
  FROM client_users WHERE auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_client_ids() TO anon, authenticated;

-- ── Public RPCs for share-token flows ───────────────────────────────
-- These run as SECURITY DEFINER so they bypass RLS. They replace the direct
-- table queries that the public InvoiceView and ProposalSign pages used to
-- make. Each function takes a share_token and only returns/modifies the
-- single matching row.

CREATE OR REPLACE FUNCTION public.get_invoice_by_token(p_token text)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(i.*) FROM invoices i WHERE i.share_token = p_token LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_client_by_invoice_token(p_token text)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(c.*)
  FROM invoices i JOIN clients c ON c.id = i.client_id
  WHERE i.share_token = p_token LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mark_invoice_manual_processing(p_token text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE rows_updated int;
BEGIN
  UPDATE invoices
  SET status = 'processing', payment_method = 'manual'
  WHERE share_token = p_token AND status NOT IN ('paid','cancelled');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sow_by_token(p_token text)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(s.*) FROM sows s WHERE s.share_token = p_token LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_client_by_sow_token(p_token text)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(c.*)
  FROM sows s JOIN clients c ON c.id = s.client_id
  WHERE s.share_token = p_token LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_sow_by_token(
  p_token text, p_signature text, p_notes text,
  p_selections json, p_snapshot json, p_packages json
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated int;
  signed_date text;
BEGIN
  signed_date := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  UPDATE sows
  SET status = 'accepted',
      client_signature = p_signature,
      client_signed_date = signed_date,
      client_notes = p_notes,
      client_selections = p_selections,
      signed_snapshot = p_snapshot,
      accepted_date = signed_date,
      packages = p_packages
  WHERE share_token = p_token
    AND status NOT IN ('accepted','declined','project-created');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_sow_by_token(
  p_token text, p_notes text, p_selections json
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE rows_updated int;
BEGIN
  UPDATE sows
  SET status = 'declined', client_notes = p_notes, client_selections = p_selections
  WHERE share_token = p_token
    AND status NOT IN ('accepted','declined','project-created');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invoice_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_by_invoice_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invoice_manual_processing(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sow_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_by_sow_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_sow_by_token(text,text,text,json,json,json) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decline_sow_by_token(text,text,json) TO anon, authenticated;

-- ── Drop old permissive policies + add strict ones ──────────────────
-- Pattern A: client-scoped tables (admin: all; client: rows where their
-- client_id matches a client_users link; anon: no direct access).
DO $$
DECLARE
  scoped_tables TEXT[] := ARRAY['projects','sows','invoices','documents','recurring_expenses'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY scoped_tables LOOP
    -- Drop legacy permissive policies
    EXECUTE format('DROP POLICY IF EXISTS "Allow all access to %s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_all_legacy ON %I', t, t);
    -- Drop any older Phase 3 policies (so this migration is idempotent)
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', t, t);

    EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT TO authenticated USING (auth_is_admin() OR client_id = ANY(auth_client_ids()))', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT TO authenticated WITH CHECK (auth_is_admin())', t, t);
    EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin())', t, t);
    EXECUTE format('CREATE POLICY %I_delete ON %I FOR DELETE TO authenticated USING (auth_is_admin())', t, t);
  END LOOP;
END $$;

-- clients itself: same shape as scoped tables but the row's id IS the client_id
DROP POLICY IF EXISTS "Allow all access to clients" ON clients;
DROP POLICY IF EXISTS clients_select ON clients;
DROP POLICY IF EXISTS clients_insert ON clients;
DROP POLICY IF EXISTS clients_update ON clients;
DROP POLICY IF EXISTS clients_delete ON clients;
CREATE POLICY clients_select ON clients FOR SELECT TO authenticated
  USING (auth_is_admin() OR id = ANY(auth_client_ids()));
CREATE POLICY clients_insert ON clients FOR INSERT TO authenticated WITH CHECK (auth_is_admin());
CREATE POLICY clients_update ON clients FOR UPDATE TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY clients_delete ON clients FOR DELETE TO authenticated USING (auth_is_admin());

-- Pattern B: admin-only tables. Clients can't see ANY rows.
DO $$
DECLARE
  admin_only_tables TEXT[] := ARRAY['time_entries','events','contractors','deals',
    'crm_activities','channel_partners','automations','automation_logs',
    'activities','finance_entries','tax_payments'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY admin_only_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all access to %s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_all_legacy ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_admin_all ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_admin_all ON %I FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin())', t, t);
  END LOOP;
END $$;

-- settings: public SELECT (branding shown on public pages); admin-only writes
DROP POLICY IF EXISTS "Allow read settings" ON settings;
DROP POLICY IF EXISTS "Allow public read settings" ON settings;
DROP POLICY IF EXISTS "Allow update settings" ON settings;
DROP POLICY IF EXISTS settings_select ON settings;
DROP POLICY IF EXISTS settings_update ON settings;
DROP POLICY IF EXISTS settings_insert ON settings;
DROP POLICY IF EXISTS settings_delete ON settings;
CREATE POLICY settings_select ON settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY settings_update ON settings FOR UPDATE TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY settings_insert ON settings FOR INSERT TO authenticated WITH CHECK (auth_is_admin());

-- notifications: admin sees all; users see their own
DROP POLICY IF EXISTS "Allow all access to notifications" ON notifications;
DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS notifications_insert ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;
DROP POLICY IF EXISTS notifications_delete ON notifications;
CREATE POLICY notifications_select ON notifications FOR SELECT TO authenticated
  USING (auth_is_admin() OR user_id = auth.uid());
CREATE POLICY notifications_insert ON notifications FOR INSERT TO authenticated WITH CHECK (auth_is_admin());
CREATE POLICY notifications_update ON notifications FOR UPDATE TO authenticated
  USING (auth_is_admin() OR user_id = auth.uid())
  WITH CHECK (auth_is_admin() OR user_id = auth.uid());
CREATE POLICY notifications_delete ON notifications FOR DELETE TO authenticated USING (auth_is_admin());

-- profiles: anyone authenticated can read profiles (admin needs this for the
-- "Portal Access" tab). Users update only their own profile. Inserts happen
-- via the on_auth_user_created trigger (SECURITY DEFINER, bypasses RLS).
DROP POLICY IF EXISTS "Allow read access to all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow insert profiles" ON profiles;
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS profiles_delete ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated
  USING (auth_is_admin() OR id = auth.uid())
  WITH CHECK (auth_is_admin() OR id = auth.uid());
-- INSERTs by the trigger run as SECURITY DEFINER so they don't need a policy,
-- but allow admins to insert too in case of manual provisioning.
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated WITH CHECK (auth_is_admin());

-- client_users: admin sees all, users see/update their own row (so the portal
-- can refresh last_seen_at and AcceptInvite can mark accepted_at).
DROP POLICY IF EXISTS "Allow all access to client_users" ON client_users;
DROP POLICY IF EXISTS client_users_select ON client_users;
DROP POLICY IF EXISTS client_users_insert ON client_users;
DROP POLICY IF EXISTS client_users_update ON client_users;
DROP POLICY IF EXISTS client_users_delete ON client_users;
CREATE POLICY client_users_select ON client_users FOR SELECT TO authenticated
  USING (auth_is_admin() OR auth_user_id = auth.uid());
CREATE POLICY client_users_insert ON client_users FOR INSERT TO authenticated WITH CHECK (auth_is_admin());
CREATE POLICY client_users_update ON client_users FOR UPDATE TO authenticated
  USING (auth_is_admin() OR auth_user_id = auth.uid())
  WITH CHECK (auth_is_admin() OR auth_user_id = auth.uid());
CREATE POLICY client_users_delete ON client_users FOR DELETE TO authenticated USING (auth_is_admin());

-- onboarding_submissions: existing policies (public insert, authenticated read/update)
-- already match Phase 3 intent. No change needed here.

-- ================================================================
-- PHASE 4c — PROJECT MILESTONES
-- Decision points with explicit client approval workflow. Separate from
-- projects.deliverables (which is a simple JSONB checklist).
--
-- Status lifecycle:
--   draft              admin only, hidden from client
--   pending            visible to client, awaiting their Approve / Request Changes
--   approved           client signed off (terminal until admin reopens via status change)
--   changes_requested  client wants revisions; back to admin's court
--
-- Clients use the client_decide_milestone RPC (SECURITY DEFINER) rather than
-- direct UPDATE — RLS blocks them from writing to milestones, and the RPC
-- validates the caller's portal access + only allows decisions on 'pending'.
-- ================================================================
CREATE TABLE IF NOT EXISTS project_milestones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','approved','changes_requested')),
  client_comment TEXT DEFAULT '',
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS: admin: all; client: SELECT scoped to their projects (their client_id);
-- write paths for clients go through the RPC instead.
DROP POLICY IF EXISTS project_milestones_select ON project_milestones;
DROP POLICY IF EXISTS project_milestones_insert ON project_milestones;
DROP POLICY IF EXISTS project_milestones_update ON project_milestones;
DROP POLICY IF EXISTS project_milestones_delete ON project_milestones;

CREATE POLICY project_milestones_select ON project_milestones FOR SELECT TO authenticated
  USING (
    auth_is_admin() OR project_id IN (
      SELECT id FROM projects WHERE client_id = ANY(auth_client_ids())
    )
  );
CREATE POLICY project_milestones_insert ON project_milestones FOR INSERT TO authenticated
  WITH CHECK (auth_is_admin());
CREATE POLICY project_milestones_update ON project_milestones FOR UPDATE TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY project_milestones_delete ON project_milestones FOR DELETE TO authenticated
  USING (auth_is_admin());

-- Client decision RPC. Validates portal membership + only-when-pending,
-- logs an activity entry on success so the admin sees it in their feed.
CREATE OR REPLACE FUNCTION public.client_decide_milestone(
  p_milestone_id text,
  p_decision text,
  p_comment text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  m_client_id text;
  m_status text;
  m_title text;
BEGIN
  IF caller_id IS NULL THEN RETURN false; END IF;
  IF p_decision NOT IN ('approved', 'changes_requested') THEN RETURN false; END IF;

  SELECT p.client_id, m.status, m.title INTO m_client_id, m_status, m_title
  FROM project_milestones m
  JOIN projects p ON p.id = m.project_id
  WHERE m.id = p_milestone_id;

  IF m_client_id IS NULL THEN RETURN false; END IF;
  IF m_status <> 'pending' THEN RETURN false; END IF;

  -- Caller must have portal access to that client
  IF NOT EXISTS (
    SELECT 1 FROM client_users
    WHERE auth_user_id = caller_id AND client_id = m_client_id
  ) THEN
    RETURN false;
  END IF;

  UPDATE project_milestones
  SET status = p_decision,
      client_comment = p_comment,
      decided_by = caller_id,
      decided_at = now()
  WHERE id = p_milestone_id;

  -- Activity log so the admin sees the decision in their feed
  INSERT INTO activities (id, type, message, icon, created_by)
  VALUES (
    gen_random_uuid()::text,
    'milestone',
    CASE p_decision
      WHEN 'approved' THEN 'Client approved milestone: ' || m_title
      ELSE 'Client requested changes on: ' || m_title
    END,
    CASE p_decision WHEN 'approved' THEN 'check-circle' ELSE 'alert-circle' END,
    caller_id
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_decide_milestone(text, text, text) TO authenticated;

-- ================================================================
-- PHASE 4e — APPLICATIONS
-- New top-level entity: a "living" deliverable owned by a client. A
-- project BUILDS an application; an application is what gets MAINTAINED
-- post-launch. Hosting, support, monitoring, tickets, and (later) markup
-- all hang off an application rather than a project.
--
-- For MVP: admin defines apps, sets type/status/URL/cost. Client sees them
-- read-only with billing summary, status, and notes. Settings live in a
-- generic metadata JSONB so we can surface specific categories later
-- without schema changes.
-- ================================================================
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  url TEXT DEFAULT '',
  type TEXT DEFAULT 'website'
    CHECK (type IN ('website','web-app','mobile-app','api','other')),
  status TEXT DEFAULT 'planning'
    CHECK (status IN ('planning','in-development','staging','live','maintenance','archived')),
  launched_at TEXT DEFAULT '',
  monthly_cost NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_applications_client ON applications(client_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS: admin: all; client: SELECT scoped to their client_id; writes admin only
DROP POLICY IF EXISTS applications_select ON applications;
DROP POLICY IF EXISTS applications_insert ON applications;
DROP POLICY IF EXISTS applications_update ON applications;
DROP POLICY IF EXISTS applications_delete ON applications;
CREATE POLICY applications_select ON applications FOR SELECT TO authenticated
  USING (auth_is_admin() OR client_id = ANY(auth_client_ids()));
CREATE POLICY applications_insert ON applications FOR INSERT TO authenticated
  WITH CHECK (auth_is_admin());
CREATE POLICY applications_update ON applications FOR UPDATE TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY applications_delete ON applications FOR DELETE TO authenticated
  USING (auth_is_admin());

-- Optional link from a recurring expense to an application — lets the portal
-- roll up "monthly cost for this app" without a separate join table.
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS application_id TEXT
  REFERENCES applications(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_application
  ON recurring_expenses(application_id);

-- Thumbnail for application cards. Stored as a base64 data URI to match the
-- existing brand_logo_url pattern on clients (no Supabase Storage bucket
-- setup needed for the MVP). 2MB cap is enforced client-side. Phase 5
-- will swap to proper Storage when auto-screenshot capture lands and
-- thumbnails get re-used by the markup feature.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT '';

-- ================================================================
-- PHASE 4d — SERVICE TICKETS
-- Client submits issues / requests, admin replies, threaded comments,
-- status workflow. Tickets can optionally tie to an application or a
-- project so context is clear.
-- ================================================================
CREATE TABLE IF NOT EXISTS service_tickets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  submitted_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_tickets_client ON service_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_service_tickets_app ON service_tickets(application_id);
ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_tickets_select ON service_tickets;
DROP POLICY IF EXISTS service_tickets_insert ON service_tickets;
DROP POLICY IF EXISTS service_tickets_update ON service_tickets;
DROP POLICY IF EXISTS service_tickets_delete ON service_tickets;
CREATE POLICY service_tickets_select ON service_tickets FOR SELECT TO authenticated
  USING (auth_is_admin() OR client_id = ANY(auth_client_ids()));
-- Clients CAN create tickets for their own client; admins can create for any
CREATE POLICY service_tickets_insert ON service_tickets FOR INSERT TO authenticated
  WITH CHECK (auth_is_admin() OR client_id = ANY(auth_client_ids()));
-- Only admin can change status / assign / resolve. Client-side updates would
-- be limited to closing their own ticket — defer until needed.
CREATE POLICY service_tickets_update ON service_tickets FOR UPDATE TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY service_tickets_delete ON service_tickets FOR DELETE TO authenticated
  USING (auth_is_admin());

-- Threaded comments. is_internal = admin-only notes (hidden from client).
CREATE TABLE IF NOT EXISTS ticket_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_id TEXT NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_comments_select ON ticket_comments;
DROP POLICY IF EXISTS ticket_comments_insert ON ticket_comments;
DROP POLICY IF EXISTS ticket_comments_update ON ticket_comments;
DROP POLICY IF EXISTS ticket_comments_delete ON ticket_comments;
-- Clients see comments on their own tickets, EXCLUDING is_internal=true
CREATE POLICY ticket_comments_select ON ticket_comments FOR SELECT TO authenticated
  USING (
    auth_is_admin()
    OR (
      NOT is_internal AND ticket_id IN (
        SELECT id FROM service_tickets WHERE client_id = ANY(auth_client_ids())
      )
    )
  );
-- Clients can post comments on their own tickets (never as internal).
-- A WITH CHECK clause enforces both ownership AND is_internal=false for clients.
CREATE POLICY ticket_comments_insert ON ticket_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth_is_admin()
    OR (
      NOT is_internal AND ticket_id IN (
        SELECT id FROM service_tickets WHERE client_id = ANY(auth_client_ids())
      )
    )
  );
CREATE POLICY ticket_comments_update ON ticket_comments FOR UPDATE TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY ticket_comments_delete ON ticket_comments FOR DELETE TO authenticated
  USING (auth_is_admin());

-- ================================================================
-- PHASE 5 — APPLICATION SCREENSHOTS + ANNOTATION PINS
-- Visual markup: client (or admin) uploads a screenshot of an app, drops
-- pins at specific spots with comments. Admin marks pins resolved as fixes
-- ship. Auto-screenshot capture (Cloudflare Browser Rendering, microlink,
-- etc.) is a future expansion — for MVP we use manual file upload.
-- ================================================================
CREATE TABLE IF NOT EXISTS app_screenshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,           -- data URI for now; Storage URL once Phase 5+ adds buckets
  caption TEXT DEFAULT '',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_screenshots_app ON app_screenshots(application_id);
ALTER TABLE app_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_screenshots_select ON app_screenshots;
DROP POLICY IF EXISTS app_screenshots_insert ON app_screenshots;
DROP POLICY IF EXISTS app_screenshots_update ON app_screenshots;
DROP POLICY IF EXISTS app_screenshots_delete ON app_screenshots;
-- Visible to admin and to clients whose client_id owns the application
CREATE POLICY app_screenshots_select ON app_screenshots FOR SELECT TO authenticated
  USING (
    auth_is_admin() OR application_id IN (
      SELECT id FROM applications WHERE client_id = ANY(auth_client_ids())
    )
  );
CREATE POLICY app_screenshots_insert ON app_screenshots FOR INSERT TO authenticated
  WITH CHECK (
    auth_is_admin() OR application_id IN (
      SELECT id FROM applications WHERE client_id = ANY(auth_client_ids())
    )
  );
CREATE POLICY app_screenshots_update ON app_screenshots FOR UPDATE TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());
-- Clients can delete their own uploaded screenshots; admin can delete any
CREATE POLICY app_screenshots_delete ON app_screenshots FOR DELETE TO authenticated
  USING (auth_is_admin() OR captured_by = auth.uid());

-- Pins are point-in-image markers (x/y as % of image dims so they stay
-- correct at any rendered size).
CREATE TABLE IF NOT EXISTS annotation_pins (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  screenshot_id TEXT NOT NULL REFERENCES app_screenshots(id) ON DELETE CASCADE,
  x_pct NUMERIC NOT NULL CHECK (x_pct >= 0 AND x_pct <= 100),
  y_pct NUMERIC NOT NULL CHECK (y_pct >= 0 AND y_pct <= 100),
  body TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  author_id UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_annotation_pins_screenshot ON annotation_pins(screenshot_id);
ALTER TABLE annotation_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS annotation_pins_select ON annotation_pins;
DROP POLICY IF EXISTS annotation_pins_insert ON annotation_pins;
DROP POLICY IF EXISTS annotation_pins_update ON annotation_pins;
DROP POLICY IF EXISTS annotation_pins_delete ON annotation_pins;
CREATE POLICY annotation_pins_select ON annotation_pins FOR SELECT TO authenticated
  USING (
    auth_is_admin() OR screenshot_id IN (
      SELECT s.id FROM app_screenshots s
      JOIN applications a ON a.id = s.application_id
      WHERE a.client_id = ANY(auth_client_ids())
    )
  );
CREATE POLICY annotation_pins_insert ON annotation_pins FOR INSERT TO authenticated
  WITH CHECK (
    auth_is_admin() OR screenshot_id IN (
      SELECT s.id FROM app_screenshots s
      JOIN applications a ON a.id = s.application_id
      WHERE a.client_id = ANY(auth_client_ids())
    )
  );
-- Only admin can update (mark resolved). Clients delete + recreate if they
-- want to "edit" their pin — keeps the audit trail honest.
CREATE POLICY annotation_pins_update ON annotation_pins FOR UPDATE TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY annotation_pins_delete ON annotation_pins FOR DELETE TO authenticated
  USING (auth_is_admin() OR author_id = auth.uid());

-- ================================================================
-- PHASE 5b — MARKUP SETS
-- Groups screenshots into named "review packages" so old and new markups
-- don't get mixed. Each set has a name, date, status, and (when complete)
-- a completed_at/by audit trail. Existing screenshots without a set
-- show as "Unfiled" in the UI.
-- ================================================================
CREATE TABLE IF NOT EXISTS markup_sets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','archived')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_markup_sets_application ON markup_sets(application_id);
CREATE INDEX IF NOT EXISTS idx_markup_sets_status ON markup_sets(status);
ALTER TABLE markup_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS markup_sets_select ON markup_sets;
DROP POLICY IF EXISTS markup_sets_insert ON markup_sets;
DROP POLICY IF EXISTS markup_sets_update ON markup_sets;
DROP POLICY IF EXISTS markup_sets_delete ON markup_sets;
CREATE POLICY markup_sets_select ON markup_sets FOR SELECT TO authenticated
  USING (
    auth_is_admin() OR application_id IN (
      SELECT id FROM applications WHERE client_id = ANY(auth_client_ids())
    )
  );
-- Either side can create sets to organize their markups; admin can update/
-- archive/complete; clients can delete their own (in case they create one
-- by mistake) but can't change status or anyone else's set.
CREATE POLICY markup_sets_insert ON markup_sets FOR INSERT TO authenticated
  WITH CHECK (
    auth_is_admin() OR application_id IN (
      SELECT id FROM applications WHERE client_id = ANY(auth_client_ids())
    )
  );
CREATE POLICY markup_sets_update ON markup_sets FOR UPDATE TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY markup_sets_delete ON markup_sets FOR DELETE TO authenticated
  USING (auth_is_admin() OR created_by = auth.uid());

-- Link screenshots to sets. Nullable so existing screenshots remain valid;
-- they show as "Unfiled" in the UI until manually re-assigned.
ALTER TABLE app_screenshots ADD COLUMN IF NOT EXISTS set_id TEXT
  REFERENCES markup_sets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_app_screenshots_set ON app_screenshots(set_id);


-- ============= PHASE 6a: Customizable Dashboard KPI cards =============
-- Stores the user's preferred order + visibility for the dashboard KPI
-- cards so they can show/hide/reorder them via Settings > Dashboard.
-- Format: [{ "id": "totalRevenue", "enabled": true }, ...]
-- The app falls back to defaults (all cards, default order) if NULL or empty.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS dashboard_kpi_cards JSONB;
