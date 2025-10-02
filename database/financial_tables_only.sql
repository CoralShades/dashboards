-- Financial Tables Only Migration
-- This script creates only the financial tables needed for the BI dashboard
-- Works around existing profiles table structure

-- Weekly income data from HH Trust Regular Account
CREATE TABLE IF NOT EXISTS public.weekly_income (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_ending DATE NOT NULL,
    income_amount DECIMAL(15,2) NOT NULL,
    account_name TEXT DEFAULT 'HH Trust Regular Account',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_ending)
);

-- Weekly wages and salaries (Account 500)
CREATE TABLE IF NOT EXISTS public.weekly_wages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_ending DATE NOT NULL,
    wages_amount DECIMAL(15,2) NOT NULL,
    rolling_8week_average DECIMAL(15,2),
    account_code TEXT DEFAULT '500',
    account_name TEXT DEFAULT 'Wages and Salaries',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_ending)
);

-- Weekly operating expenses
CREATE TABLE IF NOT EXISTS public.weekly_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_ending DATE NOT NULL,
    cost_of_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    operating_expenses DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_expenses DECIMAL(15,2) GENERATED ALWAYS AS (cost_of_sales + operating_expenses) STORED,
    rolling_8week_average DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_ending)
);

-- Work In Progress (WIP) data tables for Workflow Max/XPM
CREATE TABLE IF NOT EXISTS public.wip_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE,
    project_name TEXT NOT NULL,
    client_name TEXT,
    project_status TEXT,
    start_date DATE,
    due_date DATE,
    total_budget DECIMAL(15,2),
    time_spent_hours DECIMAL(8,2) DEFAULT 0,
    costs_incurred DECIMAL(15,2) DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WIP time tracking
CREATE TABLE IF NOT EXISTS public.wip_time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id TEXT REFERENCES public.wip_projects(project_id) ON DELETE CASCADE,
    staff_member TEXT,
    date_logged DATE NOT NULL,
    hours_logged DECIMAL(6,2) NOT NULL,
    task_description TEXT,
    billable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consolidated financial summary view
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT 
    i.week_ending,
    i.income_amount,
    w.wages_amount,
    w.rolling_8week_average as wages_8week_avg,
    e.cost_of_sales,
    e.operating_expenses,
    e.total_expenses,
    e.rolling_8week_average as expenses_8week_avg,
    (i.income_amount - e.total_expenses) as net_profit
FROM public.weekly_income i
FULL OUTER JOIN public.weekly_wages w ON i.week_ending = w.week_ending
FULL OUTER JOIN public.weekly_expenses e ON i.week_ending = e.week_ending
ORDER BY week_ending DESC;

-- Enable RLS on all data tables
ALTER TABLE public.weekly_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_wages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wip_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wip_time_entries ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies - Allow all authenticated users to view data
-- (Since we don't have the role structure, we'll use simpler policies)

CREATE POLICY "Authenticated users can view financial data" ON public.weekly_income
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view wages data" ON public.weekly_wages
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view expenses data" ON public.weekly_expenses
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view WIP projects" ON public.wip_projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view time entries" ON public.wip_time_entries
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert sample data for testing
INSERT INTO public.weekly_income (week_ending, income_amount) VALUES
    ('2025-09-22', 25000.00),
    ('2025-09-15', 22000.00),
    ('2025-09-08', 28000.00),
    ('2025-09-01', 24000.00)
ON CONFLICT (week_ending) DO NOTHING;

INSERT INTO public.weekly_wages (week_ending, wages_amount, rolling_8week_average) VALUES
    ('2025-09-22', 8000.00, 8200.00),
    ('2025-09-15', 8500.00, 8100.00),
    ('2025-09-08', 8200.00, 8000.00),
    ('2025-09-01', 7800.00, 8050.00)
ON CONFLICT (week_ending) DO NOTHING;

INSERT INTO public.weekly_expenses (week_ending, cost_of_sales, operating_expenses, rolling_8week_average) VALUES
    ('2025-09-22', 3000.00, 5000.00, 8100.00),
    ('2025-09-15', 2800.00, 5200.00, 8000.00),
    ('2025-09-08', 3200.00, 4800.00, 8200.00),
    ('2025-09-01', 2900.00, 5100.00, 8000.00)
ON CONFLICT (week_ending) DO NOTHING;

INSERT INTO public.wip_projects (project_id, project_name, client_name, project_status, start_date, due_date, total_budget, time_spent_hours, costs_incurred, completion_percentage) VALUES
    ('PRJ001', 'Website Redesign', 'ABC Corp', 'In Progress', '2025-08-01', '2025-10-15', 50000.00, 120.5, 15000.00, 65.0),
    ('PRJ002', 'Marketing Campaign', 'XYZ Ltd', 'Planning', '2025-09-15', '2025-11-30', 30000.00, 20.0, 2000.00, 15.0),
    ('PRJ003', 'System Integration', 'Tech Solutions', 'In Progress', '2025-07-01', '2025-09-30', 75000.00, 200.0, 35000.00, 85.0)
ON CONFLICT (project_id) DO NOTHING;