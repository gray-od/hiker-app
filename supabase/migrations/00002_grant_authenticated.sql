-- Grant table access to authenticated users (required for RLS to work)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gear_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gear_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_entries TO authenticated;

-- Allow anon role to read profiles (needed for shared links in future)
GRANT SELECT ON public.profiles TO anon;
