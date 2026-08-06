-- S236P lean Owner-private Storage and metadata plane.
--
-- Scope:
--   * existing Supabase project `inverge-beta` only
--   * synthetic fixtures only
--   * no runtime, real-content, Production, OCR, or AI-provider activation
--
-- Canonical resources:
--   * bucket: s236p-owner-private-v1
--   * metadata: public.s236p_owner_private_objects
--   * metadata log: public.s236p_owner_private_events
--
-- Authorization uses the authenticated JWT subject through auth.uid(). It
-- never uses email, raw_user_meta_data, or another user-editable claim.
--
-- Rollback (operator-only, after first emptying the bucket through the Storage
-- API and confirming no non-synthetic rows remain):
--   drop policy if exists "s236p owner private delete" on storage.objects;
--   drop policy if exists "s236p owner private update" on storage.objects;
--   drop policy if exists "s236p owner private insert" on storage.objects;
--   drop policy if exists "s236p owner private select" on storage.objects;
--   drop trigger if exists s236p_guard_object_update_v1
--     on public.s236p_owner_private_objects;
--   drop trigger if exists s236p_set_object_lifecycle_v1
--     on public.s236p_owner_private_objects;
--   drop trigger if exists s236p_set_event_lifecycle_v1
--     on public.s236p_owner_private_events;
--   drop function if exists public.s236p_expired_object_paths_v1(timestamptz);
--   drop function if exists public.s236p_authorize_signed_url_v1(uuid, integer);
--   drop function if exists public.s236p_guard_object_update_v1();
--   drop function if exists public.s236p_set_object_lifecycle_v1();
--   drop function if exists public.s236p_set_event_lifecycle_v1();
--   drop table if exists public.s236p_owner_private_events;
--   drop table if exists public.s236p_owner_private_objects;
--   delete from storage.buckets where id = 's236p-owner-private-v1'
--     and not exists (
--       select 1 from storage.objects
--       where bucket_id = 's236p-owner-private-v1'
--     );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  's236p-owner-private-v1',
  's236p-owner-private-v1',
  false,
  1048576,
  array['application/octet-stream']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.s236p_owner_private_objects (
  object_ref uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null default 's236p-owner-private-v1',
  storage_path text not null,
  storage_class text not null default 'private',
  object_state text not null default 'active',
  object_version bigint not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  content_retention_days smallint not null default 365,
  content_expires_at timestamptz not null,
  temporary_ttl_seconds smallint not null default 0,
  temporary_expires_at timestamptz,
  signed_url_ttl_seconds smallint not null default 300,
  application_cache_ttl_seconds smallint not null default 0,
  export_delete_sla_seconds integer not null default 604800,
  delete_requested_at timestamptz,
  delete_due_at timestamptz,
  ocr_ai_provider_mode text not null default 'none',
  external_ocr_ai_provider_call_count integer not null default 0,
  raw_external_emission_count integer not null default 0,
  contains_real_content boolean not null default false,
  constraint s236p_owner_private_objects_owner_path_unique
    unique (owner_id, storage_path),
  constraint s236p_owner_private_objects_path_unique
    unique (storage_path),
  constraint s236p_owner_private_objects_owner_ref_unique
    unique (owner_id, object_ref),
  constraint s236p_owner_private_objects_bucket_exact
    check (bucket_id = 's236p-owner-private-v1'),
  constraint s236p_owner_private_objects_path_opaque
    check (
      storage_path ~ (
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}' ||
        '/(temporary/)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
    ),
  constraint s236p_owner_private_objects_storage_class_closed
    check (storage_class in ('private', 'temporary')),
  constraint s236p_owner_private_objects_state_closed
    check (object_state in ('active', 'delete_requested')),
  constraint s236p_owner_private_objects_version_positive
    check (object_version > 0),
  constraint s236p_owner_private_objects_retention_max_365
    check (content_retention_days between 1 and 365),
  constraint s236p_owner_private_objects_temporary_ttl_max_300
    check (
      (storage_class = 'private' and temporary_ttl_seconds = 0)
      or
      (storage_class = 'temporary' and temporary_ttl_seconds between 1 and 300)
    ),
  constraint s236p_owner_private_objects_signed_url_ttl_max_300
    check (signed_url_ttl_seconds between 1 and 300),
  constraint s236p_owner_private_objects_application_cache_ttl_zero
    check (application_cache_ttl_seconds = 0),
  constraint s236p_owner_private_objects_export_delete_sla_max_7d
    check (export_delete_sla_seconds between 1 and 604800),
  constraint s236p_owner_private_objects_provider_mode_none
    check (ocr_ai_provider_mode = 'none'),
  constraint s236p_owner_private_objects_provider_calls_zero
    check (external_ocr_ai_provider_call_count = 0),
  constraint s236p_owner_private_objects_raw_emissions_zero
    check (raw_external_emission_count = 0),
  constraint s236p_owner_private_objects_synthetic_only
    check (contains_real_content = false),
  constraint s236p_owner_private_objects_delete_state_consistent
    check (
      (object_state = 'active' and delete_requested_at is null)
      or
      (object_state = 'delete_requested' and delete_requested_at is not null)
    )
);

create index if not exists idx_s236p_owner_private_objects_owner_expiry
  on public.s236p_owner_private_objects (
    owner_id,
    content_expires_at,
    temporary_expires_at
  );

create table if not exists public.s236p_owner_private_events (
  event_ref uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  object_ref uuid not null,
  event_type text not null,
  occurred_at timestamptz not null default statement_timestamp(),
  retention_days smallint not null default 7,
  expires_at timestamptz not null,
  contains_raw_content boolean not null default false,
  constraint s236p_owner_private_events_object_fkey
    foreign key (owner_id, object_ref)
    references public.s236p_owner_private_objects (owner_id, object_ref)
    on delete cascade,
  constraint s236p_owner_private_events_type_closed
    check (
      event_type in (
        'upload',
        'list',
        'read',
        'update',
        'delete',
        'signed_url',
        'cleanup'
      )
    ),
  constraint s236p_owner_private_events_retention_max_7d
    check (retention_days between 1 and 7),
  constraint s236p_owner_private_events_metadata_only
    check (contains_raw_content = false)
);

create index if not exists idx_s236p_owner_private_events_owner_expiry
  on public.s236p_owner_private_events (owner_id, expires_at);

create index if not exists idx_s236p_owner_private_events_owner_object
  on public.s236p_owner_private_events (owner_id, object_ref);

create or replace function public.s236p_set_object_lifecycle_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.created_at := statement_timestamp();
  new.updated_at := new.created_at;
  new.content_expires_at :=
    new.created_at + make_interval(days => new.content_retention_days);

  if new.storage_class = 'temporary' then
    new.temporary_expires_at :=
      new.created_at + make_interval(secs => new.temporary_ttl_seconds);
  else
    new.temporary_expires_at := null;
  end if;

  if new.object_state = 'delete_requested' then
    new.delete_requested_at := new.created_at;
    new.delete_due_at :=
      new.delete_requested_at
      + make_interval(secs => new.export_delete_sla_seconds);
  else
    new.delete_requested_at := null;
    new.delete_due_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.s236p_set_object_lifecycle_v1() from public;

drop trigger if exists s236p_set_object_lifecycle_v1
  on public.s236p_owner_private_objects;
create trigger s236p_set_object_lifecycle_v1
before insert on public.s236p_owner_private_objects
for each row execute function public.s236p_set_object_lifecycle_v1();

create or replace function public.s236p_set_event_lifecycle_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.occurred_at := statement_timestamp();
  else
    new.occurred_at := old.occurred_at;
  end if;
  new.expires_at :=
    new.occurred_at + make_interval(days => new.retention_days);
  return new;
end;
$$;

revoke all on function public.s236p_set_event_lifecycle_v1() from public;

drop trigger if exists s236p_set_event_lifecycle_v1
  on public.s236p_owner_private_events;
create trigger s236p_set_event_lifecycle_v1
before insert or update on public.s236p_owner_private_events
for each row execute function public.s236p_set_event_lifecycle_v1();

create or replace function public.s236p_guard_object_update_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id
    or new.object_ref is distinct from old.object_ref
    or new.bucket_id is distinct from old.bucket_id
    or new.storage_path is distinct from old.storage_path
    or new.storage_class is distinct from old.storage_class
    or new.created_at is distinct from old.created_at
    or new.content_expires_at is distinct from old.content_expires_at
    or new.temporary_expires_at is distinct from old.temporary_expires_at
    or new.delete_due_at is distinct from old.delete_due_at
    or new.content_retention_days is distinct from old.content_retention_days
    or new.temporary_ttl_seconds is distinct from old.temporary_ttl_seconds
    or new.signed_url_ttl_seconds is distinct from old.signed_url_ttl_seconds
    or new.application_cache_ttl_seconds is distinct from old.application_cache_ttl_seconds
    or new.export_delete_sla_seconds is distinct from old.export_delete_sla_seconds
    or new.ocr_ai_provider_mode is distinct from old.ocr_ai_provider_mode
    or new.external_ocr_ai_provider_call_count is distinct from old.external_ocr_ai_provider_call_count
    or new.raw_external_emission_count is distinct from old.raw_external_emission_count
    or new.contains_real_content is distinct from old.contains_real_content
  then
    raise exception using
      errcode = '22023',
      message = 's236p_immutable_policy_field';
  end if;

  if new.object_version <> old.object_version + 1 then
    raise exception using
      errcode = '40001',
      message = 's236p_object_version_conflict';
  end if;

  if old.delete_requested_at is not null
    and new.delete_requested_at is distinct from old.delete_requested_at
  then
    raise exception using
      errcode = '22023',
      message = 's236p_delete_request_immutable';
  end if;

  if old.object_state = 'active'
    and new.object_state = 'delete_requested'
  then
    new.delete_requested_at := statement_timestamp();
    new.delete_due_at :=
      new.delete_requested_at
      + make_interval(secs => new.export_delete_sla_seconds);
  end if;

  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function public.s236p_guard_object_update_v1() from public;

drop trigger if exists s236p_guard_object_update_v1
  on public.s236p_owner_private_objects;
create trigger s236p_guard_object_update_v1
before update on public.s236p_owner_private_objects
for each row execute function public.s236p_guard_object_update_v1();

create or replace function public.s236p_authorize_signed_url_v1(
  p_object_ref uuid,
  p_ttl_seconds integer
)
returns table (
  bucket_id text,
  storage_path text,
  ttl_seconds integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
begin
  if v_owner_id is null then
    raise exception using
      errcode = '28000',
      message = 's236p_auth_required';
  end if;

  if p_ttl_seconds is null or p_ttl_seconds < 1 or p_ttl_seconds > 300 then
    raise exception using
      errcode = '22023',
      message = 's236p_signed_url_ttl_out_of_range';
  end if;

  return query
  select
    o.bucket_id,
    o.storage_path,
    p_ttl_seconds
  from public.s236p_owner_private_objects as o
  where o.owner_id = v_owner_id
    and o.object_ref = p_object_ref
    and o.object_state = 'active'
    and o.content_expires_at > statement_timestamp()
    and (
      o.temporary_expires_at is null
      or o.temporary_expires_at > statement_timestamp()
    )
    and p_ttl_seconds <= o.signed_url_ttl_seconds;

  if not found then
    raise exception using
      errcode = '42501',
      message = 's236p_signed_url_not_authorized';
  end if;
end;
$$;

revoke all on function public.s236p_authorize_signed_url_v1(uuid, integer)
  from public, anon;
grant execute on function public.s236p_authorize_signed_url_v1(uuid, integer)
  to authenticated;

create or replace function public.s236p_expired_object_paths_v1(
  p_as_of timestamptz
)
returns table (
  object_ref uuid,
  bucket_id text,
  storage_path text
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    o.object_ref,
    o.bucket_id,
    o.storage_path
  from public.s236p_owner_private_objects as o
  where o.owner_id = (select auth.uid())
    and p_as_of is not null
    and (
      o.content_expires_at <= p_as_of
      or (
        o.temporary_expires_at is not null
        and o.temporary_expires_at <= p_as_of
      )
    )
  order by o.storage_path;
$$;

revoke all on function public.s236p_expired_object_paths_v1(timestamptz)
  from public, anon;
grant execute on function public.s236p_expired_object_paths_v1(timestamptz)
  to authenticated;

alter table public.s236p_owner_private_objects enable row level security;
alter table public.s236p_owner_private_objects force row level security;
alter table public.s236p_owner_private_events enable row level security;
alter table public.s236p_owner_private_events force row level security;

drop policy if exists "s236p owner private objects select"
  on public.s236p_owner_private_objects;
create policy "s236p owner private objects select"
on public.s236p_owner_private_objects
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "s236p owner private objects insert"
  on public.s236p_owner_private_objects;
create policy "s236p owner private objects insert"
on public.s236p_owner_private_objects
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "s236p owner private objects update"
  on public.s236p_owner_private_objects;
create policy "s236p owner private objects update"
on public.s236p_owner_private_objects
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "s236p owner private objects delete"
  on public.s236p_owner_private_objects;
create policy "s236p owner private objects delete"
on public.s236p_owner_private_objects
for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "s236p owner private events select"
  on public.s236p_owner_private_events;
create policy "s236p owner private events select"
on public.s236p_owner_private_events
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "s236p owner private events insert"
  on public.s236p_owner_private_events;
create policy "s236p owner private events insert"
on public.s236p_owner_private_events
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "s236p owner private events update"
  on public.s236p_owner_private_events;
create policy "s236p owner private events update"
on public.s236p_owner_private_events
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "s236p owner private events delete"
  on public.s236p_owner_private_events;
create policy "s236p owner private events delete"
on public.s236p_owner_private_events
for delete
to authenticated
using ((select auth.uid()) = owner_id);

revoke all on table public.s236p_owner_private_objects
  from public, anon, authenticated;
revoke all on table public.s236p_owner_private_events
  from public, anon, authenticated;

grant select, delete on table public.s236p_owner_private_objects
  to authenticated;
grant insert (
  object_ref,
  owner_id,
  bucket_id,
  storage_path,
  storage_class,
  object_state,
  object_version,
  content_retention_days,
  temporary_ttl_seconds,
  signed_url_ttl_seconds,
  application_cache_ttl_seconds,
  export_delete_sla_seconds,
  delete_requested_at,
  ocr_ai_provider_mode,
  external_ocr_ai_provider_call_count,
  raw_external_emission_count,
  contains_real_content
) on public.s236p_owner_private_objects
  to authenticated;
grant update (
  object_state,
  object_version,
  delete_requested_at
) on public.s236p_owner_private_objects
  to authenticated;

grant select, delete on table public.s236p_owner_private_events
  to authenticated;
grant insert (
  event_ref,
  owner_id,
  object_ref,
  event_type,
  retention_days,
  contains_raw_content
) on public.s236p_owner_private_events
  to authenticated;
grant update (
  event_type,
  retention_days
) on public.s236p_owner_private_events
  to authenticated;

grant select, insert, update, delete
  on table public.s236p_owner_private_objects
  to service_role;
grant select, insert, update, delete
  on table public.s236p_owner_private_events
  to service_role;

drop policy if exists "s236p owner private select" on storage.objects;
create policy "s236p owner private select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 's236p-owner-private-v1'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1
    from public.s236p_owner_private_objects as o
    where o.owner_id = (select auth.uid())
      and o.bucket_id = storage.objects.bucket_id
      and o.storage_path = storage.objects.name
      and o.object_state = 'active'
      and o.content_expires_at > statement_timestamp()
      and (
        o.temporary_expires_at is null
        or o.temporary_expires_at > statement_timestamp()
      )
  )
);

drop policy if exists "s236p owner private insert" on storage.objects;
create policy "s236p owner private insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 's236p-owner-private-v1'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1
    from public.s236p_owner_private_objects as o
    where o.owner_id = (select auth.uid())
      and o.bucket_id = storage.objects.bucket_id
      and o.storage_path = storage.objects.name
      and o.object_state = 'active'
      and o.content_expires_at > statement_timestamp()
      and (
        o.temporary_expires_at is null
        or o.temporary_expires_at > statement_timestamp()
      )
  )
);

drop policy if exists "s236p owner private update" on storage.objects;
create policy "s236p owner private update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 's236p-owner-private-v1'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1
    from public.s236p_owner_private_objects as o
    where o.owner_id = (select auth.uid())
      and o.bucket_id = storage.objects.bucket_id
      and o.storage_path = storage.objects.name
      and o.object_state = 'active'
      and o.content_expires_at > statement_timestamp()
      and (
        o.temporary_expires_at is null
        or o.temporary_expires_at > statement_timestamp()
      )
  )
)
with check (
  bucket_id = 's236p-owner-private-v1'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1
    from public.s236p_owner_private_objects as o
    where o.owner_id = (select auth.uid())
      and o.bucket_id = storage.objects.bucket_id
      and o.storage_path = storage.objects.name
      and o.object_state = 'active'
      and o.content_expires_at > statement_timestamp()
      and (
        o.temporary_expires_at is null
        or o.temporary_expires_at > statement_timestamp()
      )
  )
);

drop policy if exists "s236p owner private delete" on storage.objects;
create policy "s236p owner private delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 's236p-owner-private-v1'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1
    from public.s236p_owner_private_objects as o
    where o.owner_id = (select auth.uid())
      and o.bucket_id = storage.objects.bucket_id
      and o.storage_path = storage.objects.name
  )
);
