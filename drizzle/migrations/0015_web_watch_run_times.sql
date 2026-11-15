ALTER TABLE public.startup_watches ADD COLUMN IF NOT EXISTS last_run_at timestamptz;
ALTER TABLE public.startup_watches ADD COLUMN IF NOT EXISTS next_run_at timestamptz;