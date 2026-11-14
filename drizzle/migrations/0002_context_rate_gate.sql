-- Shared request-rate gate for the Context.dev API (server-side only)
create table public.api_rate_events (
  id bigserial primary key,
  provider text not null,
  created_at timestamptz not null default now()
);
grant all on public.api_rate_events to service_role;
grant usage, select on sequence public.api_rate_events_id_seq to service_role;
alter table public.api_rate_events enable row level security;
create index api_rate_events_provider_idx on public.api_rate_events (provider, created_at desc);

create or replace function public.reserve_rate_slot(p_provider text, p_limit integer, p_window_ms integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  oldest timestamptz;
  win interval := make_interval(secs => p_window_ms / 1000.0);
begin
  perform pg_advisory_xact_lock(hashtext('rate:' || p_provider));
  delete from public.api_rate_events where provider = p_provider and created_at < now() - interval '15 minutes';
  select count(*), min(created_at) into n, oldest
    from public.api_rate_events
    where provider = p_provider and created_at > now() - win;
  if n < p_limit then
    insert into public.api_rate_events (provider) values (p_provider);
    return 0;
  end if;
  return greatest(300, ceil(extract(epoch from (oldest + win - now())) * 1000)::integer + 400);
end;
$$;

revoke execute on function public.reserve_rate_slot(text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_rate_slot(text, integer, integer) to service_role;