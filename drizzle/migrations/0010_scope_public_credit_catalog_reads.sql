-- Visitors only need packages currently offered for sale and advertised costs.
ALTER POLICY read_packages ON public.credit_packages TO anon, authenticated USING (active = true);
CREATE POLICY read_all_packages_admin ON public.credit_packages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY read_settings ON public.credit_settings TO anon, authenticated USING (key IN ('welcome', 'discovery', 'detail', 'market_scan', 'competitor', 'reports'));
CREATE POLICY read_all_settings_admin ON public.credit_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));