-- C2 infrastructure-preflight probe only. It is copied into an ephemeral
-- GitHub-hosted Supabase workdir and is never applied to a linked project.
-- Rollback: drop table if exists public.wcv_c2_preflight_tenant_probe;

begin;

create table if not exists public.wcv_c2_preflight_tenant_probe (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assertion text not null check (assertion = 'same_user_permitted'),
  created_at timestamptz not null default now()
);

create index if not exists wcv_c2_preflight_tenant_probe_user_id_idx
  on public.wcv_c2_preflight_tenant_probe (user_id);

alter table public.wcv_c2_preflight_tenant_probe enable row level security;
alter table public.wcv_c2_preflight_tenant_probe force row level security;

revoke all on table public.wcv_c2_preflight_tenant_probe from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, delete on table public.wcv_c2_preflight_tenant_probe to authenticated;

drop policy if exists wcv_c2_preflight_select_own
  on public.wcv_c2_preflight_tenant_probe;
create policy wcv_c2_preflight_select_own
  on public.wcv_c2_preflight_tenant_probe
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists wcv_c2_preflight_insert_own
  on public.wcv_c2_preflight_tenant_probe;
create policy wcv_c2_preflight_insert_own
  on public.wcv_c2_preflight_tenant_probe
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists wcv_c2_preflight_delete_own
  on public.wcv_c2_preflight_tenant_probe;
create policy wcv_c2_preflight_delete_own
  on public.wcv_c2_preflight_tenant_probe
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.wcv_c2_preflight_tenant_probe is
  'Synthetic tenant-isolation probe for the WCV-C2 GitHub-hosted preflight only.';

commit;
