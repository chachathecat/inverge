# Owner decision — WCV-C3R-A2E execution-principal and role-closure authority

Date: 2026-08-21
Status: source-authority candidate; installed only by a validated merged-main receipt
Repository: `chachathecat/inverge`

## Decision

C3R-A2E is the smallest independently complete structural reduction of the C3R-A2 blocker. It owns PostgreSQL execution-principal identity, statement-ordered role membership, separate privilege-inheritance and `SET ROLE` reachability, creator-scoped default privileges, object creator/owner evidence, and effective privilege/policy/RLS closure.

C3R-A2E does not install the remaining C3R-A2 reconciliation authority and does not start C3R-P, C3R-T, or C3R-L. The remaining full A2 clean replan is preserved until a validated C3R-A2E merged-main receipt exists.

## Upstream receipts and terminal donors

C3R-A0 remains the immutable migration-dependency baseline installed by PR #785. Its reviewed head/tree are `f7f959368525f8a5895026f1361f6e13fd6226e0` / `543f8dfb5fdd026c1361e1a502376945912e6c5c`; its squash/resulting main is `3a7047cf4c7fc68247137bafbca2434abdadbc7f`.

C3R-A1 remains the immutable serial-program authority installed by PR #786. Its reviewed head/tree are `ff9dfbebea182d647daa84a349fcc50610f0ed1b` / `3c48da6fe991d8c02e3991e0a571b3b12139932c`; its squash/resulting main is `54afffcc539981ded65591f1f027171343bfce40`. Its historical selector records `C3R-P → C3R-T → C3R-L`; this decision adds the later effective dependency gate that prevents C3R-P from starting before validated A2E and A2 receipts.

PR #790 and PR #791 remain closed, unmerged, and read-only. Their commits, trees, branches, threads, and ancestry are not reused. They are terminal evidence only and can never substitute for an A2E merged-main receipt.

PR #791 exhausted its bounded correction and review budgets at head/tree `bb02eaebaf1dce580c9d68a18b9fbaacfdf6d6d5` / `3f919df372ce0d82c595f3f59e751ca6e6674d3a`. Final review 4992901306 left exactly two P1 roots:

- thread `PRRT_kwDOSMHn8M6bI_dm`, comment 3829907873: `GRANT authenticated TO anon` was not included in effective privilege reachability;
- thread `PRRT_kwDOSMHn8M6bI_dx`, comment 3829907886: `SET ROLE other_creator; ALTER DEFAULT PRIVILEGES ...; RESET ROLE` was folded into a global creator-independent map.

These findings share one separable root: PostgreSQL execution-principal and role-closure semantics.

## Version-bound PostgreSQL semantics

The repository-native database evidence image is `postgres:15.8-bookworm`; therefore this authority is closed over PostgreSQL major 15 with `server_version_num >= 150008 && < 160000`. Unknown or mismatched versions fail closed.

Authoritative PostgreSQL 15 references:

- https://www.postgresql.org/docs/15/sql-grant.html
- https://www.postgresql.org/docs/15/sql-revoke.html
- https://www.postgresql.org/docs/15/role-membership.html
- https://www.postgresql.org/docs/15/role-attributes.html
- https://www.postgresql.org/docs/15/sql-set-role.html
- https://www.postgresql.org/docs/15/sql-alterdefaultprivileges.html
- https://www.postgresql.org/docs/15/ddl-rowsecurity.html

PostgreSQL 15 supports role membership with optional `WITH ADMIN OPTION`. Per-edge `WITH INHERIT` and `WITH SET` options belong to later server semantics and fail closed here. In this profile, `INHERIT` is a role attribute: privilege inheritance stops at a `NOINHERIT` member role, while the connection-time session user may `SET ROLE` to any direct or indirect membership role. Special role attributes such as `SUPERUSER`, `BYPASSRLS`, and `CREATEROLE` are not inherited as ordinary object privileges; they are effective when that exact role is current.

Supported principal changes are identifier forms of `SET ROLE`, `SET SESSION ROLE`, `SET ROLE NONE`, and `RESET ROLE`. String/dynamic targets, `SET LOCAL ROLE`, session authorization changes, and executable role DDL fail closed. The bounded input assumes no non-default connection-time role setting; otherwise `RESET ROLE` semantics are unknown and fail closed.

PostgreSQL 15 default privileges are supported for tables, sequences, functions/routines, types, and schemas. Large-object default ACLs are not a PostgreSQL 15 form and fail closed. Defaults are keyed by exact creator role, global/schema scope, exact schema, object class, and grantee. Per-schema grants add to global defaults; a schema-scoped revoke cannot erase a global grant. Membership never imports another creator role's defaults.

## Closed authority model

The executable analyzer emits versioned evidence equivalent to:

- `RoleIdentityV1`: decoded value, quote state, exact canonical identity, statement ordinal, and source span;
- `RoleStateV1`: LOGIN, SUPERUSER, INHERIT, BYPASSRLS, CREATEROLE, active/drop state, and provenance;
- `RoleMembershipEdgeV1`: grant/member/grantor, ADMIN/INHERIT/SET projections, grant/revoke state, order, span, profile, and provenance;
- `SessionPrincipalStateV1`: session user, current user, initial executor, transition target/restoration, before/after state, order, and span;
- `CreatorScopedDefaultPrivilegeStateV1`: exact creator/scope/schema/class/grantee/privilege/order namespace;
- `ObjectCreationPrincipalEvidenceV1`: exact object, creator, owner, schema, global and schema defaults, initial ACL, order, and span;
- `EffectivePrincipalPrivilegeClosureV1`: direct, PUBLIC, inherited, assumable, owner, superuser, BYPASSRLS, policy-role, privilege, and RLS-bypass closure.

Unquoted identities fold according to PostgreSQL identifier rules. Quoted identities preserve case and doubled quotes. Comments, strings, and dollar-quoted bodies cannot create executable role identities or membership edges.

The protected application principals are exactly `anon`, `authenticated`, and `service_role`. `migration_executor` is a separately declared trusted administrative principal and is never silently application-reachable. The final gate forbids `anon → authenticated`, `anon → service_role`, and `authenticated → service_role` through either privilege inheritance or `SET ROLE`.

## Receipt and replay authority

Every receipt binds the canonical analysis input, program source, statement-ordered membership history, final graph, principal transitions, final current principal, creator/default-ACL evidence, and effective security state. Validation replays the final membership graph and principal transition chain after verifying the digest. A recomputed digest cannot hide a final-graph or current-principal mismatch. A later merged-main receipt must additionally pin base, expected/reviewed head and tree, exact-head checks, formal review, zero actionable findings/threads, artifact digests, squash/resulting main, and zero remote mutation.

PR #790/#791 evidence is explicitly invalid as a merged-main A2E receipt.

## Source-only and activation boundary

This package modifies no migration, workflow, package file, learner runtime, application, API, UI, provider, deployment, or environment path. It performs no database operation, Supabase operation, migration repair, Production activation, payment activation, provider activation, or learner activation.

Until a validated A2E merged-main receipt exists:

- C3R-A2E: `UNINSTALLED_UNTIL_VALIDATED_MERGED_MAIN_RECEIPT`
- C3R-A2: `DEPENDENCY_BLOCKED_UNSTARTED_PENDING_VALIDATED_A2E_RECEIPT`
- C3R-P: `BLOCKED_UNSTARTED_PENDING_VALIDATED_A2_RECEIPT`
- C3R-T / C3R-L: `BLOCKED`
- WCV-C3: `INCOMPLETE`

## Delivery control

The connector proves live repository admin/push authority, exact protected main, and ordinary branch/commit/Draft-PR capability. Dedicated ruleset and effective protection endpoints are connector-allowlist blocked, so the current classification is `CONNECTOR_RULESET_UNOBSERVABLE`.

That classification authorizes a branch from exact live main, ordinary non-rewriting commits, one Draft PR, and Draft metadata updates only. It does not authorize Ready, merge, auto-merge, a bypass, or any ruleset change. A merge requires either a readable trusted ruleset receipt or separate Owner authorization pinned to the frozen reviewed exact head.

Source-correction budget: 2. Exact-head formal-review budget: 3. Auto-merge remains off.
