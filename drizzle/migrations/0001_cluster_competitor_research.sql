alter table public.clusters add column competitor_query text;
alter table public.clusters add column competitor_source_ids uuid[] not null default '{}';
alter table public.clusters add column keywords text[] not null default '{}';