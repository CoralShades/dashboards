-- Migration: 20251015000001_create_bi_portal_schema.sql
-- Purpose: Create BI Dashboard Portal database schema
-- Author: Winston (Architect)
-- Date: 2025-10-15

-- =============================================================================
-- 1. CREATE PROFILES TABLE (if not exists) AND ADD ROLE COLUMN
-- =============================================================================

-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'role_a', 'role_b')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2. CREATE DASHBOARDS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  bi_tool TEXT NOT NULL CHECK (bi_tool IN ('looker', 'powerbi', 'metabase')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. CREATE DASHBOARD_PERMISSIONS TABLE (Many-to-Many Join)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dashboard_permissions (
  role TEXT NOT NULL CHECK (role IN ('admin', 'role_a', 'role_b')),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  PRIMARY KEY (role, dashboard_id)
);

-- =============================================================================
-- 4. CREATE XERO_CONNECTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS xero_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ,
  UNIQUE(user_id) -- One Xero connection per user
);

-- =============================================================================
-- 5. CREATE XERO_DATA_CACHE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS xero_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weekly_income NUMERIC,
  avg_wages NUMERIC,
  avg_expenses NUMERIC,
  total_cost_of_sales NUMERIC,
  total_operating_expenses NUMERIC,
  data_json JSONB, -- Store full response for flexibility
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- =============================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- =============================================================================

ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_data_cache ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 7. CREATE RLS POLICIES
-- =============================================================================

-- Profiles: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Dashboards: Public read (metadata only, no sensitive data)
CREATE POLICY "Anyone can view dashboard metadata"
ON dashboards FOR SELECT
TO authenticated
USING (true);

-- Dashboard Permissions: Users can query their own role's permissions
CREATE POLICY "Users can view dashboards for their role"
ON dashboard_permissions FOR SELECT
TO authenticated
USING (role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Xero Connections: Users can only access their own connection
CREATE POLICY "Users can manage own Xero connection"
ON xero_connections FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Xero Data Cache: Users can only access their own data
CREATE POLICY "Users can view own Xero data"
ON xero_data_cache FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- =============================================================================
-- 8. CREATE PERFORMANCE INDEXES
-- =============================================================================

-- Index on profiles.role for dashboard permission lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Index on dashboard_permissions for fast role lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_permissions_role ON dashboard_permissions(role);

-- Index on xero_connections for user lookups
CREATE INDEX IF NOT EXISTS idx_xero_connections_user_id ON xero_connections(user_id);

-- Composite index on xero_data_cache for date range queries
CREATE INDEX IF NOT EXISTS idx_xero_data_cache_user_date 
ON xero_data_cache(user_id, date DESC);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Next steps:
-- 1. Test locally: supabase db reset
-- 2. Verify schema: supabase db diff
-- 3. Deploy remotely: supabase db push
