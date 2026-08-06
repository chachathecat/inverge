-- Migration: s236p_owner_private_authenticated_download_info
-- Restore authenticated JWT private downloads without reopening signed access.
--
-- This forward migration must follow exactly:
--   20260730023248_s236p_lean_owner_private.sql
--   20260730053324_s236p_owner_private_lifecycle_hardening.sql
--
-- It replaces only the S236P storage.objects SELECT policy. Ownership and
-- bucket predicates are unchanged. The additional operation is limited to
-- object.get_authenticated_info, which Storage uses while serving an
-- authenticated private-object download.

drop policy if exists "s236p owner private select" on storage.objects;

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
    'object.get_authenticated_info',
    'storage.object.delete',
    'storage.object.delete_many'
  ])
);
