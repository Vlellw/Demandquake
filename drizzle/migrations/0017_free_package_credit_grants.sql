CREATE OR REPLACE FUNCTION public.grant_free_credit_package(p_user uuid, p_env text, p_package text, p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE pkg public.credit_packages; tx public.credit_transactions; b integer; k text;
BEGIN
 IF p_env NOT IN ('sandbox','live') THEN RAISE EXCEPTION 'Invalid environment'; END IF;
 SELECT * INTO pkg FROM public.credit_packages WHERE id=p_package AND active=true;
 IF NOT FOUND THEN RAISE EXCEPTION 'This credit package is unavailable'; END IF;
 PERFORM public.ensure_credit_wallet(p_user,p_env);
 SELECT balance INTO b FROM public.credit_wallets WHERE user_id=p_user AND environment=p_env FOR UPDATE;
 k := 'free-package:' || p_user || ':' || p_package || ':' || p_request;
 SELECT * INTO tx FROM public.credit_transactions WHERE environment=p_env AND idempotency_key=k;
 IF FOUND THEN RETURN jsonb_build_object('credits',tx.delta,'balance',b,'added',false); END IF;
 b := public.adjust_credit_balance(p_user,p_env,pkg.credits,'Free credit package: ' || pkg.name,k);
 RETURN jsonb_build_object('credits',pkg.credits,'balance',b,'added',true);
END $function$;
REVOKE ALL ON FUNCTION public.grant_free_credit_package(uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_free_credit_package(uuid,text,text,uuid) TO service_role;