# WCV-C3 PRE-C3R-P migration-mutation authority validation

Date: 2026-08-22 KST
Authority: `C3RPMigrationMutationAuthorityV1`
Classification: source-only control-plane bridge, not a C3R stage
Local Docker: `LOCAL_DOCKER_NOT_REQUIRED_SOURCE_ONLY_AUTHORITY`

## Reconciled base

- Repository: `chachathecat/inverge`
- Protected base SHA: `5965ddb0202c5f9effb531824d4d95f775abecc1`
- Protected base tree: `bcb1017b980a5175e45265080ba25bc4b25c51ff`
- Merged and unreverted: PRs #785, #786 and #794
- Closed unmerged and read-only: PRs #770, #780, #790, #791, #792, #793 and
  donor PR #795
- Open issues: #706, #707, #708, #714 and #781
- Initial C3R-P branch/PR count: zero
- Overlapping WCV-C3 merge-producing writer count: zero
- Initial worktree: clean

The one-time read-only reconciliation consumed AGENTS.md, the immutable A0
decision/manifest/analyzer/test, the immutable A1 decision/contract, both
unified contracts, active and master roadmaps, the merged PostgreSQL oracle
manifest/QA/analyzer/test, the exact 25-file migration inventory and the
Owner-supplied terminal `C3R_P_OWNER_GATE_REQUIRED` classification. The
terminal text is not independently committed as a repository artifact; its
substance is corroborated by A0's mutation denial and A1's assignment of
migration reconciliation to C3R-P.

## Exact source derivation

The validator reads each current migration through its pinned Git blob and
reuses the immutable A0 analyzer for current dependency/occurrence closure.
It rejects BOM or invalid UTF-8 and canonicalizes CRLF/CR to LF for the
canonical digest. All 25 current files are LF-only with a trailing LF.

The exact results are:

- current A0 inventory: 25
- authorized existing-path operations: 7
- rename operations: 6
- exact content repairs: 2
- rename-only operations: 5
- in-place repairs: 1
- deletes: 0
- unchanged paths: 18
- exact frozen append:
  `supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql`
- effective post-C3R-P inventory: 26
- remote-operation authorizations: 0
- stage-selector changes: 0

### Content-repair evidence

| Path | Current Git blob | Current SHA-256 / bytes / lines | Future Git blob | Future SHA-256 / bytes / lines |
|---|---|---|---|---|
| `supabase/migrations/20260608_create_personal_learning_states.sql` → `supabase/migrations/20260608090000_create_personal_learning_states.sql` | `ca91420e3d2c4ca41a5c0f5683d97b15a7ca8af1` | `13f290748149a6d1ede1b3894ca9bce3d3f79e198015918e5a4159b6c1c2b968` / 4892 / 123 | `bd305ec8c4e55510f9faeded7cf2594513e71055` | `957fb9810283086e75ce34689b3eee2c2d3be4373dc341056630db716457b815` / 4991 / 125 |
| `supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql` | `c2f28006e399a9241c9556c14c042e67646be887` | `57b2aa59f96f3ea294a7d7e0c46350c5c3cb330c53a301a2d57634f2f54a0a57` / 1120 / 23 | `301b713c16880807e21a11b770f7575e3701e312` | `f5feb973cbc25cd8392158daf4f4c58227a776266f8b4f196c1f253eda39ee92` / 829 / 14 |

The personal-learning future body is independently reproduced by replacing
one exact pinned recursive-CTE segment. The personal-concept future body is
independently reproduced from the fully pinned canonical bytes. Neither
future body is written to a migration in this authority candidate. The five
legal rename records require byte-for-byte current/future equality.

## Closed receipt validation

`C3RPMigrationMutationReceiptV1` has exactly 18 top-level fields. The focused
validator rejects duplicate JSON keys and exact-key mismatches at every
governed nested object. It requires seven ordered operations, 18 exact
unchanged records, one nonempty append, 26 exact effective records, full
dependency closure, two independently addressed fresh unlinked successful
reset/replay receipts, PostgreSQL `150008`, immutable oracle evidence, full
canonical final catalog records, complete Practice evidence, the five exact
metadata artifact kinds, complete cleanup and eleven zero-valued remote
continuity counters. Its domain-separated receipt digest covers the entire
closed object except the digest field itself.

One field is the separately domain-digested closed
`C3RPMigrationMutationAuthorityMergeReceiptV1` for exact authority PR #796.
An independent live-GitHub verifier must reproduce its reconciled base,
reviewed head/tree, pinned squash/resulting-main SHA/tree, exact authority
digests, passed checks, clean `0/0/0` formal review, zero unresolved actionable
threads, zero migration changes and zero remote mutation. The C3R-P base must
equal the verified authority resulting-main SHA/tree; the authority decision
and contract must already exist byte-identically at that base and stay
unchanged at the C3R-P head. Missing verification, a pre-authority base,
candidate-introduced authority or any receipt/verifier mismatch fails closed.

The validator also resolves the receipt base/head/tree in Git, compares all
25 base and 26 candidate SQL blobs, re-runs the immutable A0 dependency
analyzer over candidate-head SQL, validates the append's Practice, forced-RLS
and new-substrate service-only source/catalog obligations, and separately
requires the exact personal-concept transition ACL (`PUBLIC` and `anon`
revoked; `authenticated` alone granted). It rejects trailing unsafe grants,
non-service policies, destructive drops, missing source-created catalog
objects, routine overloads, unqualified/conditional/replacement/unlogged
creates, historical-data DML, unlisted statements, duplicate
raw-JSON keys, and requires an independent live-PR/check/review and
artifact-content verifier. Synthetic hashes or a detached candidate head
cannot satisfy the receipt. Reset, candidate-oracle and metadata artifact
references are cross-bound before the independent verifier runs.
Every non-transition privilege statement has exactly one created-object target;
multi-table and multi-function privilege mutations fail closed.
The A0 tokenizer recursively inspects executable dollar-quoted routine bodies;
Theory/Law/legal provenance and dynamic SQL fail closed even when the outer
function name is Practice-only. Each created routine must end in exactly one
dollar-quoted `sql` or `plpgsql` body; ordinary and escape-string body encodings
fail closed.
The clean-replacement boundary also rejects direct and CTE-nested historical
`INSERT`/`UPDATE`/`DELETE`, mutations inside nested dollar-quoted bodies,
unresolved or unqualified targets, `MERGE`, and body-level DDL/control
statements. Exact static `INSERT`/`UPDATE`/`DELETE` may target only relations
created by the same append. Mutation words in comments and ordinary string
literals remain non-executable controls. Exact same-depth append-created
`INSERT ... ON CONFLICT DO UPDATE/NOTHING` clauses pass, while unattached or
procedural `DO` and historical-target upserts fail closed.
Outer executable identifiers and values use the same marker scan, including
`law_*`, `theory_*`, `legal_*` and foreign-key targets.
The verifier must independently return the complete canonical catalog records;
a self-consistent receipt omission therefore fails. Created-routine privilege
and catalog closure use the exact source-derived identity arguments, so a safe
pre-existing overload cannot mask a new default-PUBLIC overload. FORCE RLS is
required only for append-created and expressly hardened relations; unrelated
historical relations retain their complete observed catalog state.
The transition RPC's `timestamptz` source alias is compared to the oracle's
canonical `timestamp with time zone` catalog identity.

The migration receipt is subordinate evidence only. It cannot replace the
live-GitHub-validated `C3RStageMergeReceiptV1` required to start C3R-T.

## Remote and stage boundary

Six rename records are `UNKNOWN` and require later separate remote
reconciliation. The personal-concept record is `KNOWN_APPLIED`: the remote
historical ledger identity remains untouched, the repaired old source is
fresh-history-only, and the one forward append must reassert the final
boundary. No remote application is granted.

The preserved state is C3R-P `authorized_unstarted`, C3R-T blocked on a
validated C3R-P receipt, C3R-L blocked on validated C3R-P and C3R-T receipts,
automatic start false, successor started false, WCV-C3 incomplete and all five
governed issues open.

## Required validation ledger

The frozen Draft candidate must show PASS for:

- focused PRE-C3R-P authority and hostile receipt tests;
- immutable C3R-A0, C3R-A1 and PostgreSQL-oracle regressions;
- unified-contract, roadmap and PR-contract mirror regressions;
- full default Node suite;
- typecheck;
- lint with zero new errors;
- production build;
- `git diff --check`;
- package/lock Git-blob preservation;
- exact 12-path source-only diff closure in this authority candidate context,
  with later C3R-P branches excluded from that authority-diff gate;
- native Draft, `auto_merge = null` and Human-approval recommendation closure;
- no migration diff;
- exactly two read-only audits: routine-body mutation and historical-data
  safety; authority, receipt and stage continuity;
- exact-head native checks and a fresh exact-head formal review with actionable
  P0/P1/P2 `0/0/0` and zero unresolved actionable threads.

This record supplies no merge receipt. The PR must remain open Draft with
auto-merge off and no Ready transition, migration file change, C3R-P start or
remote/Supabase/Production mutation.
