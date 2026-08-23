---
decision_id: owner_wcv_c3_pre_p_minimal_migration_mutation_authority_2026_08_22
document_title: "Owner Decision — WCV-C3 PRE-C3R-P Minimal Exact Migration-Mutation Authority"
decision_date_kst: 2026-08-22
status: candidate_effective_only_after_expected_head_pinned_squash_merge_and_validated_github_receipt
authority_kind: source_only_control_plane_bridge
---

# Owner Decision — WCV-C3 PRE-C3R-P Minimal Exact Migration-Mutation Authority

## Decision

PRs #795 and #796 are terminal, closed and unmerged. Their branches and
read-only evidence remain donor evidence, but neither candidate is repository
authority. Their attempt to pre-validate a nonexistent append, generic
SQL/PLpgSQL value semantics and future runtime evidence was over-scoped and is
not reproduced here.

This decision installs only `C3RPMigrationMutationAuthorityV1`: the minimum
source permission needed for a later C3R-P candidate to perform seven exact
existing-path operations and create one exact append. It is not C3R-A2, A2E,
a parser, an oracle, a semantic engine, a runtime receipt or a C3R stage. It
changes no selector, migration, schema, RLS, Storage, API, application or UI,
and starts no runtime.

The reconciled protected base is SHA
`5965ddb0202c5f9effb531824d4d95f775abecc1`, tree
`bcb1017b980a5175e45265080ba25bc4b25c51ff`. The decision becomes repository
authority only after its own expected-head-pinned squash merge and validated
GitHub receipt. A later C3R-P base must descend from that validated authority
squash merge, and the decision and machine contract must exist byte-identically
at that base and remain unchanged at the C3R-P head.

## Immutable upstream authority

C3R-A0 remains the immutable 25-file historical baseline, dependency and
occurrence authority. C3R-A1 remains the serial-program and
`C3RStageMergeReceiptV1` authority. PR #794 remains the merged PostgreSQL 15.8
oracle authority at the reconciled base. This decision narrowly supersedes A0
only for the seven operations and one append below; every unlisted path and
digest remains governed by A0. None of the A0, A1 or oracle artifacts may be
edited by this Work.

## Seven exact existing-path operations

The exact byte records, current and future Git blobs, raw SHA-256 values, byte
counts, line counts, canonical UTF-8/LF SHA-256 values and repair bytes are
closed in
`config/dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json`. They were
re-derived from the protected base and terminal donor evidence before this
Work changed any repository path.

| Operation | Current path | Future path | Future Git blob | Future raw SHA-256 | Boundary |
| --- | --- | --- | --- | --- | --- |
| `PERSONAL_LEARNING_STATE_RENAME_AND_RECURSIVE_CTE_REPAIR` | `supabase/migrations/20260608_create_personal_learning_states.sql` | `supabase/migrations/20260608090000_create_personal_learning_states.sql` | `bd305ec8c4e55510f9faeded7cf2594513e71055` | `957fb9810283086e75ce34689b3eee2c2d3be4373dc341056630db716457b815` | exact PostgreSQL-15.8 recursive-CTE repair and rename; remote state `UNKNOWN` |
| `LEGAL_GROUNDING_RENAME` | `supabase/migrations/20260615_legal_grounding.sql` | `supabase/migrations/20260615090000_legal_grounding.sql` | `160955292b0caf8c4dea01b47b52340ba2242acc` | `fb585b9c2d96edfd696d2f03e0d4fc427597c7759ee6ab96de5a3dddf29d237e` | rename only; bytes unchanged; remote state `UNKNOWN` |
| `LEGAL_ARTICLE_IDENTITY_RENAME` | `supabase/migrations/20260615_legal_article_chunk_identity.sql` | `supabase/migrations/20260615100000_legal_article_chunk_identity.sql` | `0d20d7f175d8f93a2215fcb141f17996395c5597` | `03dce727ac9bca1ab290556583c33593c3ae6ee544b0c90cc8ff7e05aea6e29d` | rename only; bytes unchanged; remote state `UNKNOWN` |
| `LEGAL_RETRIEVAL_RENAME` | `supabase/migrations/20260615_legal_retrieval.sql` | `supabase/migrations/20260615110000_legal_retrieval.sql` | `6821a0a694f9d5b737ac104270826371980eb431` | `d1ec08d0e3082e224c8da95c412636d83a0d4183df3a1ec4a1432f795b0154cc` | rename only; bytes unchanged; remote state `UNKNOWN` |
| `LEGAL_GROUNDING_GUARD_RENAME` | `supabase/migrations/20260615_legal_grounding_guard.sql` | `supabase/migrations/20260615120000_legal_grounding_guard.sql` | `5971e1b961a7d096510902fdc40b04310a053ade` | `436e741f78efc14fa7decd2c6f8c3eadf31f5acd4590df98c3eaad988493b642` | rename only; bytes unchanged; remote state `UNKNOWN` |
| `LEGAL_GUARD_SERVICE_ROLE_GRANT_RENAME` | `supabase/migrations/20260616_legal_grounding_guard_service_role_grant.sql` | `supabase/migrations/20260616100000_legal_grounding_guard_service_role_grant.sql` | `f960965c3c3d058486b1edf12e8b0639c15d7f7a` | `25e358828f3953b3cf793f7eeb645c816156e8bb89f5b7899d3c075de9594e13` | rename only; bytes unchanged; remote state `UNKNOWN` |
| `PERSONAL_CONCEPT_EARLY_BOUNDARY_COMPATIBILITY_REPAIR` | `supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql` | same path | `301b713c16880807e21a11b770f7575e3701e312` | `f5feb973cbc25cd8392158daf4f4c58227a776266f8b4f196c1f253eda39ee92` | exact in-place fresh-history compatibility bytes; remote state `KNOWN_APPLIED` |

The five legal renames preserve their canonical SQL bytes exactly. The
personal-learning repair permits only the pinned one-segment replacement in
the machine contract. The known-applied concept-boundary operation preserves
the remote ledger filename identity and may never replay repaired historical
source remotely.

## Sole append and effective inventory

The only append path is:

`supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql`

It does not exist and is not created in this Work. Its candidate SQL digest is
necessarily unknown here and must be nonempty and exact-head-pinned in C3R-P.
The closed effective formula is A0 25, minus six old rename paths, plus six new
rename paths, with the in-place replacement net zero, plus this one append:
exactly 26 migration paths. The 18 unchanged paths and all 26 effective paths
are closed in the machine contract. A second append, delete, missing path,
unlisted rename or unlisted content change fails closed.

## Remote continuity and stage state

The six `UNKNOWN` histories require a separate future remote-reconciliation
packet before any deployment decision. The `KNOWN_APPLIED` personal-concept
remote ledger identity remains untouched. Only the forward append may later
reassert the final boundary, and any remote application remains separately
Owner-gated.

This authority grants zero Supabase link, db push, migration repair, linked
reset, remote SQL, remote history/schema mutation or Production mutation.
Remote operation authorization and remote mutation counts are zero.

C3R-P remains `authorized_unstarted`. C3R-T remains blocked on a validated
C3R-P merge receipt. C3R-L remains blocked on validated C3R-P and C3R-T merge
receipts. WCV-C3 remains incomplete; no issue closes and no successor starts.

## Exact later C3R-P acceptance obligations

The later C3R-P candidate must prove all of the following; this decision
records but does not implement them:

1. the exact append SQL bytes, Git blob and SHA-256 at its candidate head;
2. two fresh isolated reset/replay cycles;
3. success of the merged PostgreSQL 15.8 oracle;
4. database-enforced Practice ownership for every subject-bearing record by
   exact enum, CHECK constraint or an equivalent closed schema rule;
5. zero Theory/Law application, adapter or migration scope;
6. actual Practice runtime evidence;
7. `practiceEvidenceRefs`, `browserToPostgresEvidenceRef` and every per-item
   `runtimeEvidenceRef` cross-bound to the exact `PRACTICE_RUNTIME` metadata
   artifact and independently reproduced by the evidence verifier;
8. metadata-only artifacts;
9. zero remote, Supabase and Production mutation; and
10. the existing `C3RStageMergeReceiptV1`.

The PR #796 P1 is mandatory C3R-P acceptance evidence. Practice scope is
enforced by exact schema identity, subject constraints, changed-path scope and
actual runtime evidence. The computed-string P2 is not implemented as a
source-token filter.

## Deliberate exclusions

This authority defines one small future migration-authority binding containing
the authority decision and contract digests, validated authority resulting-main
identity, seven operation identities and future digests, append path and SQL
digest, effective-inventory digest and remote mutation count zero. It is not a
runtime receipt and cannot substitute for `C3RStageMergeReceiptV1`.

No generic migration-mutation runtime envelope, append semantic-source
validator, arbitrary routine-body SQL parser, DML/DDL target parser,
Theory/Law raw-value scanner, computed-value detector, future final-catalog
validator, Practice artifact verifier or custom live-GitHub runtime verifier
is installed by this Work.
