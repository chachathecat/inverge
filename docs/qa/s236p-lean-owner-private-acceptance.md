# S236P narrowed Owner-private acceptance

- Evaluated at: `2026-07-30T10:42:12Z`
- Status: `accepted`
- Reconstruction parent: `66454a4b2f138e074a0cdd37a309dfb8a46f526e`
- Live base verified before publication: `main@5d00cd84ec8ab44918ce47a49a0d71e9734cbea0`
- Supabase project: `inverge-beta` (`vajcduseyicjhyhrclax`)
- Real content: off
- Production: off
- S236A: queued and unstarted

## Exact ordered migration triple

The repository files were restored byte-for-byte from the live
`supabase_migrations.schema_migrations.statements` ledger. The local
timestamps intentionally remain the CLI-generated filenames; no migration
history repair, ledger mutation, replay, fourth migration, or untracked DDL
was used.

| Order | Repository migration | Live version | SHA-256 |
| --- | --- | --- | --- |
| 1 | `20260730023248_s236p_lean_owner_private.sql` | `20260730025332` | `476ef1b0d6a100fb6e4803b812b049b44252ca5f25301d3f781cee8827b1545b` |
| 2 | `20260730053324_s236p_owner_private_lifecycle_hardening.sql` | `20260730060233` | `e20440dfa0d880ad591b8c9fdff287cd66fcdbbe4f96f07a549a730fd8920de1` |
| 3 | `20260730065040_s236p_owner_private_authenticated_download_info.sql` | `20260730065744` | `632cc7ee563aa29a573425e396f6f539e35a3c8834955ba66ccd01723bb3cbcb` |

Runtime evidence production and verification accept only these three paths,
in this order, with these digests. Missing, reordered, additional, or
arbitrary migrations fail closed. In isolated CI, each migration is applied
and replayed immediately before its successor so a predecessor is never
re-applied against a schema already narrowed by later forward migrations.

## Final live configuration

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

## Publishable-key live acceptance

Exactly two unique synthetic Auto Confirm principals, Owner A and Owner B,
plus an anonymous client were used. The 24 live assertions passed:

- Owner A metadata creation, new upload, list, `info()`, SDK `download()`,
  and direct authenticated GET succeeded; downloaded bytes matched in
  memory.
- Owner B and anonymous metadata, info, download, list, and cross-Owner
  access were denied in both directions.
- Single `createSignedUrl(path, 1|300|301)` calls were denied.
- Bulk `createSignedUrls([path], 1|300|301)` calls were denied at item
  level: each item had a non-empty error and both `signedUrl` and raw
  `signedURL` were null.
- A top-level error, an empty array, or a malformed item is classified as
  inconclusive failure rather than a passing security denial.
- Signed upload, overwrite/upsert, move, and copy were denied.
- Immutable originals, append-only sequential revisions, deterministic
  temporary expiry, metadata-first recovery, and orphan-safe Storage
  deletion passed.
- Application cache TTL remained `0`, content retention remained at most
  `365` days, temporary TTL at most `300` seconds, and export/delete SLA at
  most `604800` seconds.
- External OCR/AI calls, raw external emissions, and real-content writes
  remained `0`.

No signed URL or full Storage response was printed, stored, or used.
Credentials, JWTs, canary values, and content bytes were not persisted to
the repository, artifacts, or PR text.

## Validation

- focused S236P/runtime-gate suite: `49` passed, `0` failed;
- full node suite: `1235` passed, `0` failed;
- TypeScript: pass;
- lint: `0` errors; `9` pre-existing warnings;
- production build: pass (`54/54` static pages);
- `git diff --check`: pass.

The host initially lacked `/proc`, causing Node 24 RSS telemetry to raise
`ENOENT` before compilation. A temporary uncommitted shim handled only that
host telemetry error; the normal Turbopack build then completed, and the
shim and temporary directory were removed. It is not part of the branch.
Required PR checks and the closed Runtime Gate remain mandatory on the
corrected GitHub head before merge.

## Cleanup, canary, and advisors

The live harness cleaned Storage and metadata in `finally`; both synthetic
principals and their sessions were then hard-deleted. Post-cleanup live
queries confirmed:

- Storage objects: `0`
- S236P metadata rows: `0`
- S236P event rows/table: `0` / absent
- synthetic Auth sessions: `0`
- synthetic Auth principals: `0`

The in-memory raw canary matched `0` entries across Supabase Storage, API,
Postgres, Auth, Edge Function, and Realtime logs. A recursive workspace
scan checked `1494` source/temp files and also found `0` matches.

Supabase Security Advisor reported S236P findings `0` and ERROR findings
`0`; Performance Advisor reported S236P findings `0` and ERROR findings
`0`. Existing non-S236P INFO/WARN notices were not changed in this Work.

S236P remains accepted and complete. S236A remains queued and unstarted;
this acceptance does not authorize reference-package authoring, real
content, Production activation, or external-provider processing.
