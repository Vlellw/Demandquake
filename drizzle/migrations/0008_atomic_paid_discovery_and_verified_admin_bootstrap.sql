CREATE TABLE public.credit_admin_bootstrap (email text PRIMARY KEY);
GRANT ALL ON public.credit_admin_bootstrap TO service_role;
ALTER TABLE public.credit_admin_bootstrap ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.ensure_credit_wallet(p_user uuid,p_env text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE initial integer; is_admin boolean; b integer;
BEGIN
 IF p_env NOT IN ('sandbox','live') THEN RAISE EXCEPTION 'Invalid environment'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users u JOIN public.credit_admin_bootstrap a ON lower(u.email)=lower(a.email) WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL) THEN
 INSERT INTO public.user_roles(user_id,role) VALUES(p_user,'admin') ON CONFLICT DO NOTHING;
 END IF;
 SELECT public.has_role(p_user,'admin') INTO is_admin;
 initial:=COALESCE((SELECT value FROM public.credit_settings WHERE key='welcome'),25);
 INSERT INTO public.credit_wallets(user_id,environment,balance) VALUES(p_user,p_env,initial) ON CONFLICT DO NOTHING;
 IF FOUND THEN INSERT INTO public.credit_transactions(user_id,environment,delta,balance_after,kind,description,idempotency_key) VALUES(p_user,p_env,initial,initial,'adjustment','Welcome credits','initial:'||p_user); END IF;
 SELECT balance INTO b FROM public.credit_wallets WHERE user_id=p_user AND environment=p_env FOR UPDATE;
 IF is_admin AND NOT EXISTS(SELECT 1 FROM public.credit_transactions WHERE environment=p_env AND idempotency_key='admin_initial:'||p_user) THEN
 UPDATE public.credit_wallets SET balance=balance+1000000-initial,updated_at=now() WHERE user_id=p_user AND environment=p_env RETURNING balance INTO b;
 INSERT INTO public.credit_transactions(user_id,environment,delta,balance_after,kind,description,idempotency_key) VALUES(p_user,p_env,1000000-initial,b,'adjustment','Initial development allocation','admin_initial:'||p_user);
 END IF;
END $$;
CREATE FUNCTION public.start_paid_discovery(p_user uuid,p_env text,p_request uuid,p_query text,p_key text,p_industry text,p_geography text,p_force boolean,p_expected_cost integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 SELECT * INTO hit FROM public.discovery_runs WHERE query_key=p_key AND created_at>now()-interval '12 hours' ORDER BY created_at DESC LIMIT 1;
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
END $$;
CREATE FUNCTION public.renew_discovery_reservation(p_user uuid,p_env text,p_run uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.credit_reservations; w public.credit_wallets;
BEGIN
 SELECT * INTO w FROM public.credit_wallets WHERE user_id=p_user AND environment=p_env FOR UPDATE;
 SELECT * INTO r FROM public.credit_reservations WHERE user_id=p_user AND environment=p_env AND run_id=p_run ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Only the researcher can retry this search'; END IF;
 IF r.status='released' THEN
 IF w.balance-w.reserved<r.cost THEN RAISE EXCEPTION 'Insufficient credits. Buy credits to retry.'; END IF;
 UPDATE public.credit_wallets SET reserved=reserved+r.cost WHERE user_id=p_user AND environment=p_env;
 UPDATE public.credit_reservations SET status='reserved' WHERE id=r.id;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.start_paid_discovery(uuid,text,uuid,text,text,text,text,boolean,integer),public.renew_discovery_reservation(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_paid_discovery(uuid,text,uuid,text,text,text,text,boolean,integer),public.renew_discovery_reservation(uuid,text,uuid) TO service_role;
CREATE FUNCTION public.credit_signup_wallets() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM public.ensure_credit_wallet(NEW.id,'sandbox'); PERFORM public.ensure_credit_wallet(NEW.id,'live'); RETURN NEW;
END $$;
CREATE TRIGGER credit_new_user AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.credit_signup_wallets();
CREATE TRIGGER credit_confirmed_user AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW WHEN (NEW.email_confirmed_at IS NOT NULL) EXECUTE FUNCTION public.credit_signup_wallets();