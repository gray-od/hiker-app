-- ai_usage was created in 00005 without any GRANT (unlike 00002), so the Data API
-- answered permission denied (42501) and the daily AI limit never engaged.
-- Only authenticated (the user's own session) needs access; anon and service_role stay without DML.
GRANT SELECT, INSERT, UPDATE ON public.ai_usage TO authenticated;
