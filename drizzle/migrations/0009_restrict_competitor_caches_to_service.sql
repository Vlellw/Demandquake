-- Competitor cache records are internal. Public company profiles are served
-- through the existing per-startup server functions with explicit DTO fields.
ALTER TABLE public.brand_name_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY "Brand name lookups are public" ON public.brand_name_lookups;
DROP POLICY "Brand profiles are public" ON public.brand_profiles;
REVOKE SELECT ON TABLE public.brand_name_lookups FROM anon, authenticated;
REVOKE SELECT ON TABLE public.brand_profiles FROM anon, authenticated;
GRANT ALL ON TABLE public.brand_name_lookups TO service_role;
GRANT ALL ON TABLE public.brand_profiles TO service_role;