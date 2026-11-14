ALTER TABLE public.brand_profiles ADD COLUMN industries text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.brand_name_lookups (
  lookup_key text PRIMARY KEY,
  name text NOT NULL,
  industry text,
  status text NOT NULL CHECK (status IN ('found', 'not_found', 'rejected', 'error')),
  domain text,
  error text,
  retrieved_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brand_name_lookups TO anon;
GRANT SELECT ON public.brand_name_lookups TO authenticated;
GRANT ALL ON public.brand_name_lookups TO service_role;

ALTER TABLE public.brand_name_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand name lookups are public"
ON public.brand_name_lookups
FOR SELECT
TO anon, authenticated
USING (true);