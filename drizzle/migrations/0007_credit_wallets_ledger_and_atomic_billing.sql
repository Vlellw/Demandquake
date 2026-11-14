CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_roles ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE TABLE public.credit_settings (key text PRIMARY KEY, value integer NOT NULL CHECK(value>=0));
GRANT SELECT ON public.credit_settings TO anon,authenticated; GRANT ALL ON public.credit_settings TO service_role;
ALTER TABLE public.credit_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_settings ON public.credit_settings FOR SELECT TO anon,authenticated USING(true);
CREATE TABLE public.credit_packages (id text PRIMARY KEY,name text NOT NULL,credits integer NOT NULL CHECK(credits>0),amount integer NOT NULL CHECK(amount>0),currency text NOT NULL DEFAULT 'eur',active boolean NOT NULL DEFAULT true,product_key text NOT NULL,price_key text NOT NULL);
GRANT SELECT ON public.credit_packages TO anon,authenticated; GRANT ALL ON public.credit_packages TO service_role;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_packages ON public.credit_packages FOR SELECT TO anon,authenticated USING(true);
CREATE TABLE public.credit_wallets (user_id uuid NOT NULL,environment text NOT NULL CHECK(environment IN ('sandbox','live')),balance integer NOT NULL DEFAULT 0,reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,environment));
GRANT SELECT ON public.credit_wallets TO authenticated; GRANT ALL ON public.credit_wallets TO service_role;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_wallet ON public.credit_wallets FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.credit_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,environment text NOT NULL CHECK(environment IN ('sandbox','live')),delta integer NOT NULL,balance_after integer NOT NULL,kind text NOT NULL,description text NOT NULL,idempotency_key text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(environment,idempotency_key));
GRANT SELECT ON public.credit_transactions TO authenticated; GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_transactions ON public.credit_transactions FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.credit_reservations (id uuid PRIMARY KEY,user_id uuid NOT NULL,environment text NOT NULL CHECK(environment IN ('sandbox','live')),cost integer NOT NULL CHECK(cost>=0),run_id uuid REFERENCES public.discovery_runs(id),status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','spent','released')),created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.credit_reservations TO authenticated; GRANT ALL ON public.credit_reservations TO service_role;
ALTER TABLE public.credit_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_reservations ON public.credit_reservations FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE INDEX credit_reservation_run ON public.credit_reservations(run_id);
CREATE TABLE public.credit_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,environment text NOT NULL CHECK(environment IN ('sandbox','live')),package_id text NOT NULL,credits integer NOT NULL CHECK(credits>0),amount integer NOT NULL CHECK(amount>0),currency text NOT NULL,session_id text, payment_intent_id text,status text NOT NULL DEFAULT 'pending',refunded_amount integer NOT NULL DEFAULT 0,refunded_credits integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(environment,session_id));
GRANT SELECT ON public.credit_payments TO authenticated; GRANT ALL ON public.credit_payments TO service_role;
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_payments ON public.credit_payments FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.credit_webhook_events (id text NOT NULL,environment text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(id,environment));
GRANT ALL ON public.credit_webhook_events TO service_role;
ALTER TABLE public.credit_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.ensure_credit_wallet(p_user uuid,p_env text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE initial integer; is_admin boolean;
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role='admin') INTO is_admin;
 initial:=CASE WHEN is_admin THEN 1000000 ELSE COALESCE((SELECT value FROM public.credit_settings WHERE key='welcome'),25) END;
 INSERT INTO public.credit_wallets(user_id,environment,balance) VALUES(p_user,p_env,initial) ON CONFLICT DO NOTHING;
 IF FOUND THEN INSERT INTO public.credit_transactions(user_id,environment,delta,balance_after,kind,description,idempotency_key) VALUES(p_user,p_env,initial,initial,'adjustment',CASE WHEN is_admin THEN 'Initial development allocation' ELSE 'Welcome credits' END,'initial:'||p_user); END IF;
END $$;
CREATE FUNCTION public.reserve_discovery_credits(p_user uuid,p_env text,p_request uuid) RETURNS public.credit_reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.credit_wallets; r public.credit_reservations; c integer;
BEGIN
 PERFORM public.ensure_credit_wallet(p_user,p_env);
 SELECT * INTO w FROM public.credit_wallets WHERE user_id=p_user AND environment=p_env FOR UPDATE;
 SELECT * INTO r FROM public.credit_reservations WHERE id=p_request;
 IF FOUND THEN IF r.user_id<>p_user OR r.environment<>p_env THEN RAISE EXCEPTION 'Invalid request'; END IF; RETURN r; END IF;
 c:=COALESCE((SELECT value FROM public.credit_settings WHERE key='discovery'),5);
 IF w.balance-w.reserved<c THEN RAISE EXCEPTION 'Insufficient credits. Buy credits to continue.'; END IF;
 INSERT INTO public.credit_reservations(id,user_id,environment,cost) VALUES(p_request,p_user,p_env,c) RETURNING * INTO r;
 UPDATE public.credit_wallets SET reserved=reserved+c,updated_at=now() WHERE user_id=p_user AND environment=p_env;
 RETURN r;
END $$;
CREATE FUNCTION public.settle_credit_reservation(p_request uuid,p_success boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.credit_reservations; b integer;
BEGIN
 SELECT * INTO r FROM public.credit_reservations WHERE id=p_request FOR UPDATE;
 IF NOT FOUND OR r.status<>'reserved' THEN RETURN; END IF;
 UPDATE public.credit_wallets SET balance=balance-CASE WHEN p_success THEN r.cost ELSE 0 END,reserved=reserved-r.cost,updated_at=now() WHERE user_id=r.user_id AND environment=r.environment RETURNING balance INTO b;
 UPDATE public.credit_reservations SET status=CASE WHEN p_success THEN 'spent' ELSE 'released' END WHERE id=p_request;
 IF p_success THEN INSERT INTO public.credit_transactions(user_id,environment,delta,balance_after,kind,description,idempotency_key) VALUES(r.user_id,r.environment,-r.cost,b,'search','Startup discovery search','search:'||r.id) ON CONFLICT DO NOTHING; END IF;
END $$;
CREATE FUNCTION public.attach_credit_run(p_request uuid,p_run uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s text; st jsonb;
BEGIN
 SELECT status,stats INTO s,st FROM public.discovery_runs WHERE id=p_run FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Run not found'; END IF;
 UPDATE public.credit_reservations SET run_id=p_run WHERE id=p_request AND status='reserved';
 IF s IN ('complete','failed') THEN PERFORM public.settle_credit_reservation(p_request,s='complete' AND COALESCE((st->>'billing_api_failed')::boolean,false)=false); END IF;
END $$;
CREATE FUNCTION public.settle_run_credits() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record;
BEGIN
 IF NEW.status IN ('complete','failed') THEN FOR r IN SELECT id FROM public.credit_reservations WHERE run_id=NEW.id AND status='reserved' LOOP PERFORM public.settle_credit_reservation(r.id,NEW.status='complete' AND COALESCE((NEW.stats->>'billing_api_failed')::boolean,false)=false); END LOOP; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER settle_discovery_credits AFTER UPDATE OF status ON public.discovery_runs FOR EACH ROW EXECUTE FUNCTION public.settle_run_credits();
CREATE FUNCTION public.adjust_credit_balance(p_user uuid,p_env text,p_delta integer,p_reason text,p_key text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b integer;
BEGIN
 PERFORM public.ensure_credit_wallet(p_user,p_env);
 SELECT balance INTO b FROM public.credit_wallets WHERE user_id=p_user AND environment=p_env FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.credit_transactions WHERE environment=p_env AND idempotency_key=p_key) THEN RETURN b; END IF;
 UPDATE public.credit_wallets SET balance=balance+p_delta,updated_at=now() WHERE user_id=p_user AND environment=p_env RETURNING balance INTO b;
 INSERT INTO public.credit_transactions(user_id,environment,delta,balance_after,kind,description,idempotency_key) VALUES(p_user,p_env,p_delta,b,'adjustment',p_reason,p_key);
 RETURN b;
END $$;
CREATE FUNCTION public.fulfill_credit_payment(p_payment uuid,p_env text,p_event text,p_session text,p_intent text,p_amount integer,p_currency text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.credit_payments; b integer;
BEGIN
 SELECT * INTO p FROM public.credit_payments WHERE id=p_payment AND environment=p_env FOR UPDATE;
 IF NOT FOUND OR p.session_id IS DISTINCT FROM p_session OR p.amount<>p_amount OR p.currency<>p_currency THEN RAISE EXCEPTION 'Payment mismatch'; END IF;
 INSERT INTO public.credit_webhook_events(id,environment) VALUES(p_event,p_env) ON CONFLICT DO NOTHING;
 IF NOT FOUND OR p.status IN ('paid','refunded','partially_refunded') THEN RETURN; END IF;
 PERFORM public.ensure_credit_wallet(p.user_id,p_env);
 UPDATE public.credit_wallets SET balance=balance+p.credits,updated_at=now() WHERE user_id=p.user_id AND environment=p_env RETURNING balance INTO b;
 INSERT INTO public.credit_transactions(user_id,environment,delta,balance_after,kind,description,idempotency_key) VALUES(p.user_id,p_env,p.credits,b,'purchase','Purchased '||p.credits||' credits','payment:'||p.id);
 UPDATE public.credit_payments SET status='paid',payment_intent_id=p_intent,updated_at=now() WHERE id=p.id;
END $$;
CREATE FUNCTION public.refund_credit_payment(p_env text,p_event text,p_intent text,p_refunded integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.credit_payments; target integer; d integer; b integer;
BEGIN
 SELECT * INTO p FROM public.credit_payments WHERE environment=p_env AND payment_intent_id=p_intent FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Paid order not yet available'; END IF;
 IF p_refunded<p.refunded_amount OR p_refunded>p.amount THEN RETURN; END IF;
 INSERT INTO public.credit_webhook_events(id,environment) VALUES(p_event,p_env) ON CONFLICT DO NOTHING; IF NOT FOUND THEN RETURN; END IF;
 target:=floor(p.credits::numeric*p_refunded/p.amount); d:=target-p.refunded_credits;
 UPDATE public.credit_wallets SET balance=balance-d,updated_at=now() WHERE user_id=p.user_id AND environment=p_env RETURNING balance INTO b;
 INSERT INTO public.credit_transactions(user_id,environment,delta,balance_after,kind,description,idempotency_key) VALUES(p.user_id,p_env,-d,b,'refund','Refunded credit purchase','refund:'||p_event);
 UPDATE public.credit_payments SET refunded_amount=p_refunded,refunded_credits=target,status=CASE WHEN p_refunded=p.amount THEN 'refunded' ELSE 'partially_refunded' END,updated_at=now() WHERE id=p.id;
END $$;
REVOKE ALL ON FUNCTION public.ensure_credit_wallet(uuid,text),public.reserve_discovery_credits(uuid,text,uuid),public.settle_credit_reservation(uuid,boolean),public.attach_credit_run(uuid,uuid),public.adjust_credit_balance(uuid,text,integer,text,text),public.fulfill_credit_payment(uuid,text,text,text,text,integer,text),public.refund_credit_payment(text,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_credit_wallet(uuid,text),public.reserve_discovery_credits(uuid,text,uuid),public.settle_credit_reservation(uuid,boolean),public.attach_credit_run(uuid,uuid),public.adjust_credit_balance(uuid,text,integer,text,text),public.fulfill_credit_payment(uuid,text,text,text,text,integer,text),public.refund_credit_payment(text,text,text,integer) TO service_role;