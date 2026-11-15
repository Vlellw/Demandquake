ALTER TABLE public.startups
  ADD COLUMN private_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX startups_private_project_id_key ON public.startups(private_project_id) WHERE private_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS projects_startup_id_idx ON public.projects(startup_id);
COMMENT ON COLUMN public.startups.private_project_id IS 'Workspace holding an exclusive private claim; NULL means the startup is public. Set only by the claim RPCs; reverts to public when that workspace is deleted.';

CREATE OR REPLACE FUNCTION public.can_access_project(_project uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _project IS NOT NULL AND auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.projects WHERE id = _project AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project AND user_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_startup(_startup uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.id = _startup
      AND (s.private_project_id IS NULL OR public.can_access_project(s.private_project_id))
  )
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_project(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_startup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_startup(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Unclaimed startups are public" ON public.startups;
CREATE POLICY "Signed-in users read public startups and their private claims" ON public.startups
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (private_project_id IS NULL OR public.can_access_project(private_project_id)));

DROP POLICY IF EXISTS "Problem clusters are public" ON public.clusters;
CREATE POLICY "Signed-in users read clusters of visible startups" ON public.clusters
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (startup_id IS NULL OR public.can_view_startup(startup_id)));

DROP POLICY IF EXISTS "Evidence sources are public" ON public.sources;
CREATE POLICY "Signed-in users read sources of visible startups" ON public.sources
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (startup_id IS NULL OR public.can_view_startup(startup_id)));

DROP POLICY IF EXISTS "Market scans are public" ON public.market_scans;
CREATE POLICY "Signed-in users read scans of visible startups" ON public.market_scans
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND public.can_view_startup(startup_id));

DROP POLICY IF EXISTS read_settings ON public.credit_settings;
CREATE POLICY read_settings ON public.credit_settings
  FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY['welcome'::text, 'discovery'::text, 'detail'::text, 'market_scan'::text, 'competitor'::text, 'reports'::text, 'claim'::text, 'claim_private'::text]));

DROP FUNCTION IF EXISTS public.claim_startup_with_credits(uuid, text, uuid, text, jsonb);
CREATE FUNCTION public.claim_startup_with_credits(
  p_user uuid, p_env text, p_startup uuid, p_owner_name text, p_payload jsonb,
  p_private boolean DEFAULT false, p_expected_cost integer DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w public.credit_wallets;
  st public.startups;
  existing_id uuid;
  new_id uuid;
  new_balance integer;
  cost integer;
BEGIN
  IF p_env NOT IN ('sandbox','live') THEN RAISE EXCEPTION 'Invalid environment'; END IF;
  PERFORM public.ensure_credit_wallet(p_user, p_env);
  SELECT * INTO w FROM public.credit_wallets WHERE user_id = p_user AND environment = p_env FOR UPDATE;
  -- Lock the startup so concurrent public and private claims are serialised.
  SELECT * INTO st FROM public.startups WHERE id = p_startup FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This startup no longer exists.'; END IF;

  SELECT id INTO existing_id FROM public.projects WHERE user_id = p_user AND startup_id = p_startup LIMIT 1;
  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('projectId', existing_id, 'created', false, 'cost', 0, 'private', st.private_project_id IS NOT DISTINCT FROM existing_id);
  END IF;
  IF st.private_project_id IS NOT NULL THEN
    RAISE EXCEPTION 'Another founder claimed this startup privately, so it can no longer be claimed.';
  END IF;
  IF p_private AND EXISTS (SELECT 1 FROM public.projects WHERE startup_id = p_startup) THEN
    RAISE EXCEPTION 'Another founder is already building this startup, so it can only be claimed publicly.';
  END IF;

  cost := CASE WHEN p_private
    THEN COALESCE((SELECT value FROM public.credit_settings WHERE key = 'claim_private'), 20)
    ELSE COALESCE((SELECT value FROM public.credit_settings WHERE key = 'claim'), 5) END;
  IF p_expected_cost IS NOT NULL AND p_expected_cost <> cost THEN
    RAISE EXCEPTION 'The claim price changed. Review the current cost and try again.';
  END IF;
  IF w.balance - w.reserved < cost THEN
    RAISE EXCEPTION 'Insufficient credits. A % claim costs % credits.', CASE WHEN p_private THEN 'private' ELSE 'public' END, cost;
  END IF;

  INSERT INTO public.projects(user_id, startup_id, owner_name, name, tagline, concept, brand, assumptions, checklist, roadmap, updates, pitch, research)
  VALUES (p_user, p_startup, left(p_owner_name, 80), p_payload->>'name', p_payload->>'tagline', p_payload->>'concept',
    COALESCE(p_payload->'brand','{}'::jsonb), COALESCE(p_payload->'assumptions','[]'::jsonb), COALESCE(p_payload->'checklist','[]'::jsonb),
    COALESCE(p_payload->'roadmap','[]'::jsonb), COALESCE(p_payload->'updates','[]'::jsonb), COALESCE(p_payload->'pitch','{}'::jsonb),
    COALESCE(p_payload->'research','{}'::jsonb))
  RETURNING id INTO new_id;

  IF p_private THEN
    UPDATE public.startups SET private_project_id = new_id WHERE id = p_startup;
  END IF;

  UPDATE public.credit_wallets SET balance = balance - cost, updated_at = now()
  WHERE user_id = p_user AND environment = p_env RETURNING balance INTO new_balance;
  INSERT INTO public.credit_transactions(user_id, environment, delta, balance_after, kind, description, idempotency_key)
  VALUES (p_user, p_env, -cost, new_balance, 'claim',
    CASE WHEN p_private THEN 'Claimed startup privately: ' ELSE 'Claimed startup publicly: ' END || (p_payload->>'name'),
    'claim:' || new_id);

  RETURN jsonb_build_object('projectId', new_id, 'created', true, 'cost', cost, 'private', p_private);
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_startup_with_credits(uuid, text, uuid, text, jsonb, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_startup_with_credits(uuid, text, uuid, text, jsonb, boolean, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.make_project_private_with_credits(p_user uuid, p_env text, p_project uuid, p_expected_cost integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w public.credit_wallets;
  p public.projects;
  st public.startups;
  price integer;
  paid integer;
  cost integer;
  new_balance integer;
BEGIN
  IF p_env NOT IN ('sandbox','live') THEN RAISE EXCEPTION 'Invalid environment'; END IF;
  PERFORM public.ensure_credit_wallet(p_user, p_env);
  SELECT * INTO w FROM public.credit_wallets WHERE user_id = p_user AND environment = p_env FOR UPDATE;
  SELECT * INTO p FROM public.projects WHERE id = p_project FOR UPDATE;
  IF NOT FOUND OR p.user_id <> p_user THEN RAISE EXCEPTION 'Only the founder who claimed this startup can make it private.'; END IF;
  IF p.startup_id IS NULL THEN RAISE EXCEPTION 'This workspace is no longer linked to a catalog startup.'; END IF;
  SELECT * INTO st FROM public.startups WHERE id = p.startup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This workspace is no longer linked to a catalog startup.'; END IF;
  IF st.private_project_id = p_project THEN
    RETURN jsonb_build_object('private', true, 'cost', 0, 'changed', false);
  END IF;
  IF st.private_project_id IS NOT NULL OR EXISTS (SELECT 1 FROM public.projects WHERE startup_id = p.startup_id AND id <> p_project) THEN
    RAISE EXCEPTION 'Another founder is already building this startup, so it has to stay public.';
  END IF;

  price := COALESCE((SELECT value FROM public.credit_settings WHERE key = 'claim_private'), 20);
  paid := COALESCE((SELECT -delta FROM public.credit_transactions
    WHERE environment = p_env AND user_id = p_user AND idempotency_key = 'claim:' || p_project), 0);
  cost := GREATEST(price - GREATEST(paid, 0), 0);
  IF p_expected_cost IS NOT NULL AND p_expected_cost <> cost THEN
    RAISE EXCEPTION 'The price changed. Review the current cost and try again.';
  END IF;
  IF w.balance - w.reserved < cost THEN
    RAISE EXCEPTION 'Insufficient credits. Making this startup private costs % credits.', cost;
  END IF;

  UPDATE public.startups SET private_project_id = p_project WHERE id = st.id;
  UPDATE public.projects
  SET updates = updates || jsonb_build_array(jsonb_build_object(
    'id', 'u-' || replace(gen_random_uuid()::text, '-', ''),
    'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'kind', 'claimed',
    'title', 'Switched to a private claim',
    'text', 'Other founders can no longer find or claim this startup. Only this workspace team can open it.',
    'url', null
  ))
  WHERE id = p_project;

  IF cost > 0 THEN
    UPDATE public.credit_wallets SET balance = balance - cost, updated_at = now()
    WHERE user_id = p_user AND environment = p_env RETURNING balance INTO new_balance;
    INSERT INTO public.credit_transactions(user_id, environment, delta, balance_after, kind, description, idempotency_key)
    VALUES (p_user, p_env, -cost, new_balance, 'claim', 'Made startup private: ' || st.name, 'private:' || p_project);
  END IF;
  RETURN jsonb_build_object('private', true, 'cost', cost, 'changed', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.make_project_private_with_credits(uuid, text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.make_project_private_with_credits(uuid, text, uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.start_paid_discovery(p_user uuid, p_env text, p_request uuid, p_query text, p_key text, p_industry text, p_geography text, p_force boolean, p_expected_cost integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.credit_reservations; hit public.discovery_runs; reused text; c integer;
BEGIN
 PERFORM public.ensure_credit_wallet(p_user,p_env);
 PERFORM 1 FROM public.credit_wallets WHERE user_id=p_user AND environment=p_env FOR UPDATE;
 SELECT * INTO r FROM public.credit_reservations WHERE id=p_request;
 IF FOUND THEN
 IF r.user_id<>p_user OR r.environment<>p_env THEN RAISE EXCEPTION 'Invalid request'; END IF;
 RETURN jsonb_build_object('runId',r.run_id,'reused',NULL,'cost',r.cost);
 END IF;
 c:=COALESCE((SELECT value FROM public.credit_settings WHERE key='discovery'),5);
 IF c<>p_expected_cost THEN RAISE EXCEPTION 'The search price changed. Review the current cost and try again.'; END IF;
 r:=public.reserve_discovery_credits(p_user,p_env,p_request);
 IF NOT p_force THEN
 -- Never reuse results where a startup has since been claimed privately; the caller pays for a full set.
 SELECT * INTO hit FROM public.discovery_runs d
 WHERE d.query_key=p_key AND d.created_at>now()-interval '12 hours'
   AND NOT EXISTS (SELECT 1 FROM public.startups s WHERE s.run_id=d.id AND s.private_project_id IS NOT NULL)
 ORDER BY d.created_at DESC LIMIT 1;
 IF FOUND THEN
 IF hit.status='complete' THEN reused:='cached';
 ELSIF hit.status<>'failed' AND hit.created_at>now()-interval '20 minutes' THEN reused:='in_progress';
 ELSE hit:=NULL; END IF;
 END IF;
 END IF;
 IF hit.id IS NULL THEN
 IF (SELECT count(*) FROM public.discovery_runs WHERE created_at>now()-interval '1 hour')>=24 THEN RAISE EXCEPTION 'The hourly research limit was reached. Try again shortly.'; END IF;
 INSERT INTO public.discovery_runs(query,query_key,industry,geography,status) VALUES(p_query,p_key,p_industry,p_geography,'queued') RETURNING * INTO hit;
 END IF;
 PERFORM public.attach_credit_run(p_request,hit.id);
 RETURN jsonb_build_object('runId',hit.id,'reused',reused,'cost',r.cost);
END $function$;