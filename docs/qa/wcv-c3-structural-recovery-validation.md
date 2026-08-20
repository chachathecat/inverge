# WCV-C3R structural-recovery validation authority

## Scope

This document validates only the source authority installed by Tracker #781.
It proves the serial `C3R-P → C3R-T → C3R-L` recovery contract, the closed
migration-history compatibility manifest, the future runtime-adapter gates,
and the zero-activation boundary. It does not prove runtime, database,
learner-outcome or remote-project readiness.

## Reconciled read-only baseline

| Evidence | Expected value |
|---|---|
| live `main` | `ffdd3dcc2398dd27b991eee0be34f832da0a65b5` |
| live main tree | `178e8d2e80236030805441344064f30af68b0a94` |
| PR #770 | closed / Draft / unmerged / read-only |
| PR #780 | closed / Draft / unmerged / read-only |
| #780 head / tree | `a28c1983a5264f21ed35ab48a465cd9198a46e5b` / `e589b0e55f93d70df4ef5c0d335d74e4242f91ce` |
| #780 central runtime | `32358691451` / failure / artifact `0` |
| #780 dedicated runtime | `32358691469` / failure / artifact `0` |
| PR #782 | closed / unmerged / read-only; corrections `2/2`; reviews `2/3` |
| #782 head / tree | `e3609843850ba1f2ce64c291d9b4daae964d2f65` / `20e0f9235b71c3427ee184bf7e02f22f46633ef6` |
| #782 final review | `PRR_kwDOSMHn8M8AAAABKP5z9g` / actionable `0/0/1` / comment `3821578964` |
| issues | #706, #707, #708, #714 and #781 open |
| current stage after authority merge | `C3R-P / #706 / authorized_unstarted` |
| successor runtime started | `0` |

The baseline is observational. Live GitHub remains authoritative. A material
head, tree, donor, issue, writer or ruleset conflict invalidates publication.

## Focused authority assertions

`tests/wcv-c3-structural-recovery-authority.test.mjs` proves:

1. exactly one current WCV-C3 replacement stage is selected;
2. C3R-P precedes C3R-T and C3R-T precedes C3R-L;
3. issue state cannot satisfy a stage dependency;
4. only C3R-L may complete WCV-C3 or close #706/#707/#708/#781;
5. #770, #780 and #782 remain terminal read-only donors;
6. current migration collisions remain explicit while canonical proposed
   tokens are unique, fourteen digits wide and dependency-ordered;
7. every declared dependency consumer follows its producer;
8. all six executable `CREATE EXTENSION` declarations are SQL-derived;
9. exact created and required `pgcrypto`/`vector` identities, schemas and
   producers match the manifest;
10. comments and ordinary strings cannot create false extension evidence;
11. missing, extra, wrong-schema, wrong-producer and out-of-order dependency
   mutations fail closed;
12. unqualified `digest` creates a predecessor-satisfied `pgcrypto`
   dependency without double-counting `extensions.digest`;
13. unregistered schema-qualified references fail closed even when absent
   from the declared object inventory;
14. every `exactDependencyPredecessors` value is independently derived from
   object provenance, except the two closed S236P policy-order overrides whose
   current and prior policy-operation SQL is also validated;
15. `auth.uid` and equivalent external functions remain SQL-derived and
   bidirectionally compared;
16. `UNKNOWN` and `KNOWN_APPLIED` states block silent rename;
17. remote migration mutation requires a separate Owner gate;
18. runtime-adapter path closure and both reset cycles are mandatory;
19. one merge-producing writer remains enforced;
20. Production, payment and external learner remain unauthorized;
21. V13 remains the sole active master; and
22. no successor runtime is started by this source-only Work.

## Migration-history proof boundary

The manifest covers all 25 live-main migrations and the one donor-only WCV
migration. It deliberately distinguishes:

- current filename and version truth;
- canonical proposed future order;
- direct object dependencies;
- conservative remote application state; and
- mutation authority.

The closed object inventory includes schema-qualified external tables and
functions, not only repository-produced objects. In particular, every
live-main migration call to `auth.uid`, `storage.allow_any_operation` or
`storage.allow_only_operation` must have a matching typed `consumes` entry.
The focused test derives those external function calls from each SQL file and
requires exact equality with the manifest, so an omitted dependency cannot be
hidden by checking only objects that were already declared.

`scripts/automation/wcv-c3r-migration-dependency-closure.mjs` provides the
deterministic `MigrationDependencyClosureV1` implementation. It masks nested
comments, single-quoted strings and dollar-quoted bodies before extracting
top-level extension declarations, recognizes mixed case, quoted identifiers,
multiple statements, `IF NOT EXISTS`, `SCHEMA` and `WITH SCHEMA`, and
fingerprints canonical UTF-8/LF SQL plus each exact declaration. An unknown
extension, prohibited `pgvector` alias, malformed declaration, unresolved
use, wrong schema, wrong producer or consumer-before-producer state fails
closed. Unqualified `digest` and qualified `extensions.digest` are separate
`pgcrypto` evidence buckets. References to every closed prior or external database object are also
derived from SQL and compared with the combined consumed, modified and dropped
manifest set in both directions; a removed relation dependency or an invented
edge therefore fails without relying on the declaration as its own evidence.
Unregistered qualified references fail closed. Exact dependency predecessors
are derived from object-provenance lineage; the two S236P policy replacements
are the sole closed overrides and require exact current and prior policy-
operation SQL evidence.

The live-main result is six executable declarations in five migrations:
`pgcrypto` in `20260422_inverge_service_core.sql`,
`20260605_create_personal_concept_nodes.sql`,
`20260608_create_personal_learning_states.sql`,
`20260615_legal_grounding.sql`, and
`20260623_personal_concept_graph_atomic_transition.sql`; and `vector` in
`20260615_legal_grounding.sql`. The concept-graph declaration explicitly binds
schema `extensions`; declarations without a SQL schema preserve `null` as the
exact unspecified schema rather than guessing `public` or `extensions`.

The canonical proposal does not rename a file or mutate migration history.
For an `UNKNOWN` or `KNOWN_APPLIED` record, `filenameMutationEligibleInThisWork`
must remain false and the Owner-gate requirement must remain true. Repository
notes dated before this Work do not establish current `KNOWN_UNAPPLIED` state.

No remote ledger, secret, schema or migration table is read by the focused
test. No `migration repair`, `db push`, `db reset --linked`, remote SQL or
remote schema change is part of validation.

## Runtime-adapter proof required later

C3R-P must replace source-only assertions with an exact-head closed adapter
that registers every migration-sensitive path and every stage-owned Practice
path. The evidence artifact is metadata-only and is emitted only after both
fresh isolated Supabase reset/replay cycles, the exact Practice
browser-to-Postgres path, exact-head verification and unconditional cleanup
succeed.

C3R-T and C3R-L inherit the validated baseline and may add only their exact
subject-protected paths. A missing path, stale head, absent cycle, missing
artifact, remote Supabase use or cleanup failure blocks the stage.

Embedded PostgreSQL compilation may diagnose syntax. It never substitutes for
either isolated Supabase reset/replay cycle.

## Local validation commands

Run in this order:

```text
node scripts/automation/wcv-c3r-migration-dependency-closure.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/wcv-c3-structural-recovery-authority.test.mjs
npm.cmd test -- tests/wcv-c3-structural-recovery-authority.test.mjs tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs tests/wcv-c2r-structural-recovery-authority.test.mjs tests/dabangil-unified-product-multisurface-launch-authority.test.mjs tests/github-native-delivery-control.test.mjs
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
git diff --exit-code -- package.json package-lock.json
```

Also parse the JSON and YAML authority files, run repository migration-order
and duplicate-version static assertions, and complete an independent read-only
hostile review. The final local actionable result must be P0/P1/P2 `0/0/0`.

## Publication gate

Publication uses one feature branch, one ordinary non-force push and one Draft
PR. Auto-merge stays off. Required checks must belong to the exact current
head against the latest required base. After they pass, exactly one fresh
formal exact-head Codex review must report actionable P0/P1/P2 `0/0/0`.
Every new-PR thread must be independently verified and resolved. Merge is
squash-only and pinned to the reviewed expected head.

Because #781 is a long-lived recovery tracker, the source-authority PR uses
the contract-backed `Refs #781` form plus the exact disposition line
`- Tracker disposition: remains open; closure authority: C3R-L`. The PR
Contract validator must accept that exact pair only when zero `Closes` or
other GitHub closing-keyword variants are present and the repository, base
`main` at `ffdd3dcc2398dd27b991eee0be34f832da0a65b5`, same-repository head
and PR title exactly match the source-authority tuple. The base-SHA binding
prevents a later lookalike PR from replaying the exception after `main`
advances.
Same-repository, qualified-repository, full-URL, colon and case-insensitive
closing references are all blocked. Missing or altered scope/reference/
disposition text fails closed; unrelated PRs retain the normal exactly-one-
closing-reference rule.

If the source PR exhausts two source corrections or three exact-head reviews,
close it unmerged, retain it read-only, do not start C3R-P, and report the
authority conflict.

## Expected post-merge state

- WCV-C3 remains incomplete.
- #706, #707, #708, #714 and #781 remain open.
- C3R-P is `authorized_unstarted`.
- C3R-T and C3R-L are dependency-blocked and unstarted.
- Production, remote Supabase, payment, provider and learner state are zero.
- No runtime successor is started.
