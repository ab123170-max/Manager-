-- ==============================================================================
-- SCANME AI - ANALYTICS, DOWNLOADS & INSTALLATION TRACKING SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. APP DOWNLOADS TABLE (app_downloads)
CREATE TABLE IF NOT EXISTS public.app_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id TEXT NOT NULL,
  platform TEXT DEFAULT 'android',
  app_version TEXT DEFAULT '1.0.0',
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_downloads_created_at ON public.app_downloads(created_at);
CREATE INDEX IF NOT EXISTS idx_app_downloads_anon_id ON public.app_downloads(anonymous_id);

-- 2. APP INSTALLATIONS TABLE (app_installations)
CREATE TABLE IF NOT EXISTS public.app_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  app_version TEXT DEFAULT '1.0.0',
  platform TEXT DEFAULT 'android',
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_installations_install_id ON public.app_installations(installation_id);
CREATE INDEX IF NOT EXISTS idx_app_installations_last_seen ON public.app_installations(last_seen);
CREATE INDEX IF NOT EXISTS idx_app_installations_user_id ON public.app_installations(user_id);

-- 3. USER ACTIVITY TABLE (user_activity)
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  installation_id TEXT,
  activity_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_install_id ON public.user_activity(installation_id);

-- 4. ANALYTICS EVENTS TABLE (analytics_events)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  installation_id TEXT,
  app_version TEXT,
  platform TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.app_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated insert for tracking
DROP POLICY IF EXISTS "Allow public insert to app_downloads" ON public.app_downloads;
CREATE POLICY "Allow public insert to app_downloads"
  ON public.app_downloads FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert to app_installations" ON public.app_installations;
CREATE POLICY "Allow public insert to app_installations"
  ON public.app_installations FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update own installation last_seen" ON public.app_installations;
CREATE POLICY "Allow public update own installation last_seen"
  ON public.app_installations FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert to user_activity" ON public.user_activity;
CREATE POLICY "Allow public insert to user_activity"
  ON public.user_activity FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert to analytics_events" ON public.analytics_events;
CREATE POLICY "Allow public insert to analytics_events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Allow public read on aggregated counts
DROP POLICY IF EXISTS "Allow public select for stats" ON public.app_downloads;
CREATE POLICY "Allow public select for stats"
  ON public.app_downloads FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public select for stats" ON public.app_installations;
CREATE POLICY "Allow public select for stats"
  ON public.app_installations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public select for stats" ON public.user_activity;
CREATE POLICY "Allow public select for stats"
  ON public.user_activity FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public select for stats" ON public.analytics_events;
CREATE POLICY "Allow public select for stats"
  ON public.analytics_events FOR SELECT
  USING (true);
