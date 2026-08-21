# WCV-C3R-A2E execution-principal and role-closure validation

Status: repository-native validation contract
Authority: C3R-A2E
Database semantics: PostgreSQL 15.8 (`postgres:15.8-bookworm`)

## Evidence boundary

All executable evidence is produced by GitHub-native checks on the exact Draft PR head. No local shell, local checkout, local PostgreSQL, local Docker, linked Supabase state, or remote database mutation is evidence for this authority.

The connector cannot read the repository ruleset or full effective branch-protection endpoints. The exact classification is `CONNECTOR_RULESET_UNOBSERVABLE`; this document does not claim that the live ruleset was revalidated. Ready and merge remain unauthorized without a trusted live ruleset receipt or a separate exact-head Owner fallback authorization.

## Focused suites

The focused authority suite is:

`tests/wcv-c3r-a2e-execution-principal-role-closure-authority.test.mjs`

The analyzer under test is:

`scripts/automation/wcv-c3r-a2e-execution-principal-role-closure.mjs`

The full Node runner includes the focused suite and the immutable A0/A1 regressions. The exact-head PR body must bind each row below to the workflow/check/run that executed it.

| Required proof | Deterministic executable evidence |
|---|---|
| PostgreSQL profile | PostgreSQL 15.8 profile, major-range mismatch, PG16 membership options, and large-object default ACL fail-closed tests |
| Role identity | quoted/unquoted identity, escaped quote, comments/strings, source-span tests |
| Membership closure | grant/revoke, independent INHERIT/SET, two/three-hop chains, NOINHERIT stop, dynamic mutation, PUBLIC/unknown role tests |
| Creator state/default ACL | FOR ROLE, SET/RESET/NONE, before/after object creators, non-inherited defaults, global/schema additive tests |
| Privilege/policy/RLS closure | authenticated-only table/function, policy role membership, owner/superuser/BYPASSRLS, FORCE RLS tests |
| Receipt replay | role-graph and principal-chain rebinding tests; terminal donor substitution tests |
| Baseline inventory | all 25 migrations, 301 role-sensitive statements, exact statement/source spans, digest `a57860d45dc7650fb7bcd4ac2a1da4a55ec097a54fb085bad54752393404f7af` |
| Immutable upstream | A0/A1 exact Git blob checks plus their native regression suites |
| Mirrors/delivery | authority mirror state, path reasons, forbidden paths, package/lock Git blobs, exact A2E PR-contract tests |
| Non-mutation | zero remote/database/Production/payment/provider/learner counts and successor-unstarted assertions |

## Mandatory hostile coverage

1. `GRANT authenticated TO anon` produces both inheritance and SET reachability and fails the protected-principal gate.
2. INHERIT and SET paths are independently projected.
3. An inherit-disabled, SET-capable synthetic edge remains unsafe.
4. An edge with neither projection fabricates neither privileges nor assumability.
5. Two-hop and three-hop traversal honors the exact role-level INHERIT stop and SET transitivity.
6. A later exact REVOKE removes the edge.
7. Comments and strings create no edge.
8. Dynamic membership SQL fails closed.
9. Quoted case-different identities remain distinct.
10. `ALTER DEFAULT PRIVILEGES FOR ROLE other_creator` mutates only that creator.
11. `SET ROLE other_creator` selects that creator namespace.
12. `RESET ROLE` and `SET ROLE NONE` restore the known initial/session principal.
13. Objects created before and after restoration retain different creator/default evidence.
14. Membership roles' defaults are not inherited.
15. Global and per-schema defaults remain separate.
16. A schema revoke cannot erase a global grant.
17. Policy `TO authenticated` applies through exact membership closure.
18. `anon` cannot inherit or assume authenticated-only table/function access.
19. Owner, superuser, and BYPASSRLS paths fail the protected final gate.
20. FORCE RLS suppresses owner-only bypass without erasing owner evidence.
21. SET LOCAL ROLE and session-authorization changes fail closed.
22. Unknown server semantics fail closed.
23. Role and principal transitions carry exact ordinals and spans.
24. Digest rebinding cannot hide graph/current-principal replay mismatches.
25. PR #790/#791 receipts cannot substitute for merged-main A2E.
26. C3R-A2 remains blocked/unstarted and C3R-P remains blocked/unstarted.
27. Remote, Production, payment, provider, and learner mutation remains zero.

## Exact-head formal-review regressions

Review `4995458963` is reproduced by focused hostile cases for all five actionable threads:

| Thread | Required regression |
| --- | --- |
| `PRRT_kwDOSMHn8M6bOace` | Both named and name-omitted `CREATE SCHEMA ... AUTHORIZATION ...` fail closed; ordinary quoted schema creation retains the current creator/owner. |
| `PRRT_kwDOSMHn8M6bOacj` | `ALTER POLICY ... TO unknown_role` emits `UNKNOWN_ROLE_IDENTITY` and cannot be accepted. |
| `PRRT_kwDOSMHn8M6bOacm` | A tampered closure with a recomputed self-digest fails the independently pinned expected receipt digest. |
| `PRRT_kwDOSMHn8M6bOacn` | PR, base SHA/tree, head, reviewed/resulting tree, squash/resulting SHA, formal-review ID, and formal-review head mismatches are rejected. |
| `PRRT_kwDOSMHn8M6bOacr` | A repeated plain membership grant preserves existing ADMIN OPTION until an exact admin-option revoke. |

Additional correction-boundary tests reject narrowed protected-principal and forbidden-transition inputs, unknown initial grantors, initial cycles, overlength identifiers, dynamic DO/EXECUTE/PREPARE/CALL principal changes, invalid default schemas, and protected paths to owners, superusers, or BYPASSRLS roles. Direct/default ACL evidence remains separate from implicit owner capabilities.

## Exact-head gate

All of these exact current-head checks must be terminal-success before any later Ready consideration:

- PR Contract
- Risk Gate
- Runtime Gate
- Fast CI
- Full CI
- Learner Loop Health
- Vercel

Missing, stale, pending, cancelled, skipped where success is required, neutral, timed-out, or failing evidence is a hard stop.

The PR body must additionally record focused/full Node, typecheck, lint, build, diff/whitespace, package/lock, forbidden-path, deterministic replay, A0/A1 regression, independent hostile-audit, review, thread, base/head/tree, mergeability, and no-drift evidence. Under the current fallback, successful checks do not authorize Ready or merge.
