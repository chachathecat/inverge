# WCV-C3R-A2 migration-history reconciliation validation

- Date: 2026-08-21 KST
- Candidate base: `54afffcc539981ded65591f1f027171343bfce40`
- Candidate base tree: `3c48da6fe991d8c02e3991e0a571b3b12139932c`
- Branch: `codex/wcv-c3r-a2-migration-history-reconciliation`
- Scope: source-only authority; zero migration/runtime/remote mutation

## Read-only start gate

| Evidence | Result |
|---|---|
| Default branch | `main` |
| Refreshed main | expected SHA/tree exact |
| PR #785 | merged, unreverted, reviewed head/tree and squash exact |
| PR #786 | merged, unreverted, reviewed head/tree and squash exact |
| A0 immutable blobs/SHA-256 | decision, manifest, analyzer, focused test exact |
| A1 immutable blobs/SHA-256 | decision, contract, validation, focused test exact |
| Package/lock blobs | `33a8d29b52ac225c6e957c71fce1f28f2eaba16d` / `70f85fb69c39aa73cf572082c4d38eb426c0b398`, unchanged |
| Migration baseline | exact 25 files |
| A0 analyzer | 25 migrations; 6 extension statements; `pgcrypto`, `vector`; 28 external-function uses |
| Open C3R-A2/P/T/L PR | none |
| Remote C3R-A2/P/T/L branch | none |
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

## Local validation

| Validation | Result |
|---|---|
| Focused A2 hostile suite | PASS, 51/51 |
| A0 historical direct regression | PASS in exact A0+A1+A2 run, 104/104 total |
| A1 serial-program regression | PASS in exact A0+A1+A2 run, 104/104 total |
| Affected authority/mirror suites | PASS, 173/173 |
| PR-contract validation | PASS against the exact planned Draft PR body and pinned A2 scope |
| Full default Node suite | PASS, 1,509/1,509 |
| Typecheck | PASS |
| Lint | PASS, zero errors; 11 existing warnings in untouched files |
| Production build | PASS; one existing Turbopack trace warning from untouched runtime code |
| `git diff --check` | PASS |
| Package/lock unchanged | PASS, exact start-gate blobs |
| Forbidden paths unchanged | PASS, migrations/runtime/package/lock/A0/A1 immutable artifacts have zero diff |
| A0 byte identity | PASS, exact git blobs and SHA-256 values |
| Deterministic receipt replay | PASS in focused suite |

## Boundaries

- Migration-file mutation: zero.
- Runtime/API/UI/RLS/Storage mutation: zero.
- Remote migration-history/schema mutation: zero.
- Production/payment/provider/learner activation: zero.
- C3R-P/T/L runtime started: zero.
- Governed issue closure: zero.

The candidate is not runtime evidence and grants no remote apply authority.
