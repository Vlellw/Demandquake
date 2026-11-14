-- Co-founder collaboration: invite links, members with edit rights, ownership locked to the claimer.
alter table public.projects add column owner_name text;

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  display_name text not null default 'Co-founder',
  role text not null default 'editor' check (role in ('editor')),
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
grant select, delete on public.project_members to authenticated;
grant all on public.project_members to service_role;
alter table public.project_members enable row level security;
create index project_members_user_idx on public.project_members (user_id);

create table public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  revoked_at timestamptz
);
grant select, insert, update on public.project_invites to authenticated;
grant all on public.project_invites to service_role;
alter table public.project_invites enable row level security;
create index project_invites_project_idx on public.project_invites (project_id, created_at desc);

create or replace function public.is_project_owner(_project uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects where id = _project and user_id = _user)
$$;

create or replace function public.is_project_member(_project uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members where project_id = _project and user_id = _user)
$$;

revoke execute on function public.is_project_owner(uuid, uuid) from public, anon;
revoke execute on function public.is_project_member(uuid, uuid) from public, anon;
grant execute on function public.is_project_owner(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_project_member(uuid, uuid) to authenticated, service_role;

-- Projects: members can read and edit; only the owner can delete (existing owner policies stay).
create policy "Members read shared projects" on public.projects for select to authenticated
  using (public.is_project_member(id, auth.uid()));
create policy "Members update shared projects" on public.projects for update to authenticated
  using (public.is_project_member(id, auth.uid())) with check (public.is_project_member(id, auth.uid()));

-- Members: the team sees each other; the owner removes anyone, a member can leave. Joining only via invite.
create policy "Team reads members" on public.project_members for select to authenticated
  using (public.is_project_owner(project_id, auth.uid()) or public.is_project_member(project_id, auth.uid()));
create policy "Owner removes members or member leaves" on public.project_members for delete to authenticated
  using (public.is_project_owner(project_id, auth.uid()) or user_id = auth.uid());

-- Invites: owner-only.
create policy "Owners read invites" on public.project_invites for select to authenticated
  using (public.is_project_owner(project_id, auth.uid()));
create policy "Owners create invites" on public.project_invites for insert to authenticated
  with check (created_by = auth.uid() and public.is_project_owner(project_id, auth.uid()));
create policy "Owners revoke invites" on public.project_invites for update to authenticated
  using (public.is_project_owner(project_id, auth.uid())) with check (public.is_project_owner(project_id, auth.uid()));

-- Editors can change content, never who owns the project or which startup it came from.
create or replace function public.lock_project_ownership()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Project ownership cannot be changed';
  end if;
  if new.startup_id is distinct from old.startup_id and new.startup_id is not null then
    raise exception 'The source startup of a project cannot be changed';
  end if;
  if new.owner_name is distinct from old.owner_name and auth.uid() is distinct from old.user_id then
    raise exception 'Only the owner can change the owner name';
  end if;
  return new;
end;
$$;
create trigger projects_lock_ownership before update on public.projects
  for each row execute function public.lock_project_ownership();

-- Invite preview for the person holding the link (details only while the link is usable).
create or replace function public.preview_project_invite(_token text)
returns table (project_id uuid, project_name text, tagline text, brand jsonb, owner_name text, status text)
language sql stable security definer set search_path = public as $$
  with x as (
    select p.id, p.name, p.tagline, p.brand, p.owner_name,
      case
        when p.user_id = auth.uid() then 'owner'
        when exists (select 1 from public.project_members m where m.project_id = p.id and m.user_id = auth.uid()) then 'member'
        when i.revoked_at is not null then 'revoked'
        when i.expires_at < now() then 'expired'
        else 'valid'
      end as status
    from public.project_invites i
    join public.projects p on p.id = i.project_id
    where i.token = _token
  )
  select
    case when status in ('valid', 'owner', 'member') then id end,
    case when status in ('valid', 'owner', 'member') then name end,
    case when status in ('valid', 'owner', 'member') then tagline end,
    case when status in ('valid', 'owner', 'member') then brand end,
    case when status in ('valid', 'owner', 'member') then owner_name end,
    status
  from x
$$;

create or replace function public.accept_project_invite(_token text, _display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv public.project_invites;
  owner_id uuid;
  uid uuid := auth.uid();
  member_name text := left(coalesce(nullif(trim(_display_name), ''), 'Co-founder'), 80);
  inserted integer;
begin
  if uid is null then
    raise exception 'Sign in to accept this invite';
  end if;
  select * into inv from public.project_invites where token = _token;
  if not found or inv.revoked_at is not null or inv.expires_at < now() then
    raise exception 'This invite link is invalid or has expired';
  end if;
  select user_id into owner_id from public.projects where id = inv.project_id;
  if owner_id = uid then
    return inv.project_id;
  end if;
  insert into public.project_members (project_id, user_id, display_name)
  values (inv.project_id, uid, member_name)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then
    update public.projects
    set updates = updates || jsonb_build_array(jsonb_build_object(
      'id', 'm-' || replace(gen_random_uuid()::text, '-', ''),
      'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'kind', 'member',
      'title', member_name || ' joined as co-founder',
      'text', 'Joined through an invite link and can now edit this workspace.',
      'author', member_name
    ))
    where id = inv.project_id;
  end if;
  return inv.project_id;
end;
$$;

revoke execute on function public.preview_project_invite(text) from public, anon;
revoke execute on function public.accept_project_invite(text, text) from public, anon;
grant execute on function public.preview_project_invite(text) to authenticated;
grant execute on function public.accept_project_invite(text, text) to authenticated;