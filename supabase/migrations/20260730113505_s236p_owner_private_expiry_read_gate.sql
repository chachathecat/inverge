-- Migration: s236p_owner_private_expiry_read_gate
-- Make authenticated Owner reads require active, unexpired metadata while
-- preserving metadata-independent Owner cleanup delete operations.
--
-- This forward migration must follow exactly:
--   20260730023248_s236p_lean_owner_private.sql
--   20260730053324_s236p_owner_private_lifecycle_hardening.sql
--   20260730065040_s236p_owner_private_authenticated_download_info.sql
--
-- The named predecessor policy must already exist; ALTER POLICY fails closed
-- if it is missing. Replaying this statement converges to the same policy.
-- No INSERT or DELETE policy, table, function, column, constraint, grant,
-- bucket, index, or trigger is changed.
--
-- Reviewed forward-disable procedure:
--   1. Never edit, delete, replay, revert, or directly repair any applied
--      migration or migration-ledger row.
--   2. To withdraw only object.get_authenticated_info, use a separately
--      Owner-approved future forward migration that preserves this exact
--      expiry-aware read predicate, removes only that operation from the read
--      allowlist, and preserves the metadata-independent delete/delete_many
--      branch.
--   3. For a stronger fail-closed disable, use a separately Owner-approved
--      future forward migration that removes the read branch entirely and
--      preserves only delete/delete_many.
--   4. Never restore migration 3's expiry-blind broad SELECT policy.
--   5. After either future disable, verify SDK and direct authenticated
--      downloads are denied while delete and delete_many still succeed.
--   6. This migration does not execute either disable procedure.

alter policy "s236p owner private select"
on storage.objects
to authenticated
using (
  bucket_id = 's236p-owner-private-v1'
  and owner_id = (select auth.uid()::text)
  and (
    (
      storage.allow_any_operation(array[
        'storage.object.list',
        'storage.object.list_v2',
        'storage.object.get_authenticated',
        'object.get_authenticated_info'
      ])
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
    )
    or storage.allow_any_operation(array[
      'storage.object.delete',
      'storage.object.delete_many'
    ])
  )
);
