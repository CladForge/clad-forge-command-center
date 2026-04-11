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
