# S236P lean Owner-private acceptance

- Evaluated at: `2026-07-30T03:15:13Z`
- Status: `blocked`
- Live base: `main@5d00cd84ec8ab44918ce47a49a0d71e9734cbea0`
- Supabase project: `inverge-beta` (`vajcduseyicjhyhrclax`)
- Real content: off
- Production: off
- S236A: not started

## Provisioned private inventory

The idempotent migration `s236p_lean_owner_private` is applied. Its first
transaction failed on an immutable generated-column requirement and created
no resources. The corrected trigger-based lifecycle migration then applied
successfully.

| Resource | Live state |
| --- | --- |
| `storage.bucket.s236p-owner-private-v1` | private; 1 MiB; `application/octet-stream` |
| `public.s236p_owner_private_objects` | RLS and FORCE RLS; four Owner CRUD policies |
| `public.s236p_owner_private_events` | RLS and FORCE RLS; four Owner CRUD policies |
| `storage.objects` S236P policies | four Owner CRUD policies |
| Anonymous table grants | 0 |
| Anonymous lifecycle/signed-URL RPC grants | 0 |

Authorization is the authenticated JWT subject via `auth.uid()`. No policy
uses email, `raw_user_meta_data`, or another user-editable identity claim.

The metadata constraints bind:

- signed URL TTL at most 300 seconds;
- private-content retention at most 365 days;
- metadata-log retention at most 7 days;
- temporary-copy TTL at most 300 seconds;
- application cache TTL exactly 0;
- export/delete SLA at most 604800 seconds;
- OCR/AI provider mode `none`;
- external OCR/AI calls, raw emissions, and real-content flags exactly zero.

## Blocked acceptance

The live user-scoped run stopped before Storage or metadata assertions with:

`temporary_principal_a_sign_in_failed`

The project requires email confirmation and has anonymous Auth disabled.
The allowed Supabase connector exposes no mail-free administrative Auth-user
creation operation. Direct Auth credential-table mutation and an external
confirmation-email signup were not permitted. No service-role value was read
or emitted.

Therefore none of the Owner A, account B, anonymous, signed-URL, retention,
or deterministic-cleanup assertions is recorded as passed. S236P is not
complete and S236A remains forbidden.

## Repository checks

- focused S236P and roadmap checks: pass;
- full node suite: 1223 passed, 0 failed;
- TypeScript: pass;
- lint: 0 errors; 9 pre-existing warnings;
- production build: pass after a temporary, uncommitted host-only fallback
  for this workspace's broken Node `process.memoryUsage()` RSS probe;
- `git diff --check`: pass.

The initial unmodified build invocation stopped before compilation because
the workspace Node runtime returned `ENOENT` from `uv_resident_set_memory`.
The fallback affected telemetry only, was removed immediately, and is not
part of the branch.

## Cleanup and advisors

After the stopped run:

- Storage objects: 0
- S236P metadata object rows: 0
- S236P metadata event rows: 0
- temporary test principals: 0
- raw canary matches in checked logs/data surfaces/CI artifacts: 0

Supabase Security Advisor reported no S236P finding and no `ERROR`-level
finding. Performance Advisor reported one S236P unused-index `INFO` notice
and no `ERROR`-level finding. Existing non-S236P advisor notices were not
changed in this Work.

The only unblock input is two temporary synthetic user-scoped sessions
created through an already approved administrative path. No new provider,
infrastructure structure, qualification system, real content, or Production
change is proposed.
