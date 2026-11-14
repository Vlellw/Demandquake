CREATE TABLE public.brand_profiles (
  domain text PRIMARY KEY,
  status text NOT NULL DEFAULT 'found' CHECK (status IN ('found', 'not_found', 'error')),
  title text,
  description text,
  slogan text,
  logo_url text,
  icon_url text,
  colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  employees text,
  hq_country text,
  error text,
  retrieved_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brand_profiles TO anon;
GRANT SELECT ON public.brand_profiles TO authenticated;
GRANT ALL ON public.brand_profiles TO service_role;

ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand profiles are public"
ON public.brand_profiles
FOR SELECT
TO anon, authenticated
USING (true);