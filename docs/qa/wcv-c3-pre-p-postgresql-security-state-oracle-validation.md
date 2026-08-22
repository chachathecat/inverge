# WCV-C3 PRE-C3R-P PostgreSQL 15.8 security-state oracle validation

## Boundary

This is non-authoritative support tooling for a later, separately authorized C3R-P clean replan. It installs no canonical stage, consumes no selector, starts no runtime, and leaves WCV-C3 incomplete. The preserved authority is:

- `soleNextC3rStage = C3R-P`;
- C3R-P is `authorized_unstarted_after_validated_c3r_a1_merge_receipt`;
- C3R-T remains blocked pending a validated C3R-P merge receipt;
- C3R-L remains blocked pending validated C3R-P and C3R-T merge receipts;
- `c3rRuntimeAutomaticStartAllowed = false`;
- `c3rSuccessorRuntimeStarted = false`.

Terminal PRs #790, #791, and #792 are closed-unmerged donors only. Their historical findings are reproduced as hostile fixtures; their prose is not authority. No governed issue is closed by this Draft.

## Native Runtime Gate integration

The four oracle-owned files are exact runtime-sensitive paths in `runtime-risk-contract.mjs`. The existing Runtime Gate workflow remains byte-unchanged. Its producer selects the oracle adapter before the legacy migration-only adapters, and its verifier selects the matching closed receipt schema before the unchanged legacy v2 validator.

The adapter accepts only the exact eleven-path change set authorized for this Work. A truncated changed-file list, missing oracle-owned path, mixed runtime-sensitive change, duplicate/unknown artifact key, or any twelfth changed path fails closed.

Pull-request execution is bound to exact PR-head blobs with `git show <PR_HEAD_SHA>:<path>` and to the independently resolved `<PR_HEAD_SHA>^{tree}`. The executed oracle and native producer/gate bytes must equal their PR-head blobs even when Actions checks out a synthetic merge ref.

## Exact disposable PostgreSQL

The producer uses only:

- image `postgres@sha256:eb3747f5d0a92195ca486d2f15d9a4ee5e9461b0332fe87fbc59069490a5c659`;
- platform `linux/amd64` for pull and run;
- network mode `none`;
- one passed environment variable: `POSTGRES_HOST_AUTH_METHOD=trust`;
- one empty disposable tmpfs at `/var/lib/postgresql/data`, zero bind/volume mounts, zero learner/private-data mounts, and no published port;
- container name `inverge-runtime-<GitHub run ID>-<run attempt>`.

The registry digest, image OS, and architecture are inspected before use. After readiness, the first SQL bytes sent are `SHOW server_version_num;`; the only accepted value is `150008`. A pull, image identity, platform, start, or version mismatch fails exactly as `ORACLE_IMAGE_OR_VERSION_MISMATCH`.

The producer performs pre-cleanup, `finally` cleanup, signal cleanup, and an absence check. The workflow independently invokes cleanup with `--require-complete` in its existing `always()` step.

## Source and execution identity

Every inline fixture has a fixed ID, ordinal, login principal, exact newline-terminated UTF-8 SQL bytes, and SHA-256. The bytes hashed are the bytes sent to `psql`; no transaction or role wrapper is silently prepended. Session authority is established by connecting as the fixture's LOGIN role, not by labeling or impersonating a superuser connection.

The initial membership input contract accepts exactly:

- `grantedRole`;
- `memberRole`;
- `grantorRole`;
- `adminOption`.

`inheritOption`, `setOption`, and every other unknown field are rejected before Docker or SQL execution. PostgreSQL 15 role-level `INHERIT` supplies inheritance behavior. Direct and multi-hop `SET ROLE` reachability is proven by actual sessions.

Opaque dynamic security SQL is unsupported. The only dynamic body is the exact, digest-bound `dynamic_explicit_policy` fixture; PostgreSQL executes it and the resulting policy is proven by the catalog snapshot and a catalog probe.

## Canonical snapshots

The oracle takes a canonical snapshot before and after every ordered fixture. Snapshot bodies remain process-memory only. The receipt stores collection and root digests, never catalog rows.

Collections cover:

1. `pg_roles`: name, SUPERUSER, INHERIT, CREATEROLE, BYPASSRLS, LOGIN;
2. `pg_auth_members`: textual granted/member/grantor roles and ADMIN OPTION;
3. `pg_default_acl`: creator, global/schema scope, schema, object class, normalized entries;
4. `pg_namespace`: exact schema, owner, normalized ACL;
5. `pg_class`: exact schema/object, relkind, owner, RLS, FORCE RLS, normalized ACL;
6. `pg_proc`: schema, name, prokind, exact identity arguments, language, owner, normalized ACL;
7. `pg_type`: explicit standalone type scope, exact identity, kind, owner, normalized ACL;
8. `pg_policy`: exact schema/table/policy, permissive state, command, sorted textual roles, canonical USING and WITH CHECK expressions.

All identities and arrays use deterministic C ordering. ACLs use `aclexplode`; null object ACLs expand through `acldefault` using PostgreSQL 15 codes `n`, `r`, `s`, `f`, and `T`. PUBLIC is represented textually instead of OID 0. Routine and policy rendering runs under `search_path = pg_catalog`. Raw OIDs, timestamps, process/container IDs, random names, and secrets are excluded.

The semantic delta is computed in memory at row level. Each collection uses its stable textual catalog identity to classify added, removed, and changed rows; the metadata receipt retains only per-collection counts and digests plus their root. PostgreSQL execution and catalog output—not a parser or handwritten semantic model—determine success and state.

## Negative atomicity

Every expected SQL rejection is one exact statement. The oracle requires `psql` script-error status 3, a fixture-allowlisted five-character SQLSTATE, identical pre/post collection and root digests, and an exact empty row-level delta. Warnings or infrastructure failures cannot satisfy a rejection receipt. Every successful fixture requires status 0 and the SHA-256 of its exact closed normalized stdout bytes, including the empty-output expectation.

Membership input-shape rejections record `beforeDatabase = true` and `databaseExecutionCount = 0`.

## Hostile coverage

The closed fixture set proves:

- PostgreSQL 15 direct/multi-hop membership, role-level INHERIT/NOINHERIT, actual `SET ROLE`/`SET SESSION ROLE`/NONE/RESET, and circular-membership rejection;
- superuser, CREATEROLE, ADMIN OPTION, duplicate plain GRANT, `REVOKE ADMIN OPTION FOR`, unauthorized GRANT/REVOKE, and existing/nonexistent `GRANTED BY` behavior;
- exact `session_user`/`current_user` transitions and creator/owner state;
- global plus per-schema creator defaults, non-import across membership, and create-before/during/after role transitions;
- the equality of unquoted `foo` and quoted `"foo"`, distinction of `"Foo"`, quoted schemas/policies, and overloaded routines using `"CaseType"` and `"casetype"`;
- CREATE, ALTER OWNER, DROP, CREATE→DROP→recreate, final absence, new owner, ACL, and defaults;
- direct, inherited, PUBLIC, owner, SUPERUSER, and BYPASSRLS behavior; ENABLE/DISABLE/FORCE/NO FORCE RLS; and CREATE/ALTER/DROP POLICY state, including an intermediate ALTER snapshot and a restrictive INSERT policy with non-null WITH CHECK;
- both historical #791 regressions and all five historical #792 P1 findings.

## Closed metadata receipt

The uploaded artifact contains only identities, bounded result enums, SQLSTATEs, counts, and SHA-256 digests. It contains no SQL bytes, catalog bodies, stderr, timestamps, secrets, learner/private data, or container identifiers.

The exact nonempty digest map binds the manifest, oracle source, focused test, QA source, native producer, native gate, image digest, PR head/tree, fixture set, the complete ordered set of every pre/post snapshot root, evidence payload, run ID/attempt, server version, observed zero-network state, and zero-remote-mutation declaration. Missing, null, empty, unknown, extra, or mismatched entries fail closed.

## Validation commands

Run from the repository root:

```bash
node --test tests/wcv-c3-pre-p-postgresql-security-state-oracle.test.mjs
node --test tests/agent-factory-runtime-gate.test.mjs tests/wcv-c2r-runtime-preflight.test.mjs
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

The exact-head pull-request Runtime Gate is the required Docker execution proof. It must report server version `150008`, upload the metadata-only artifact, and finish both producer and workflow cleanup checks. No local or CI command may contact Supabase, a remote database, or Production.
