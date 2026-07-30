# S236P narrowed Owner-private acceptance

- Evaluated at: `2026-07-30T11:48:39Z`
- Status: `pre-live checkpoint pending`
- Checkpoint parent: `b972e626b0915b6017095c8220173df5e2148e68`
- Live base verified before publication: `main@5d00cd84ec8ab44918ce47a49a0d71e9734cbea0`
- Supabase project: `inverge-beta` (`vajcduseyicjhyhrclax`)
- Real content: off
- Production: off
- S236A: queued and unstarted

## Exact ordered migration quadruple

The first three repository files remain byte-for-byte matches for the live
`supabase_migrations.schema_migrations.statements` ledger. The fourth file
was created with Supabase CLI `2.95.0` and is not yet live. Local timestamps
remain the CLI-generated filenames; no migration history repair, ledger
mutation, predecessor replay, or untracked DDL is authorized.

| Order | Repository migration | Live version | Repository SHA-256 |
| --- | --- | --- | --- |
| 1 | `20260730023248_s236p_lean_owner_private.sql` | `20260730025332` | `476ef1b0d6a100fb6e4803b812b049b44252ca5f25301d3f781cee8827b1545b` |
| 2 | `20260730053324_s236p_owner_private_lifecycle_hardening.sql` | `20260730060233` | `e20440dfa0d880ad591b8c9fdff287cd66fcdbbe4f96f07a549a730fd8920de1` |
| 3 | `20260730065040_s236p_owner_private_authenticated_download_info.sql` | `20260730065744` | `632cc7ee563aa29a573425e396f6f539e35a3c8834955ba66ccd01723bb3cbcb` |
| 4 | `20260730113505_s236p_owner_private_expiry_read_gate.sql` | pending | `416fa80acea48bf4d170661a4f5259632b4d9e3fd740007bd65cbf1ded6103f1` |

Runtime evidence production and verification accept only these four paths,
in this order, with these digests. Missing, reordered, additional, or
arbitrary migrations fail closed. In isolated CI, each migration is applied
and replayed immediately before its successor so a predecessor is never
re-applied against a schema already narrowed by later forward migrations.

## Planned final policy

The current live policy remains the three-migration predecessor until the
checkpoint head passes Runtime Gate, PR Contract, Fast CI, Full CI, and
Supabase advisors. The fourth migration changes only the named
`storage.objects` SELECT policy. Its read and cleanup branches are explicitly
parenthesized:

- list/list-v2, authenticated GET, and authenticated info require matching
  Owner metadata with `object_state = 'active'`, content expiry strictly
  after `statement_timestamp()`, and temporary expiry either null or strictly
  after `statement_timestamp()`;
- `storage.object.delete` and `storage.object.delete_many` remain
  metadata-independent Owner cleanup operations;
- equality at either expiry boundary is denied.

No INSERT or DELETE policy, table, function, column, constraint, grant,
bucket, trigger, index, Edge Function, or cron surface changes.

## Unchanged resource configuration

| Surface | Accepted state |
| --- | --- |
| Storage bucket | `s236p-owner-private-v1`; private; 1 MiB; `application/octet-stream` |
| Metadata | `public.s236p_owner_private_objects`; RLS and FORCE RLS |
| Persistent S236P event log | absent; mode `none`; retention `0` |
| Signed-access RPC | absent |
| Storage UPDATE policy | absent |
| Edge Functions | `0` |
| `pg_cron` | not installed |
| OCR/AI provider | `none`; external calls `0` |
| Real content / Production | off / off |

Authorization is the authenticated JWT subject via `auth.uid()`. No policy
uses email, `raw_user_meta_data`, or another user-editable identity claim.
Originals are immutable, revisions are append-only and same-owner, and
Owner cleanup remains possible after metadata-first deletion.

The final `storage.objects` SELECT policy preserves the private bucket and
Owner predicates and permits exactly:

- `storage.object.list`
- `storage.object.list_v2`
- `storage.object.get_authenticated`
- `object.get_authenticated_info`
- `storage.object.delete`
- `storage.object.delete_many`

Signed URL and signed-upload operations, overwrite/upsert/update,
copy/move, S3/TUS operations, and `object.head_authenticated_info` remain
outside the allowlist.

## Publishable-key live acceptance required after apply

No new principal or canary has been created at this checkpoint. After the
fourth migration is applied exactly once, a fresh Owner A, Owner B, and
anonymous-client run must prove:

- Owner A metadata creation, new upload, list, `info()`, SDK `download()`,
  and direct authenticated GET succeed; downloaded bytes match in
  memory.
- Owner B and anonymous metadata, info, download, list, delete, and
  cross-Owner access are denied in both directions.
- Single `createSignedUrl(path, 1|300|301)` calls are denied.
- Bulk `createSignedUrls([path], 1|300|301)` calls are denied at item
  level: each item has a non-empty error and both `signedUrl` and raw
  `signedURL` are null.
- A top-level error, an empty array, or a malformed item is classified as
  inconclusive failure rather than a passing security denial.
- Signed upload, overwrite/upsert, move, copy, authenticated HEAD, S3, TUS,
  unknown, and missing operations are denied.
- A TTL `1` temporary object is list/info/download/direct-GET readable before
  server-recorded expiry, hidden at equality and after expiry, and still
  removable through both single and bulk cleanup while metadata remains.
- `delete_requested`, content-expired, temporary-expired, and
  metadata-missing rows are unreadable while Owner cleanup remains possible.
- Immutable originals, append-only sequential revisions, metadata-first
  recovery, and orphan-safe Storage deletion pass.
- Application cache TTL remained `0`, content retention remained at most
  `365` days, temporary TTL at most `300` seconds, and export/delete SLA at
  most `604800` seconds.
- External OCR/AI calls, raw external emissions, and real-content writes
  remain `0`.

No signed URL or full Storage response was printed, stored, or used.
Credentials, JWTs, canary values, and content bytes were not persisted to
the repository, artifacts, or PR text.

## Reviewed forward-disable procedure

Applied migration or ledger rows must never be edited, deleted, replayed,
reverted, or repaired. A future disable requires a separately Owner-approved
forward migration:

1. Targeted disable removes only `object.get_authenticated_info` from the
   expiry-aware read allowlist and preserves the cleanup branch.
2. Strong fail-closed disable removes the complete read branch and preserves
   only `storage.object.delete` and `storage.object.delete_many`.
3. Neither route may restore migration 3's expiry-blind SELECT policy.
4. After either future migration, SDK and direct authenticated reads must be
   denied while single and bulk cleanup still succeed.

The fourth migration documents but does not execute either disable route.
The isolated runtime adapter simulates both future policy shapes inside
rolled-back transactions.

## Pre-live validation

- focused S236P/runtime-gate suite: `53` passed, `0` failed;
- full node suite: `1239` passed, `0` failed;
- touched-source lint: pass;
- full lint: `0` errors; `9` pre-existing warnings;
- TypeScript: pass;
- production Turbopack build: pass (`54/54` static pages);
- JavaScript syntax and `git diff --check`: pass;
- exact migration digest assertions: pass;
- Supabase Security Advisor: S236P `0`, ERROR `0`;
- Supabase Performance Advisor: S236P `0`, ERROR `0`.

This sandbox lacks `/proc`, so unmodified Node RSS telemetry raised
`uv_resident_set_memory ENOENT` before compilation. A temporary repository-
external preload shim returned zero only for that missing-host-telemetry
error; the normal Turbopack build then completed, and the shim was deleted.
The isolated PostgreSQL/RLS matrix and all required GitHub checks remain
mandatory on the published checkpoint head before live apply.

## Current live safety state

Before the checkpoint, read-only queries confirmed the original live triple,
one named SELECT policy, no overlapping S236P SELECT policy, and
`object/metadata/event/synthetic-session/synthetic-principal = 0/0/0/0/0`.
No fourth migration, synthetic principal, canary, DDL, or GitHub mutation has
occurred yet.

The previous S236P acceptance remains the historical base while this expiry
correction is pending. S236A remains queued and unstarted; this work does not
authorize reference-package authoring, real content, Production activation,
or external-provider processing.
