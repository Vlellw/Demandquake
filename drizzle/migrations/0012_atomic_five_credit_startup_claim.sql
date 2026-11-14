CREATE FUNCTION public.claim_startup_with_credits(p_user uuid, p_env text, p_startup uuid, p_owner_name text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.credit_wallets; existing_id uuid; new_id uuid; new_balance integer; cost constant integer := 5;
BEGIN
 IF p_env NOT IN ('sandbox','live') THEN RAISE EXCEPTION 'Invalid environment'; END IF;
 PERFORM public.ensure_credit_wallet(p_user,p_env);
 SELECT * INTO w FROM public.credit_wallets WHERE user_id=p_user AND environment=p_env FOR UPDATE;
 SELECT id INTO existing_id FROM public.projects WHERE user_id=p_user AND startup_id=p_startup LIMIT 1;
 IF existing_id IS NOT NULL THEN RETURN jsonb_build_object('projectId',existing_id,'created',false,'cost',0); END IF;
 IF w.balance-w.reserved < cost THEN RAISE EXCEPTION 'Insufficient credits. Claiming a startup costs 5 credits.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.startups WHERE id=p_startup) THEN RAISE EXCEPTION 'This startup no longer exists.'; END IF;
 INSERT INTO public.projects(user_id,startup_id,owner_name,name,tagline,concept,brand,assumptions,checklist,roadmap,updates,pitch,research)
 VALUES(p_user,p_startup,left(p_owner_name,80),p_payload->>'name',p_payload->>'tagline',p_payload->>'concept',COALESCE(p_payload->'brand','{}'::jsonb),COALESCE(p_payload->'assumptions','[]'::jsonb),COALESCE(p_payload->'checklist','[]'::jsonb),COALESCE(p_payload->'roadmap','[]'::jsonb),COALESCE(p_payload->'updates','[]'::jsonb),COALESCE(p_payload->'pitch','{}'::jsonb),COALESCE(p_payload->'research','{}'::jsonb)) RETURNING id INTO new_id;
 UPDATE public.credit_wallets SET balance=balance-cost,updated_at=now() WHERE user_id=p_user AND environment=p_env RETURNING balance INTO new_balance;
 INSERT INTO public.credit_transactions(user_id,environment,delta,balance_after,kind,description,idempotency_key)
 VALUES(p_user,p_env,-cost,new_balance,'claim','Claimed startup: '||(p_payload->>'name'),'claim:'||new_id);
 RETURN jsonb_build_object('projectId',new_id,'created',true,'cost',cost);
END $$;
REVOKE ALL ON FUNCTION public.claim_startup_with_credits(uuid,text,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_startup_with_credits(uuid,text,uuid,text,jsonb) TO service_role;
REVOKE INSERT ON public.projects FROM authenticated;
DROP POLICY "Founders create own projects" ON public.projects;