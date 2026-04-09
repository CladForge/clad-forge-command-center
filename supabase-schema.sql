-- ================================================================
-- CLAD FORGE — Command Center Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ================================================================

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  industry TEXT DEFAULT 'Construction',
  status TEXT DEFAULT 'prospect' CHECK (status IN ('active', 'prospect', 'on-hold', 'inactive')),
  notes TEXT DEFAULT '',
  value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clients" ON clients FOR ALL USING (true) WITH CHECK (true);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'proposal', 'active', 'review', 'completed', 'on-hold')),
  budget INTEGER DEFAULT 0,
  deadline TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- STATEMENTS OF WORK
CREATE TABLE IF NOT EXISTS sows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_title TEXT NOT NULL,
  description TEXT DEFAULT '',
  scope_items JSONB DEFAULT '[]'::jsonb,
  deliverables JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '{}'::jsonb,
  budget INTEGER DEFAULT 0,
  terms TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sows" ON sows FOR ALL USING (true) WITH CHECK (true);

-- ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT DEFAULT 'check',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to activities" ON activities FOR ALL USING (true) WITH CHECK (true);

-- SETTINGS (single row)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT DEFAULT 'Clad Forge',
  company_email TEXT DEFAULT '',
  company_phone TEXT DEFAULT '',
  company_address TEXT DEFAULT '',
  owner_name TEXT DEFAULT '',
  owner_title TEXT DEFAULT '',
  default_payment_terms TEXT DEFAULT 'Net 30',
  default_currency TEXT DEFAULT 'USD',
  sow_footer TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- ================================================================
-- SEED DATA (initial data to get started)
-- ================================================================

-- Seed settings
INSERT INTO settings (id, company_name, company_email, company_phone, company_address, owner_name, owner_title, default_payment_terms, default_currency, sow_footer)
VALUES (
  'default',
  'Clad Forge',
  'cort@cladforge.com',
  '+1 (800) 555-1234',
  'Tyler, Texas',
  'Courtland Adaire',
  'Founder & Engineer',
  'Net 30',
  'USD',
  'This Statement of Work is subject to the terms and conditions of the Master Services Agreement between Clad Forge and the Client.'
) ON CONFLICT (id) DO NOTHING;

-- Seed clients
INSERT INTO clients (id, name, company, email, phone, industry, status, notes, value, created_at) VALUES
  ('c1', 'Levi Holder', 'Lark Solutions', 'levi@larksolutions.com', '(903) 555-0142', 'Construction', 'active', 'Long-term client. Referred TradeLink. Prefers bi-weekly check-ins.', 48000, '2025-09-15'),
  ('c2', 'Tom Dale', 'TradeLink', 'tom@tradelink.io', '(214) 555-0198', 'Logistics', 'active', 'Needs custom dashboard for fleet tracking. Phase 2 starting soon.', 72000, '2025-11-03'),
  ('c3', 'Brandon Larkin', 'Lark Solutions', 'brandon@larksolutions.com', '(903) 555-0177', 'Construction', 'active', 'Operations lead. Primary contact for tool development projects.', 35000, '2026-01-10'),
  ('c4', 'Rachel Simmons', 'Meridian Energy', 'rachel@meridianenergy.com', '(713) 555-0234', 'Energy & Utilities', 'prospect', 'Met at Houston Industrial Expo. Interested in system restructuring.', 0, '2026-03-20'),
  ('c5', 'Marcus Webb', 'Ironclad Manufacturing', 'marcus@ironcladmfg.com', '(469) 555-0311', 'Manufacturing', 'on-hold', 'Website project paused due to internal restructuring. Follow up Q3.', 28000, '2025-07-22')
ON CONFLICT (id) DO NOTHING;

-- Seed projects
INSERT INTO projects (id, title, client_id, stage, budget, deadline, description, created_at) VALUES
  ('p1', 'Lark Solutions — Operations Portal', 'c1', 'active', 32000, '2026-06-30', 'Custom operations dashboard with real-time field crew tracking and job scheduling.', '2026-01-15'),
  ('p2', 'TradeLink — Fleet Dashboard', 'c2', 'proposal', 45000, '2026-08-15', 'Real-time fleet monitoring dashboard with route optimization and driver analytics.', '2026-03-01'),
  ('p3', 'Lark Solutions — Website Rebuild', 'c3', 'completed', 18000, '2026-02-28', 'Full website rebuild with performance optimization and AI-assisted search.', '2025-10-20'),
  ('p4', 'Meridian Energy — System Audit', 'c4', 'lead', 15000, '2026-09-01', 'Legacy system audit for cloud migration readiness assessment.', '2026-03-22'),
  ('p5', 'Ironclad Mfg — Product Catalog', 'c5', 'on-hold', 22000, '2026-10-01', 'Interactive product catalog with 3D model viewer and spec sheet generator.', '2025-08-05'),
  ('p6', 'TradeLink — API Integration', 'c2', 'review', 28000, '2026-05-15', 'REST API integration layer connecting TradeLink ERP with third-party logistics providers.', '2025-12-10')
ON CONFLICT (id) DO NOTHING;

-- Seed SOWs
INSERT INTO sows (id, client_id, project_title, description, scope_items, deliverables, timeline, budget, terms, status, created_at) VALUES
  ('sow1', 'c2', 'TradeLink — Fleet Dashboard',
   'Design and develop a real-time fleet monitoring dashboard with route optimization, driver analytics, and maintenance scheduling capabilities.',
   '[{"title":"UI/UX Design","description":"Wireframes, mockups, and interactive prototype for dashboard interface"},{"title":"Frontend Development","description":"React-based dashboard with real-time data visualization components"},{"title":"API Development","description":"RESTful API layer for fleet data aggregation and processing"},{"title":"GPS Integration","description":"Real-time GPS tracking integration with map visualization"}]'::jsonb,
   '[{"title":"Design System & Mockups","dueDate":"2026-05-15"},{"title":"MVP Dashboard","dueDate":"2026-06-30"},{"title":"API & Integration Layer","dueDate":"2026-07-31"},{"title":"Final Delivery & Training","dueDate":"2026-08-15"}]'::jsonb,
   '{"startDate":"2026-05-01","endDate":"2026-08-15"}'::jsonb,
   45000,
   'Payment schedule: 30% upon signing, 30% at MVP delivery, 40% upon final delivery. All work remains property of Clad Forge until final payment is received. Includes 30 days of post-delivery support.',
   'draft',
   '2026-03-28')
ON CONFLICT (id) DO NOTHING;

-- Seed activities
INSERT INTO activities (id, type, message, icon, created_at) VALUES
  ('a1', 'client', 'New prospect added: Rachel Simmons (Meridian Energy)', 'user-plus', now() - interval '2 hours'),
  ('a2', 'project', 'TradeLink API Integration moved to Review', 'arrow-right', now() - interval '5 hours'),
  ('a3', 'sow', 'SOW drafted for TradeLink Fleet Dashboard', 'file-text', now() - interval '1 day'),
  ('a4', 'project', 'Lark Solutions Website Rebuild completed', 'check', now() - interval '2 days'),
  ('a5', 'client', 'Ironclad Manufacturing status changed to On Hold', 'pause', now() - interval '3 days'),
  ('a6', 'project', 'Lark Solutions Operations Portal started', 'play', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- SUPABASE AUTH — Profiles, Triggers & RLS
-- ================================================================

-- PROFILES (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'contractor', 'guest')),
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles
CREATE POLICY "Allow read access to all profiles"
  ON profiles FOR SELECT
  USING (true);

-- Users can update only their own profile
CREATE POLICY "Allow users to update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- ADD created_by TO EXISTING TABLES
-- ================================================================

ALTER TABLE clients     ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE projects    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE sows        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE activities  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ================================================================
-- ADMIN SETUP NOTE
-- ================================================================
-- After signing up your first user, promote them to admin by running:
--   UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id';
-- You can find your user ID in the Supabase Dashboard under Authentication → Users.
