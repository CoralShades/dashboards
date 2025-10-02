# Database Setup Instructions

## 1. Apply the Database Schema

You need to run the SQL script to create the required tables in your Supabase database.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.io/project/jprwawlxjogdwhmorfpj
2. Click on "SQL Editor" in the left sidebar
3. Create a new query
4. Copy and paste the entire content from `database/schema.sql`
5. Click "Run" to execute the script

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db reset
supabase db push
```

## 2. Verify Tables Created

After running the schema, you should see these tables in your Supabase database:

**Core Tables:**
- `profiles` - User roles and profile information
- `weekly_income` - Weekly income data from Xero
- `weekly_wages` - Weekly wages and salaries data
- `weekly_expenses` - Operating expenses and cost of sales
- `wip_projects` - Work in progress projects from Workflow Max
- `wip_time_entries` - Time tracking for WIP projects

**Views:**
- `financial_summary` - Consolidated view combining income, wages, and expenses

## 3. Row Level Security (RLS)

The schema includes Row Level Security policies that ensure:

- **Admin role**: Can view all data across all tables
- **Role A (Sales & Marketing)**: Can view basic project data for sales insights
- **Role B (Finance & HR)**: Can view all financial data (income, wages, expenses)
- **All users**: Can view and update their own profile

## 4. Sample Data

The schema includes sample data for testing:
- 4 weeks of income data
- 4 weeks of wages data with rolling averages
- 4 weeks of expense data
- 3 sample WIP projects

## 5. Next Steps

After applying the schema:
1. The configuration will be updated to use these real tables
2. Test user authentication and role-based access
3. Verify dashboards load correctly with the sample data

## 6. User Registration

When users register, they will automatically get assigned to 'role_a' by default. You can manually update their role in the `profiles` table:

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'user-uuid-here';
```

## 7. Environment Variables

Make sure your `.env` file contains:

```bash
VITE_SUPABASE_URL=https://jprwawlxjogdwhmorfpj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impwcndhd2x4am9nZHdobW9yZnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1OTA5ODQsImV4cCI6MjA3NDE2Njk4NH0.a23PjbqE_BQSMH07PNIwHle8mWlSW7yItCCiwaKyjZU
```