---
document_title: "Owner Decision — C3R-A0 Independent PostgreSQL Migration-Dependency Authority"
status: "owner-decision/approved-candidate-source-contract-only"
decision_id: "owner_wcv_c3r_a0_migration_dependency_authority_2026_08_21"
dated: "2026-08-21 KST"
repository: "chachathecat/inverge"
recovery_tracker_issue: 781
authority_stage: "C3R-A0"
repository_authority_effective_on: "expected-head-pinned squash merge and validated GitHub receipt"
runtime_authorization: "none"
remote_database_authorization: "none"
production_authorization: "none"
payment_authorization: "none"
learner_activation_authorization: "none"
automatic_successor_start: false
---

# Owner Decision — C3R-A0 Independent PostgreSQL Migration-Dependency Authority

## Decision

PR #784 exhausted the second and terminal full clean-replan budget and closed
unmerged at head `8095dc15d4ad2814fcb79196c29768e7848895aa`, tree
`7868f68cebaa7a0ea66f66168efb447db0ee0bf7`, after corrections `2/2`,
formal reviews `3/3`, and final actionable P0/P1/P2 `0/0/1`. Its terminal
finding was semantic-identity-wide index-target suppression: SQL equivalent to
`DROP INDEX public.same_name; SELECT public.same_name();` could hide the
same-named function dependency.

No third full-sized WCV-C3R replacement is authorized. The mandatory
structural reduction is:

```text
C3R-A0 — independently complete PostgreSQL migration-dependency authority
→ C3R-A1 — independently complete serial program authority
```

This decision owns C3R-A0 only. C3R-A1 becomes dependency-ready but remains
unstarted after a validated C3R-A0 merge. C3R-P remains proposed, unstarted,
and not repository-authorized; C3R-T and C3R-L remain blocked. This decision
does not install the WCV-C3 learner-stage selector or change
`roadmap/active-program.yml` or either unified-program mirror.

## Reconciled start gate

The candidate starts from live `main`
`ffdd3dcc2398dd27b991eee0be34f832da0a65b5`, tree
`178e8d2e80236030805441344064f30af68b0a94`. PRs #770, #780, #782,
#783 and #784 are closed, unmerged and read-only. Issues #706, #707, #708,
#714 and #781 remain open. The 25 live migration filenames are the only SQL
records in C3R-A0; no donor-only or invented migration is evidence.

The package identities at the gate are Git blobs
`33a8d29b52ac225c6e957c71fce1f28f2eaba16d` for `package.json` and
`70f85fb69c39aa73cf572082c4d38eb426c0b398` for `package-lock.json`.
Neither file may change.

## Closed occurrence authority

`SqlIdentifierOccurrenceV1` is the only exclusion and classification identity:

```text
statement ordinal
+ exact token start/end
+ closed syntactic role
+ closed database-object kind
+ independently normalized identifier components
```

Roles are `index_target`, `relation_reference`, `function_call`,
`function_definition`, `type_reference`, `extension_name`,
`schema_reference`, `column_reference` and `other_closed_role`. Object kinds
are `index`, `relation`, `function`, `type`, `extension`, `schema`, `column`
and `unknown`.

An index target may be excluded from generic dependency inference only for its
exact statement/span/role/kind occurrence. A canonical semantic name, a target
list, or another occurrence with the same spelling is never exclusion
authority. Multiple targets are separately enumerated. A relation or function
with the same qualified name remains visible, whether it occurs later, earlier,
in another statement, or elsewhere in the same statement.

Unquoted ASCII identifiers fold to lowercase. Quoted components decode doubled
quotes, preserve exact case, and keep dots atomic. Components normalize
independently. Comments, ordinary and escape strings, and non-executable text
create no dependency. Only grammar-established SQL/PLpgSQL dollar bodies are
executable for this bounded analyzer. Unsupported identifier forms and
unregistered or ambiguous dependencies fail closed.

## MigrationHistoryCompatibilityManifestV1

`config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json` binds the
exact 25-file live-main set and, for every record:

- current and canonical proposed version tokens;
- canonical UTF-8/LF SQL digest;
- produced, consumed, modified and dropped objects;
- a deterministic exact occurrence-evidence commitment plus every exclusion
  occurrence in full;
- created and required extensions and exact schema/producer evidence;
- external functions, including SQL-derived `auth.uid`;
- exact producer/consumer predecessors and fresh-history order;
- remote application classification, filename mutation eligibility, Owner
  gate requirement and forward/rollback strategy.

The analyzer derives and compares the manifest in both directions. Missing,
extra or duplicate filenames; duplicate canonical versions; consumer-before-
producer order; wrong object kind, schema or producer; missing extensions or
external functions; unknown qualified references; and altered occurrence
evidence fail closed. `pgcrypto` and `vector` are the canonical extension
identities; `pgvector` is prohibited as an alias. Unqualified `digest` maps to
`pgcrypto` and is not double-counted as `extensions.digest`.

`UNKNOWN` and `KNOWN_APPLIED` forbid silent filename mutation or history
repair and require a separate Owner gate. The canonical proposal is planning
authority, not mutation authority. C3R-A0 authorizes no `migration repair`,
`db push`, linked reset, remote SQL, remote schema mutation or migration file
change.

## Donor and scope boundary

PRs #770/#780/#782/#783/#784, their branches, commits, reviews, threads,
checks and runtime artifacts remain historical metadata only. They are not
reopened, pushed, cherry-picked, thread-resolved or promoted as current
evidence. The C3R-A0 package independently proves every preserved finding from
the refreshed base.

The exact owned paths are:

1. `AGENTS.md`
2. `docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md`
3. `config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json`
4. `scripts/automation/wcv-c3r-a0-migration-dependency-closure.mjs`
5. `scripts/automation/validate-pr-contract.mjs`
6. `tests/wcv-c3r-a0-migration-dependency-authority.test.mjs`
7. `scripts/run-node-tests.mjs`

No application, component, learner runtime, migration, workflow, package,
lockfile or remote system is owned.

The live PR Contract normally requires one issue-closing reference, which
would contradict the required open Tracker #781 state. Its validator therefore
contains one A0-only reference exception pinned byte-for-byte to this
repository, base SHA, head repository/branch and PR title. It requires exactly
`Refs #781`, exactly
`- Tracker disposition: remains open; closure authority: C3R-L`, and zero
GitHub closing-keyword reference from the complete keyword family. A fork,
another title or branch, another base, a missing line, or any closing reference
uses the normal fail-closed rule.

## Delivery and post-merge state

The candidate uses one fresh branch, an ordinary non-force push and one Draft
PR with `Refs #781` and no closing keyword. Auto-merge remains off. It receives
at most two source corrections and three exact-head reviews. Merge requires
all live ruleset-required checks on the current head and base, no unresolved
actionable new-PR thread, a fresh exact-head Codex review at actionable
P0/P1/P2 `0/0/0`, clean mergeability, and a squash merge pinned to that exact
reviewed head.

After a validated merge: C3R-A0 is installed; C3R-A1 is
`dependency_ready_unstarted`; C3R-P is
`proposed_unstarted/not_repository_authorized`; C3R-T and C3R-L are blocked;
WCV-C3 is incomplete; #706/#707/#708/#714/#781 remain open; remote Supabase,
Production, payment and learner activation remain zero; successor started is
zero.

If C3R-A0 exhausts either budget with a mandatory finding, it closes unmerged,
remains read-only, starts no successor, weakens no closure rule, and stops for
an Owner decision on whether a pinned and license-reviewed PostgreSQL parser
dependency is required.
