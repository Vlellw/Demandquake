-- Demand checks: one cached row per startup and evidence section, filled by background workers.
CREATE TABLE public.demand_evidence (
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('plan','voices','reviews','pricing','funding','videos','why_now','market_size','local')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','empty','not_applicable','error')),
  data jsonb,
  error text,
  credits_used integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  retrieved_at timestamptz,
  attempt_after timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (startup_id, section)
);
GRANT ALL ON public.demand_evidence TO service_role;
ALTER TABLE public.demand_evidence ENABLE ROW LEVEL SECURITY;

-- Weekly web watch: Context.dev watchers shared by every workspace of a startup.
CREATE TABLE public.startup_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('search','pricing')),
  monitor_id text,
  target text NOT NULL,
  label text,
  status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating','active','error')),
  error text,
  last_checked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, kind)
);
GRANT ALL ON public.startup_watches TO service_role;
ALTER TABLE public.startup_watches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.startup_watch_subscribers (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX startup_watch_subscribers_startup_idx ON public.startup_watch_subscribers (startup_id);
GRANT ALL ON public.startup_watch_subscribers TO service_role;
ALTER TABLE public.startup_watch_subscribers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.startup_watch_changes (
  id text PRIMARY KEY,
  watch_id uuid NOT NULL REFERENCES public.startup_watches(id) ON DELETE CASCADE,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  summary text,
  url text,
  matched jsonb NOT NULL DEFAULT '[]'::jsonb,
  importance text,
  detected_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX startup_watch_changes_startup_idx ON public.startup_watch_changes (startup_id, detected_at DESC);
GRANT ALL ON public.startup_watch_changes TO service_role;
ALTER TABLE public.startup_watch_changes ENABLE ROW LEVEL SECURITY;