# WCV-C3R-A2 migration-history reconciliation validation

- Date: 2026-08-21 KST
- Candidate base: `54afffcc539981ded65591f1f027171343bfce40`
- Candidate base tree: `3c48da6fe991d8c02e3991e0a571b3b12139932c`
- Branch: `codex/wcv-c3r-a2-semantic-final-state-clean-replan`
- Scope: source-only authority; zero migration/runtime/remote mutation

## Read-only start gate

| Evidence | Result |
|---|---|
| Default branch | `main` |
| Refreshed main | expected SHA/tree exact |
| PR #785 | merged, unreverted, reviewed head/tree and squash exact |
| PR #786 | merged, unreverted, reviewed head/tree and squash exact |
| PR #790 | closed unmerged; terminal head/tree `12c5e6e6f92275db2d5429b3e8c1c3fd2648f72a` / `5544277009b94738e542257644e49ccac1073b56` preserved read-only |
| A0 immutable blobs/SHA-256 | decision, manifest, analyzer, focused test exact |
| A1 immutable blobs/SHA-256 | decision, contract, validation, focused test exact |
| Package/lock blobs | `33a8d29b52ac225c6e957c71fce1f28f2eaba16d` / `70f85fb69c39aa73cf572082c4d38eb426c0b398`, unchanged |
| Migration baseline | exact 25 files |
| A0 analyzer | 25 migrations; 6 extension statements; `pgcrypto`, `vector`; 28 external-function uses |
| Open C3R-A2/P/T/L PR | none |
| Remote C3R branches | historical/closed donor branches remain read-only; no new successor branch or overlapping active writer existed |
| Governed issues | #706/#707/#708/#714/#781 open |
| Active ruleset | squash-only, strict exact-base checks, review-thread resolution |
| Required contexts | `pr-contract`, `risk-classifier`, `runtime-gate`, `fast-ci`, `full-ci`, `full-ci-windows`, `Learner Loop Health`, `security-audit-sbom`, `Vercel` |

No later A2-equivalent authority or overlapping C3R writer was found. The
historical `42P19` recursion source and actual `42883` concept-boundary lexical
cause were independently confirmed. No branch, source, PR or remote mutation
was produced by the failed C3R-P start.

## Live read-only remote receipt

The bounded refresh used the Supabase connector only for the logical project
`inverge-beta`. Project discovery, project metadata, migration listing,
extension listing, and SELECT-only catalog queries were used. No environment
or secret value was inspected. No DDL, DML, temp object, pull, push, repair or
reset was executed.

| Receipt | Exact value |
|---|---|
| Provenance | `LIVE_READ_ONLY` |
| Project fingerprint | `5a58c1e637d9cacb4bc8a71c377a57c4c7863ef9e87a6dfc3597bc83e56770d4` |
| Ledger observed | `2026-08-21T07:17:37.805066Z` |
| Ledger count | 15 |
| Ledger digest | `45bcc29f8a21eb53e153e6d106250883ae843daa1057869390fd92cabc2a35c4` |
| Relation observed | `2026-08-21T07:18:07.719574Z` |
| Relation result | 49 targeted / 39 present / 10 absent |
| Relation digest | `4cc6bf679d983c68990fd2012b71b337dc39b82f1a2565157cd9a15a3dd69234` |
| Function observed | `2026-08-21T07:18:26.733723Z` |
| Function result | 14 targeted / 6 present / 8 absent |
| Function digest | `37eae9e3aa0119f523cef5ad755d801b531136afb79e004a0e3f9ea6eaff9a29` |
| Extensions observed | `2026-08-21T07:18:36.763633Z` |
| Extensions | `pgcrypto/extensions/1.3`, `vector/public/0.8.0` |
| Extension digest | `4e4fbcb0d5b1dbeb52aacdde0c000355377903161ef38ad7d26cdaabfa53b0e6` |
| Composite schema digest | `cbe27ce7e921f310e6ec7d0f243060cc919e2bfd8bc8299cacac43d88f15aabd` |
| Mutation / private bodies / secrets | `0 / 0 / 0` |

Clean replan 1 independently refreshed the receipt without mutation:

| Refresh receipt | Exact value |
|---|---|
| Ledger observed | `2026-08-21T10:01:53.058414Z` |
| Presence observed | `2026-08-21T10:04:57.620234Z` |
| Material security/RPC observed | `2026-08-21T10:05:28.582667Z` |
| Ledger | 15 rows; digest `45bcc29f8a21eb53e153e6d106250883ae843daa1057869390fd92cabc2a35c4` |
| Relations | 49 targeted / 39 present / 10 absent / zero mismatch |
| Functions | 14 targeted / 6 present / 8 absent / zero mismatch |
| Material tables | 8 observed / zero mismatch |
| Transition RPC | definition MD5 `0aa7d76598c8167a4293a6ac097b2bfb`; ACL MD5 `5fc13192159b7c60c3a808895ae2c2c8` |
| Composite / extension digest | `cbe27ce7e921f310e6ec7d0f243060cc919e2bfd8bc8299cacac43d88f15aabd` / `4e4fbcb0d5b1dbeb52aacdde0c000355377903161ef38ad7d26cdaabfa53b0e6` |
| Mutation / private bodies / secrets | `0 / 0 / 0` |

The live receipt matches the Owner-supplied observation. The contract freezes
the exact 15 applied rows and ten absent files. Schema fingerprints establish
observation identity only; they do not promote any record to
`SCHEMA_MATCH_VERIFIED`.

## Two-axis classification

- Ledger: 15 `LEDGER_APPLIED`; ten `LEDGER_ABSENT`; zero `UNKNOWN`.
- Schema: 20 `SCHEMA_PRESENT_UNVERIFIED`; five `SCHEMA_ABSENT`; zero
  `SCHEMA_MATCH_VERIFIED`, `SCHEMA_PARTIAL` or `SCHEMA_UNASSESSED`.
- Every one of the 25 records binds its A0 filename/version/digest, both remote
  axes, fresh-history fields, exact source and filename treatments, canonical
  order, continuity treatment, Owner gate, forward/rollback strategy and
  evidence references.

The exact repair plan is:

- repair and rename `20260608` only at the C3R-P checkpoint;
- rename the five ledger-absent legal files into the exact unique producer →
  identity → retrieval → guard → grant order;
- preserve both applied concept-graph versions, make the early boundary a
  compatibility-safe step, keep atomic transition as producer, and reassert
  the final boundary in the sole C3R-P append;
- preserve S233A/C2R sources and versions while remote continuity stays
  blocked; and
- combine boundary finalization and durable-learning schema/RPC/RLS in one
  later C3R-P migration greater than `20260817170000`.

## Historical A0 coverage transition

The A0 focused test blob remains exact and appears once in the explicit
`HISTORICAL_ONLY_TESTS` runner registry. It is excluded from active default
current-inventory execution because its exact-25 live-directory assertion
cannot represent authorized future receipts. The A2 suite contains an exact
name map for all 37 A0 tests and replays the frozen dependency/identifier/
extension/external-function closure on the unchanged baseline.

## Clean-replan root proofs

`PersonalLearningMigrationSemanticInventoryV1` is generated from the exact
baseline SQL and digest-bound. It closes the extension; exact function
identity, signature, return/language/volatility and recursive key-traversal
behavior; exact forbidden-key family; exact 20-column table; all constraints,
indexes, authenticated CRUD grant, four owner-bound policies and historical
enabled/non-forced RLS state. The future repair is compared in both directions.
Only the authorized filename, exact single-recursive-term implementation and
separately declared FORCE-RLS/privilege hardening may differ. Hostile tests
cover erased and shallow repairs, column/constraint/index/policy/grant drift,
regex and traversal drift, function drift and receipt-digest rebinding.

`MigrationFinalSecurityStateV1` walks the exact repaired/append sequence in
canonical statement order and records migration, filename/version, statement,
source span, exact object, operation and before/after state. It computes final
ENABLE/DISABLE/FORCE/NO-FORCE RLS, CREATE/ALTER/DROP policy, default and
explicit table privilege, and exact table/function GRANT/REVOKE state.
Protected tables finish enabled and forced with only authenticated safe state;
protected functions finish with exactly authenticated EXECUTE. Later
weakening, later broad grants, quoted-case substitution, policy removal,
comments/strings/inert dollar bodies and unsupported dynamic DDL fail closed.
Direct grants or revokes on all tables, functions or routines also fail closed
for quoted and multi-schema forms rather than relying on a literal first
`public` schema match.

### Independent PostgreSQL semantic/security hostile audit

The clean-replan implementation was reviewed separately from its receipt
construction. The audit traced the immutable A0 tokenizer through statement
splitting, quoted-identifier normalization, recursive-function/body parsing,
baseline inventory projection, bidirectional comparison, canonical sequence
construction, inherited default table privileges and explicit final-state
validation. It then replayed hostile cases for erased semantics, digest
rebinding, later RLS weakening, policy removal, unsafe/broad grants, inherited
`service_role`, role-scoped defaults, fragment-assembled dynamic SQL and
commented policy roles, quoted and multi-schema broad table/function grants,
and `ALL ROUTINES` grants. The post-correction-2 re-audit result is PASS.

### Independent authority/continuity hostile audit

The authority audit rechecked live main, PR #785/#786 receipts, immutable A0/
A1 artifact blobs, PR #790 terminal head/tree/review and all remote C3R branch
names without consuming any branch as authority. It also rechecked the open
governed issues, active ruleset, required native check names, 12-path ownership
boundary, package/lock identity and zero diff under migrations/runtime/package/
workflow paths. Result: PASS; historical/closed donor branches remain
read-only, there is no overlapping active C3R writer, and no actionable
P0/P1/P2 finding remains.

## Local validation

| Validation | Result |
|---|---|
| Focused A2 hostile suite | PASS, 83/83 after clean-replan source correction 2 |
| A0 historical direct regression | PASS in exact A0+A1+A2 run, 136/136 total |
| A1 serial-program regression | PASS in exact A0+A1+A2 run, 136/136 total |
| Affected authority/mirror suites | PASS, 221/221 |
| PR-contract validation | PASS against the exact planned Draft PR body and pinned A2 scope |
| Full default Node suite | PASS, 1,541/1,541 |
| Typecheck | PASS |
| Lint | PASS, zero errors; 11 existing warnings in untouched files |
| Production build | PASS; one existing Turbopack trace warning from untouched runtime code |
| `git diff --check` | PASS |
| Package/lock unchanged | PASS, exact start-gate blobs |
| Forbidden paths unchanged | PASS, migrations/runtime/package/lock/A0/A1 immutable artifacts have zero diff |
| A0 byte identity | PASS, exact git blobs and SHA-256 values |
| Deterministic receipt replay | PASS in focused suite |

## Exact-head review correction ledger

PR #790 terminal review cycle 3 was anchored to head
`12c5e6e6f92275db2d5429b3e8c1c3fd2648f72a` by formal review
`4991671874`. It reported exactly two actionable P1 roots and no P0/P2:

- comment `3828953460`: a one-recursive-reference repair plus a rebound digest
  did not prove preservation of the full personal-learning migration; and
- comment `3828953466`: presence-only RLS/policy/privilege evidence did not
  compute the effective final ordered security state.

The clean replan imports no #790 commit or ancestry. It reconstructs the
reviewed-safe package path-by-path from refreshed main and closes both roots
with the two independent authorities described above. Historical #790 threads
remain untouched.

PR #791 clean-replan review cycle 1 was anchored to initial head
`b7334d2701972bcb0716f1d3f08e98701efec2f3` by formal review
`4992562825`. It reported two actionable P1 findings and one actionable P2:

- comment `3829644713`: default privileges for another creator role were
  incorrectly collapsed into the current executor's state;
- comment `3829644720`: fragment-assembled dynamic security DDL could evade a
  literal fully qualified protected-object check; and
- comment `3829644731`: a commented policy `TO authenticated` clause could be
  parsed as executable and hide PostgreSQL's default `PUBLIC` role.

Clean-replan source correction 1 fails closed on every `ALTER DEFAULT
PRIVILEGES FOR ROLE/USER` form rather than merging role namespaces. It rejects
all dynamic security DDL in mutable repair/append migrations even without a
resolved target, also rejecting protected unqualified identifiers and dynamic
default-privilege changes outside that boundary. Exact immutable A0 dynamic
statements remain ignorable only behind the already validated exact source
binding and an absence of protected identifiers/default-privilege mutation.
CREATE/ALTER POLICY roles are now derived from executable masked SQL. Dedicated
hostile tests reproduce all three findings.

PR #791 clean-replan review cycle 2 was anchored to correction head
`cf59cdc2e8047e806c2c1db9b338b6966bdf14e4` by formal review
`4992726260`. Comment `3829776827` reported one actionable P1: quoted-public,
multi-schema and `ALL ROUTINES` broad privilege forms could bypass the narrow
literal-public matcher. Clean-replan source correction 2 rejects every direct
`GRANT` or `REVOKE` on all tables, functions or routines before per-object
state derivation. Dedicated hostile rows cover quoted `public`, a non-first
`public` schema, `ALL ROUTINES` and multi-schema function revocation.

PR #790 donor review cycle 1 was anchored to head
`d759f03b2e44cde3639c8acba9c0fb35712a719f` by formal review
`4991176384`. It reported three actionable P1 findings and no P0/P2:

- repaired/appended checkpoint SQL did not run the A0 dependency closure;
- empty migration-path and schema/RPC/RLS inventories were accepted; and
- replay receipts were not bound to exact head/tree/inventory/closure/result
  evidence.

Source correction 1 makes all three fail closed. The actual repaired/appended
inventory now runs the immutable A0 analyzer's dependency derivation, exact
non-empty path and SQL-derived object inventories are digest-bound, and both
canonical replay receipts bind exact head/tree/inventory/closure plus output,
schema, environment, timestamp and zero-mutation evidence. Comment-only
boundary changes, copied replay evidence and empty inventories have explicit
hostile regressions.

PR #790 donor review cycle 2 was anchored to head
`8443a45b5f0e7d7f8b8dc3cbcb520a972c1cb0dc` by formal review
`4991476697`. It reported two actionable P1 findings and one actionable P2:

- ordinary RLS enablement could satisfy the required forced-RLS boundary;
- any RPC execute privilege could substitute for the exact concept RPC
  boundary and safe grantees; and
- `purposeExactly` was omitted from the closed required-field inventory.

Source correction 2 distinguishes and requires the separate PostgreSQL
`ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` operations for
every newly produced table. It derives complete function signature,
operation and grantee evidence and requires the exact transition RPC revokes
from `public`/`anon` plus the grant only to `authenticated`. The immutable
required-field schema now includes `purposeExactly`. All three findings have
dedicated hostile regressions; the SQL evidence derivation also excludes
comments, strings and dollar-quoted bodies so inert text cannot satisfy the
boundary.

## Boundaries

- Migration-file mutation: zero.
- Runtime/API/UI/RLS/Storage mutation: zero.
- Remote migration-history/schema mutation: zero.
- Production/payment/provider/learner activation: zero.
- C3R-P/T/L runtime started: zero.
- Governed issue closure: zero.

The candidate is not runtime evidence and grants no remote apply authority.
