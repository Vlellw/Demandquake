-- Shared research is available to verified signed-in callers, not anonymous readers.
ALTER POLICY "Research runs are public" ON public.discovery_runs TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "Evidence sources are public" ON public.sources TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "Market scans are public" ON public.market_scans TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "Problem clusters are public" ON public.clusters TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "Unclaimed startups are public" ON public.startups TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE SELECT ON public.discovery_runs, public.sources, public.market_scans, public.clusters, public.startups FROM anon;
GRANT SELECT ON public.discovery_runs, public.sources, public.market_scans, public.clusters, public.startups TO authenticated;
GRANT ALL ON public.discovery_runs, public.sources, public.market_scans, public.clusters, public.startups TO service_role;