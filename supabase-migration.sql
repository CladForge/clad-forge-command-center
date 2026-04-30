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
