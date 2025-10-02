-- Fix infinite recursion in profiles RLS policy
-- Remove the problematic admin policy that references profiles within profiles policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a simpler policy structure that doesn't cause recursion
-- For now, just allow users to see their own profiles and we'll handle admin access differently
-- Note: Admin functionality can be handled at the application level instead of database level

-- Alternative: Create a separate admin role check if needed
-- We could create this policy later if admin profile viewing is required:
-- CREATE POLICY "Admins can view all profiles" ON public.profiles
--     FOR SELECT USING (
--         (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
--     );

-- But for now, let's keep it simple and avoid recursion