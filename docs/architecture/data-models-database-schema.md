# Data Models & Database Schema

[← Back to Index](index.md)

---

## 5. Backend Architecture

### 5.1 Database Design

The application will use Supabase's PostgreSQL database. The schema will consist of the following tables:

1. **`profiles`:** Stores user-specific data.
2. **`dashboards`:** Stores the BI dashboard information (name, URL, tool type).
3. **`dashboard_permissions`:** Links users to dashboards they are allowed to access.
4. **`xero_connections`:** Stores Xero OAuth tokens and connection metadata.
5. **`xero_data_cache`:** Stores financial data extracted from Xero.

#### 5.1.1 Migration Strategy

All schema changes will be applied using **Supabase migrations** (stored in `supabase/migrations/`). This ensures version control and reproducibility.

**Complete Migration File: `20241219_initial_bi_dashboard_schema.sql`**

```sql
-- ============================================================================
-- Migration: 20241219_initial_bi_dashboard_schema.sql
-- Description: Create all tables and security policies for BI Dashboard Portal
-- Author: Winston (Architect)
-- Date: 2024-12-19
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );

-- Admins can insert profiles (during user creation)
CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- 2. DASHBOARDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    tool TEXT NOT NULL CHECK (tool IN ('looker', 'powerbi', 'metabase', 'other')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS dashboards_tool_idx ON public.dashboards(tool);
CREATE INDEX IF NOT EXISTS dashboards_created_by_idx ON public.dashboards(created_by);

-- RLS Policies
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

-- Anyone can read dashboards (visibility controlled by permissions table)
CREATE POLICY "Anyone can read dashboards"
    ON public.dashboards FOR SELECT
    USING (true);

-- Admins can create dashboards
CREATE POLICY "Admins can create dashboards"
    ON public.dashboards FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update dashboards
CREATE POLICY "Admins can update dashboards"
    ON public.dashboards FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete dashboards
CREATE POLICY "Admins can delete dashboards"
    ON public.dashboards FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- 3. DASHBOARD_PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dashboard_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(user_id, dashboard_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS dashboard_permissions_user_idx ON public.dashboard_permissions(user_id);
CREATE INDEX IF NOT EXISTS dashboard_permissions_dashboard_idx ON public.dashboard_permissions(dashboard_id);

-- RLS Policies
ALTER TABLE public.dashboard_permissions ENABLE ROW LEVEL SECURITY;

-- Users can read their own permissions
CREATE POLICY "Users can read own permissions"
    ON public.dashboard_permissions FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can read all permissions
CREATE POLICY "Admins can read all permissions"
    ON public.dashboard_permissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can grant permissions
CREATE POLICY "Admins can grant permissions"
    ON public.dashboard_permissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can revoke permissions
CREATE POLICY "Admins can revoke permissions"
    ON public.dashboard_permissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- 4. XERO_CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.xero_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tenant_id TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    access_token TEXT NOT NULL, -- Encrypted using pgcrypto
    refresh_token TEXT NOT NULL, -- Encrypted using pgcrypto
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, tenant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS xero_connections_user_idx ON public.xero_connections(user_id);
CREATE INDEX IF NOT EXISTS xero_connections_tenant_idx ON public.xero_connections(tenant_id);
CREATE INDEX IF NOT EXISTS xero_connections_expires_idx ON public.xero_connections(expires_at);

-- RLS Policies
ALTER TABLE public.xero_connections ENABLE ROW LEVEL SECURITY;

-- Users can read their own connections
CREATE POLICY "Users can read own xero connections"
    ON public.xero_connections FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can read all connections
CREATE POLICY "Admins can read all xero connections"
    ON public.xero_connections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can insert their own connections
CREATE POLICY "Users can create own xero connections"
    ON public.xero_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own xero connections"
    ON public.xero_connections FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own xero connections"
    ON public.xero_connections FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 5. XERO_DATA_CACHE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.xero_data_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('invoices', 'contacts', 'accounts', 'reports')),
    data JSONB NOT NULL,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, data_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS xero_data_cache_tenant_idx ON public.xero_data_cache(tenant_id);
CREATE INDEX IF NOT EXISTS xero_data_cache_type_idx ON public.xero_data_cache(data_type);
CREATE INDEX IF NOT EXISTS xero_data_cache_synced_idx ON public.xero_data_cache(last_synced);

-- RLS Policies
ALTER TABLE public.xero_data_cache ENABLE ROW LEVEL SECURITY;

-- Users can read their own tenant's data
CREATE POLICY "Users can read own tenant data"
    ON public.xero_data_cache FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.xero_connections
            WHERE tenant_id = xero_data_cache.tenant_id
            AND user_id = auth.uid()
        )
    );

-- Edge Functions can insert/update cache (service role)
CREATE POLICY "Service role can manage cache"
    ON public.xero_data_cache FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. TRIGGERS (updated_at automation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_dashboards
    BEFORE UPDATE ON public.dashboards
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_xero_connections
    BEFORE UPDATE ON public.xero_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. SEED DATA (optional admin user)
-- ============================================================================

-- Insert admin profile if not exists (replace with actual user ID after signup)
-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES (
--     'REPLACE_WITH_ACTUAL_AUTH_USER_ID',
--     'admin@yourdomain.com',
--     'Administrator',
--     'admin'
-- )
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- END MIGRATION
-- ============================================================================
```

#### Performance Indexes

All critical indexes have been included in the migration above:

* **Profiles:** Indexed on `email` and `role` for fast lookups.
* **Dashboards:** Indexed on `tool` and `created_by` for filtering.
* **Dashboard Permissions:** Indexed on `user_id` and `dashboard_id` for join performance.
* **Xero Connections:** Indexed on `user_id`, `tenant_id`, and `expires_at` for quick queries.
* **Xero Data Cache:** Indexed on `tenant_id`, `data_type`, and `last_synced` for efficient cache lookups.

#### Rollback Strategy

If a migration needs to be rolled back, create a new migration that reverts the changes (e.g., `20241220_rollback_initial_schema.sql`). Never modify existing migration files after they've been applied.

Example rollback:

```sql
-- Rollback: Drop all tables in reverse order
DROP TABLE IF EXISTS public.xero_data_cache CASCADE;
DROP TABLE IF EXISTS public.xero_connections CASCADE;
DROP TABLE IF EXISTS public.dashboard_permissions CASCADE;
DROP TABLE IF EXISTS public.dashboards CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_dashboards ON public.dashboards;
DROP TRIGGER IF EXISTS set_updated_at_xero_connections ON public.xero_connections;
DROP FUNCTION IF EXISTS public.handle_updated_at();
```
