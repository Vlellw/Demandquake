-- Shared updated_at helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Discovery runs: one live research session started from a user query
create table public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  query_key text not null,
  industry text,
  geography text,
  status text not null default 'queued',
  stage_started_at timestamptz,
  plan jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
grant select on public.discovery_runs to anon, authenticated;
grant all on public.discovery_runs to service_role;
alter table public.discovery_runs enable row level security;
create policy "Research runs are public" on public.discovery_runs for select to anon, authenticated using (true);
create index discovery_runs_query_key_idx on public.discovery_runs (query_key, created_at desc);
create index discovery_runs_created_idx on public.discovery_runs (created_at desc);
create trigger discovery_runs_touch before update on public.discovery_runs for each row execute function public.touch_updated_at();

-- 2. Problem clusters identified from evidence
create table public.clusters (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.discovery_runs(id) on delete cascade,
  rank integer not null default 0,
  title text not null,
  summary text not null,
  affected_users text,
  why_now text,
  industry text,
  geography text,
  category text,
  evidence_strength text not null default 'emerging',
  strength_reason text,
  source_ids uuid[] not null default '{}',
  signals jsonb not null default '[]'::jsonb,
  generation_status text not null default 'pending',
  generation_started_at timestamptz,
  generation_error text,
  startup_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.clusters to anon, authenticated;
grant all on public.clusters to service_role;
alter table public.clusters enable row level security;
create policy "Problem clusters are public" on public.clusters for select to anon, authenticated using (true);
create index clusters_run_idx on public.clusters (run_id, rank);

-- 3. Unclaimed startups generated from clusters
create table public.startups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  run_id uuid references public.discovery_runs(id) on delete set null,
  cluster_id uuid references public.clusters(id) on delete set null,
  name text not null,
  tagline text not null,
  industry text,
  geography text,
  business_model_type text,
  brand jsonb not null default '{}'::jsonb,
  problem jsonb not null default '{}'::jsonb,
  solution jsonb not null default '{}'::jsonb,
  customers jsonb not null default '[]'::jsonb,
  business_model jsonb not null default '{}'::jsonb,
  competitors jsonb not null default '[]'::jsonb,
  differentiation jsonb not null default '[]'::jsonb,
  assessment jsonb not null default '{}'::jsonb,
  validation_steps jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  pitch jsonb not null default '{}'::jsonb,
  business_plan jsonb not null default '{}'::jsonb,
  hypotheses jsonb not null default '[]'::jsonb,
  monitor_queries text[] not null default '{}',
  evidence_source_ids uuid[] not null default '{}',
  claim_count integer not null default 0,
  research_at timestamptz not null default now(),
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.startups to anon, authenticated;
grant all on public.startups to service_role;
alter table public.startups enable row level security;
create policy "Unclaimed startups are public" on public.startups for select to anon, authenticated using (true);
create index startups_created_idx on public.startups (created_at desc);
create index startups_run_idx on public.startups (run_id);
create trigger startups_touch before update on public.startups for each row execute function public.touch_updated_at();

alter table public.clusters add constraint clusters_startup_fk foreign key (startup_id) references public.startups(id) on delete set null;

-- 4. Market scans (Opportunity Quake)
create table public.market_scans (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  status text not null default 'fetching',
  stage_started_at timestamptz,
  window_days integer not null default 30,
  queries text[] not null default '{}',
  candidates_count integer not null default 0,
  new_source_ids uuid[] not null default '{}',
  verdict text,
  headline text,
  summary text,
  changes jsonb not null default '[]'::jsonb,
  assessment_before jsonb,
  assessment_after jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
grant select on public.market_scans to anon, authenticated;
grant all on public.market_scans to service_role;
alter table public.market_scans enable row level security;
create policy "Market scans are public" on public.market_scans for select to anon, authenticated using (true);
create index market_scans_startup_idx on public.market_scans (startup_id, created_at desc);

-- 5. Evidence sources retrieved from the live web
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.discovery_runs(id) on delete cascade,
  startup_id uuid references public.startups(id) on delete cascade,
  scan_id uuid references public.market_scans(id) on delete cascade,
  url text not null,
  domain text not null,
  title text not null,
  snippet text,
  highlights text[] not null default '{}',
  publisher text,
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  origin text not null default 'web',
  article_type text,
  search_query text,
  search_intent text,
  relevance text,
  signal_type text,
  created_at timestamptz not null default now()
);
grant select on public.sources to anon, authenticated;
grant all on public.sources to service_role;
alter table public.sources enable row level security;
create policy "Evidence sources are public" on public.sources for select to anon, authenticated using (true);
create unique index sources_run_url_uidx on public.sources (run_id, url) where run_id is not null;
create unique index sources_startup_url_uidx on public.sources (startup_id, url) where startup_id is not null;
create index sources_scan_idx on public.sources (scan_id);

-- 6. Claimed founder workspaces (private to their owner)
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  startup_id uuid references public.startups(id) on delete set null,
  name text not null,
  tagline text,
  concept text,
  brand jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  roadmap jsonb not null default '[]'::jsonb,
  updates jsonb not null default '[]'::jsonb,
  pitch jsonb not null default '{}'::jsonb,
  research jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, startup_id)
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "Founders read own projects" on public.projects for select to authenticated using (auth.uid() = user_id);
create policy "Founders create own projects" on public.projects for insert to authenticated with check (auth.uid() = user_id);
create policy "Founders update own projects" on public.projects for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Founders delete own projects" on public.projects for delete to authenticated using (auth.uid() = user_id);
create index projects_user_idx on public.projects (user_id, updated_at desc);
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

-- Keep the public claim counter in sync without exposing who claimed
create or replace function public.sync_claim_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.startup_id is not null then
    update public.startups set claim_count = claim_count + 1 where id = new.startup_id;
  elsif tg_op = 'DELETE' and old.startup_id is not null then
    update public.startups set claim_count = greatest(claim_count - 1, 0) where id = old.startup_id;
  end if;
  return null;
end;
$$;
create trigger projects_claim_count after insert or delete on public.projects for each row execute function public.sync_claim_count();