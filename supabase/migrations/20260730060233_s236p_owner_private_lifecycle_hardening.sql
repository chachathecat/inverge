-- Migration: s236p_owner_private_lifecycle_hardening
-- S236P Owner-private lifecycle hardening.
--
-- This corrective migration must follow exactly:
--   20260730023248_s236p_lean_owner_private.sql
--
-- Narrowed Owner pilot configuration:
--   * authenticated JWT + Storage RLS download/list/upload/delete only
--   * signed URL and signed-upload issuance disabled
--   * immutable originals and append-only, same-owner revisions
--   * metadata-independent Owner Storage cleanup
--   * persistent S236P metadata event log disabled (mode none, retention 0)
--   * no Edge Function, pg_cron, external OCR/AI provider, or real content
--
-- The migration fails closed unless every S236P live data surface is empty.
-- It is idempotent after a successful empty-state application.
--
-- Rollback is operator-only and may run only while the S236P bucket and
-- metadata table are empty. Restore the predecessor schema from the recorded
-- migration only through a separately reviewed forward migration; never edit
-- or replay the already recorded predecessor in place.

do $$
declare
  v_event_rows_exist boolean := false;
begin
  if to_regclass('public.s236p_owner_private_objects') is null then
    raise exception using
      errcode = '55000',
      message = 's236p_hardening_predecessor_missing';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 's236p-owner-private-v1'
      and public = false
  ) then
    raise exception using
      errcode = '55000',
      message = 's236p_hardening_private_bucket_missing';
  end if;

  if exists (
    select 1
    from public.s236p_owner_private_objects
  ) then
    raise exception using
      errcode = '55000',
      message = 's236p_hardening_metadata_not_empty';
  end if;

  if exists (
    select 1
    from storage.objects
    where bucket_id = 's236p-owner-private-v1'
  ) then
    raise exception using
      errcode = '55000',
      message = 's236p_hardening_storage_not_empty';
  end if;

  if to_regclass('public.s236p_owner_private_events') is not null then
    execute
      'select exists (' ||
      'select 1 from public.s236p_owner_private_events' ||
      ')'
      into v_event_rows_exist;
    if v_event_rows_exist then
      raise exception using
        errcode = '55000',
        message = 's236p_hardening_event_log_not_empty';
    end if;
  end if;
end;
$$;

-- Signed access is OFF. Remove the predecessor RPC and every client grant.
do $$
begin
  if to_regprocedure(
    'public.s236p_authorize_signed_url_v1(uuid,integer)'
  ) is not null then
    execute
      'revoke all on function ' ||
      'public.s236p_authorize_signed_url_v1(uuid, integer) ' ||
      'from public, anon, authenticated';
  end if;
end;
$$;

drop function if exists
  public.s236p_authorize_signed_url_v1(uuid, integer);

-- Persistent S236P metadata event logging is OFF (mode none, retention 0).
-- The empty-row precondition above prevents destructive loss.
do $$
begin
  if to_regclass('public.s236p_owner_private_events') is not null then
    execute 'drop policy if exists "s236p owner private events select" ' ||
      'on public.s236p_owner_private_events';
    execute 'drop policy if exists "s236p owner private events insert" ' ||
      'on public.s236p_owner_private_events';
    execute 'drop policy if exists "s236p owner private events update" ' ||
      'on public.s236p_owner_private_events';
    execute 'drop policy if exists "s236p owner private events delete" ' ||
      'on public.s236p_owner_private_events';
    execute 'revoke all on table public.s236p_owner_private_events ' ||
      'from public, anon, authenticated, service_role';
    execute 'drop trigger if exists s236p_set_event_lifecycle_v1 ' ||
      'on public.s236p_owner_private_events';
  end if;
end;
$$;

drop index if exists public.idx_s236p_owner_private_events_owner_expiry;
drop index if exists public.idx_s236p_owner_private_events_owner_object;
drop table if exists public.s236p_owner_private_events;
drop function if exists public.s236p_set_event_lifecycle_v1();

-- Add immutable, same-owner append-only lineage.
alter table public.s236p_owner_private_objects
  add column if not exists parent_object_ref uuid,
  add column if not exists revision_number bigint not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.s236p_owner_private_objects'::regclass
      and conname = 's236p_owner_private_objects_revision_positive'
  ) then
    alter table public.s236p_owner_private_objects
      add constraint s236p_owner_private_objects_revision_positive
      check (revision_number > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.s236p_owner_private_objects'::regclass
      and conname = 's236p_owner_private_objects_revision_shape'
  ) then
    alter table public.s236p_owner_private_objects
      add constraint s236p_owner_private_objects_revision_shape
      check (
        (revision_number = 1 and parent_object_ref is null)
        or
        (revision_number > 1 and parent_object_ref is not null)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.s236p_owner_private_objects'::regclass
      and conname = 's236p_owner_private_objects_version_one'
  ) then
    alter table public.s236p_owner_private_objects
      add constraint s236p_owner_private_objects_version_one
      check (object_version = 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.s236p_owner_private_objects'::regclass
      and conname = 's236p_owner_private_objects_parent_owner_fkey'
  ) then
    alter table public.s236p_owner_private_objects
      add constraint s236p_owner_private_objects_parent_owner_fkey
      foreign key (owner_id, parent_object_ref)
      references public.s236p_owner_private_objects (owner_id, object_ref)
      on update restrict
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.s236p_owner_private_objects'::regclass
      and conname = 's236p_owner_private_objects_parent_revision_unique'
  ) then
    alter table public.s236p_owner_private_objects
      add constraint s236p_owner_private_objects_parent_revision_unique
      unique (owner_id, parent_object_ref, revision_number);
  end if;
end;
$$;

create or replace function public.s236p_set_object_lifecycle_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_parent_revision bigint;
begin
  if new.object_version <> 1 then
    raise exception using
      errcode = '22023',
      message = 's236p_object_version_must_remain_one';
  end if;

  if new.parent_object_ref is null then
    if new.revision_number <> 1 then
      raise exception using
        errcode = '22023',
        message = 's236p_original_revision_must_be_one';
    end if;
  else
    select parent.revision_number
      into v_parent_revision
    from public.s236p_owner_private_objects as parent
    where parent.owner_id = new.owner_id
      and parent.object_ref = new.parent_object_ref;

    if not found then
      raise exception using
        errcode = '42501',
        message = 's236p_lineage_parent_not_owned';
    end if;

    if new.revision_number <> v_parent_revision + 1 then
      raise exception using
        errcode = '22023',
        message = 's236p_revision_sequence_invalid';
    end if;
  end if;

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

revoke all on function public.s236p_set_object_lifecycle_v1()
  from public, anon, authenticated;

-- The only metadata UPDATE is active -> delete_requested. Object identity,
-- path, revision, policy values, and version are immutable.
create or replace function public.s236p_guard_object_update_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id
    or new.object_ref is distinct from old.object_ref
    or new.parent_object_ref is distinct from old.parent_object_ref
    or new.revision_number is distinct from old.revision_number
    or new.bucket_id is distinct from old.bucket_id
    or new.storage_path is distinct from old.storage_path
    or new.storage_class is distinct from old.storage_class
    or new.object_version is distinct from old.object_version
    or new.created_at is distinct from old.created_at
    or new.content_expires_at is distinct from old.content_expires_at
    or new.temporary_expires_at is distinct from old.temporary_expires_at
    or new.content_retention_days is distinct from old.content_retention_days
    or new.temporary_ttl_seconds is distinct from old.temporary_ttl_seconds
    or new.application_cache_ttl_seconds is distinct from old.application_cache_ttl_seconds
    or new.export_delete_sla_seconds is distinct from old.export_delete_sla_seconds
    or new.ocr_ai_provider_mode is distinct from old.ocr_ai_provider_mode
    or new.external_ocr_ai_provider_call_count is distinct from old.external_ocr_ai_provider_call_count
    or new.raw_external_emission_count is distinct from old.raw_external_emission_count
    or new.contains_real_content is distinct from old.contains_real_content
  then
    raise exception using
      errcode = '22023',
      message = 's236p_immutable_object_field';
  end if;

  if old.object_state <> 'active'
    or new.object_state <> 'delete_requested'
  then
    raise exception using
      errcode = '22023',
      message = 's236p_delete_request_transition_only';
  end if;

  new.delete_requested_at := statement_timestamp();
  new.delete_due_at :=
    new.delete_requested_at
    + make_interval(secs => new.export_delete_sla_seconds);
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function public.s236p_guard_object_update_v1()
  from public, anon, authenticated;

alter table public.s236p_owner_private_objects
  drop constraint if exists
    s236p_owner_private_objects_signed_url_ttl_max_300,
  drop column if exists signed_url_ttl_seconds;

-- Rebuild least-privilege metadata grants. The client cannot write server
-- lifecycle timestamps or any immutable identity/lineage field.
revoke all on table public.s236p_owner_private_objects
  from public, anon, authenticated, service_role;

grant select, delete on table public.s236p_owner_private_objects
  to authenticated;
grant insert (
  object_ref,
  owner_id,
  parent_object_ref,
  revision_number,
  bucket_id,
  storage_path,
  storage_class,
  object_state,
  object_version,
  content_retention_days,
  temporary_ttl_seconds,
  application_cache_ttl_seconds,
  export_delete_sla_seconds,
  ocr_ai_provider_mode,
  external_ocr_ai_provider_call_count,
  raw_external_emission_count,
  contains_real_content
) on public.s236p_owner_private_objects
  to authenticated;
grant update (object_state)
  on public.s236p_owner_private_objects
  to authenticated;
grant select, insert, update, delete
  on table public.s236p_owner_private_objects
  to service_role;

-- Operation-aware Storage RLS:
--   allowed: authenticated own list, download, new upload, and cleanup delete
--   denied: object.sign, object.sign_many, sign_upload_url, upload_signed,
--           upload_update, copy, move, overwrite, and every S3/TUS variant
drop policy if exists "s236p owner private select" on storage.objects;
drop policy if exists "s236p owner private insert" on storage.objects;
drop policy if exists "s236p owner private update" on storage.objects;
drop policy if exists "s236p owner private delete" on storage.objects;

create policy "s236p owner private select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 's236p-owner-private-v1'
  and owner_id = (select auth.uid()::text)
  and storage.allow_any_operation(array[
    'storage.object.list',
    'storage.object.list_v2',
    'storage.object.get_authenticated',
    'storage.object.delete',
    'storage.object.delete_many'
  ])
);

create policy "s236p owner private insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 's236p-owner-private-v1'
  and owner_id = (select auth.uid()::text)
  and storage.allow_only_operation('storage.object.upload')
  and exists (
    select 1
    from public.s236p_owner_private_objects as metadata
    where metadata.owner_id = (select auth.uid())
      and metadata.bucket_id = storage.objects.bucket_id
      and metadata.storage_path = storage.objects.name
      and metadata.object_state = 'active'
      and metadata.content_expires_at > statement_timestamp()
      and (
        metadata.temporary_expires_at is null
        or metadata.temporary_expires_at > statement_timestamp()
      )
  )
);

create policy "s236p owner private delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 's236p-owner-private-v1'
  and owner_id = (select auth.uid()::text)
  and storage.allow_any_operation(array[
    'storage.object.delete',
    'storage.object.delete_many'
  ])
);
