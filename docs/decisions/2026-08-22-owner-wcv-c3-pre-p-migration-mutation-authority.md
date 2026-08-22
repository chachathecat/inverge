---
document_title: "Owner Decision — WCV-C3 PRE-C3R-P Exact Migration-Mutation Authority"
status: "owner-decision/approved-candidate-source-contract-only"
decision_id: "owner_wcv_c3_pre_p_migration_mutation_authority_2026_08_22"
dated: "2026-08-22 KST"
repository: "chachathecat/inverge"
roadmap_item_id: "WCV-C3"
campaign_id: "C3"
lead_issue: 706
recovery_tracker_issue: 781
authority_contract: "C3RPMigrationMutationAuthorityV1"
is_c3r_stage: false
repository_authority_effective_on: "expected-head-pinned squash merge and validated GitHub receipt"
runtime_authorization: "none"
remote_database_authorization: "none"
production_authorization: "none"
automatic_successor_start: false
---

# Owner Decision — WCV-C3 PRE-C3R-P Exact Migration-Mutation Authority

## Decision

The merged C3R-A0 authority correctly freezes the current 25-file migration
inventory against silent `UNKNOWN` or `KNOWN_APPLIED` filename, content and
history mutation. The merged C3R-A1 authority assigns migration-history
reconciliation to C3R-P, but grants no per-path mutation exception. This
decision supplies that missing narrow bridge by installing the source-only
`C3RPMigrationMutationAuthorityV1`.

This decision is not C3R-A2, A2E or any other C3R stage. It does not insert a
stage, consume or advance the C3R-P selector, start C3R-P, modify a migration,
implement runtime, contact Supabase, mutate a database, close an issue or start
a successor. It becomes repository authority only after its expected-head-
pinned squash merge and validated GitHub receipt. Until then, C3R-A0 continues
to deny every listed mutation as well as every unlisted mutation.

After that validated authority receipt, and only inside the later complete
C3R-P implementation candidate, this decision narrowly supersedes C3R-A0 for
the seven exact existing-path transformations and one exact append below. C3R-
A0 remains immutable historical baseline, dependency, occurrence and remote-
classification evidence and remains fully authoritative for every unlisted
migration. C3R-A1 and the merged PostgreSQL 15.8 oracle remain immutable.

## Reconciled start gate

The source-only candidate starts from protected `main`
`5965ddb0202c5f9effb531824d4d95f775abecc1`, tree
`bcb1017b980a5175e45265080ba25bc4b25c51ff`. PRs #785, #786 and #794 are
merged, unreverted and present in that history. PRs #770, #780, #790, #791,
#792 and #793 are closed unmerged and read-only. C3R-A0, C3R-A1 and the PRE-
C3R-P PostgreSQL 15.8 oracle are installed.

C3R-P is `authorized_unstarted`; C3R-T is blocked on a validated C3R-P merge
receipt; C3R-L is blocked on validated C3R-P and C3R-T merge receipts. Automatic
C3R runtime start and successor runtime start are false. WCV-C3 is incomplete.
Issues #706, #707, #708, #714 and #781 are open. No C3R-P branch, C3R-P PR or
overlapping merge-producing WCV-C3 writer existed at reconciliation.

The immutable package Git blobs are
`33a8d29b52ac225c6e957c71fce1f28f2eaba16d` for `package.json` and
`70f85fb69c39aa73cf572082c4d38eb426c0b398` for `package-lock.json`.

## Immutable upstream bindings

C3R-A0 is bound to PR #785 reviewed head
`f7f959368525f8a5895026f1361f6e13fd6226e0`, reviewed/resulting tree
`543f8dfb5fdd026c1361e1a502376945912e6c5c`, and resulting main
`3a7047cf4c7fc68247137bafbca2434abdadbc7f`. C3R-A1 is bound to PR #786
reviewed head `ff9dfbebea182d647daa84a349fcc50610f0ed1b`, reviewed/resulting tree
`3c48da6fe991d8c02e3991e0a571b3b12139932c`, and resulting main
`54afffcc539981ded65591f1f027171343bfce40`. Both passed required checks with
actionable P0/P1/P2 `0/0/0` and zero unresolved actionable threads.

The PostgreSQL oracle is bound to PR #794 reviewed head
`10fb2b88746cbdf58b514390023ad3668527c871`, reviewed/resulting tree
`bcb1017b980a5175e45265080ba25bc4b25c51ff`, and resulting main
`5965ddb0202c5f9effb531824d4d95f775abecc1`. Formal review ID
`5000065404`, runtime gate run `32570953881`, artifact `9475302162`, artifact
SHA-256 `2be37ac692fcc51c7fde97c75a184e6e15d47c1ac42f08551e5a4fd8003a5c1b`,
fixture count `61`, fixture-set SHA-256
`c9d375bfb68104457179a993a4ed5dfc80600b7bf0f4e2b93f3fb2562fc6ac0b`
and `server_version_num = 150008` are immutable bindings.

Any upstream blob or digest drift, reverted or mismatched merge, unvalidated
receipt, candidate-head assertion, issue state, donor branch or closed-unmerged
PR fails closed.

## Exact authorized existing-path operations

Every byte count and line count uses the exact Git blob bytes. Canonical digest
means fatal UTF-8 decoding, no BOM and CRLF/CR normalized to LF. All current
files are already canonical LF with a trailing LF, so current raw and canonical
SHA-256 values are equal.

| Operation | Current → future path | Remote | Current blob / SHA-256 / bytes / lines | Future blob / SHA-256 / bytes / lines |
|---|---|---|---|---|
| Personal learning rename and repair | `20260608_create_personal_learning_states.sql` → `20260608090000_create_personal_learning_states.sql` | `UNKNOWN` | `ca91420e3d2c4ca41a5c0f5683d97b15a7ca8af1` / `13f290748149a6d1ede1b3894ca9bce3d3f79e198015918e5a4159b6c1c2b968` / 4892 / 123 | `bd305ec8c4e55510f9faeded7cf2594513e71055` / `957fb9810283086e75ce34689b3eee2c2d3be4373dc341056630db716457b815` / 4991 / 125 |
| Legal grounding rename | `20260615_legal_grounding.sql` → `20260615090000_legal_grounding.sql` | `UNKNOWN` | `160955292b0caf8c4dea01b47b52340ba2242acc` / `fb585b9c2d96edfd696d2f03e0d4fc427597c7759ee6ab96de5a3dddf29d237e` / 10816 / 259 | identical |
| Legal article identity rename | `20260615_legal_article_chunk_identity.sql` → `20260615100000_legal_article_chunk_identity.sql` | `UNKNOWN` | `0d20d7f175d8f93a2215fcb141f17996395c5597` / `03dce727ac9bca1ab290556583c33593c3ae6ee544b0c90cc8ff7e05aea6e29d` / 953 / 26 | identical |
| Legal retrieval rename | `20260615_legal_retrieval.sql` → `20260615110000_legal_retrieval.sql` | `UNKNOWN` | `6821a0a694f9d5b737ac104270826371980eb431` / `d1ec08d0e3082e224c8da95c412636d83a0d4183df3a1ec4a1432f795b0154cc` / 4000 / 119 | identical |
| Legal grounding guard rename | `20260615_legal_grounding_guard.sql` → `20260615120000_legal_grounding_guard.sql` | `UNKNOWN` | `5971e1b961a7d096510902fdc40b04310a053ade` / `436e741f78efc14fa7decd2c6f8c3eadf31f5acd4590df98c3eaad988493b642` / 3249 / 104 | identical |
| Legal service-role grant rename | `20260616_legal_grounding_guard_service_role_grant.sql` → `20260616100000_legal_grounding_guard_service_role_grant.sql` | `UNKNOWN` | `f960965c3c3d058486b1edf12e8b0639c15d7f7a` / `25e358828f3953b3cf793f7eeb645c816156e8bb89f5b7899d3c075de9594e13` / 415 / 6 | identical |
| Personal-concept compatibility repair | `202606232130_personal_concept_graph_rpc_only_write_boundary.sql` preserved | `KNOWN_APPLIED` | `c2f28006e399a9241c9556c14c042e67646be887` / `57b2aa59f96f3ea294a7d7e0c46350c5c3cb330c53a301a2d57634f2f54a0a57` / 1120 / 23 | `301b713c16880807e21a11b770f7575e3701e312` / `f5feb973cbc25cd8392158daf4f4c58227a776266f8b4f196c1f253eda39ee92` / 829 / 14 |

Paths in the table are under `supabase/migrations/`. The five legal
transformations are rename-only; future canonical SQL bytes and every digest
must equal the corresponding current bytes exactly.

### Personal learning exact repair

The machine contract pins the current recursive-CTE segment and its sole exact
replacement as canonical UTF-8/LF base64 plus separate SHA-256 values. The
replacement changes only that one segment and combines the PostgreSQL-invalid
multiple recursive references into one PostgreSQL-15.8-valid recursive term.
It preserves recursive key traversal, forbidden-key behavior, extension,
function identity/signature/return/language/volatility, table shape,
constraints, indexes, grants, policies and historical enabled-but-not-forced
RLS. It may not widen forbidden-key behavior or install the separately planned
later forced-RLS hardening.

### Personal-concept exact compatibility repair

The machine contract pins all future canonical UTF-8/LF bytes. The repaired
early migration revokes authenticated insert/update, preserves authenticated
select/delete, removes the two direct-write policies, makes no executable
reference to the later transition-function producer and explicitly states
that it has not installed the final RPC-only boundary. It creates no direct
PUBLIC, anon or authenticated write grant. The sole later C3R-P append must
reassert the final RPC-only function and privilege boundary after the producer
exists.

This `KNOWN_APPLIED` historical filename remains unchanged in the remote
ledger. Its repaired local source is never replayed remotely as old history.

## Exact one-append authority

The one frozen prospective append is:

```text
supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql
```

Version `20260822120000` is unused and strictly greater than
`20260817170000`. The future file must own the C3R-P Practice/common durable
substrate, durable schema and service-only RPC boundary, forced RLS, Practice/
common durable-learning persistence and final personal-concept RPC-only
boundary reassertion. It may own no Theory or Law outcome.

This authority work does not create that file and cannot pin a nonexistent SQL
digest. At the exact later C3R-P candidate head its nonempty SQL SHA-256 and
Git blob must be independently pinned in `C3RPMigrationMutationReceiptV1`,
validated by two independently addressed fresh isolated reset/replay cycles
and evaluated by the merged PostgreSQL 15.8 oracle. Any second append fails
closed.

## Closed effective inventory

The post-C3R-P effective inventory is calculated only as follows:

1. Start with the immutable A0 25-file historical baseline.
2. Remove the six exact old rename paths.
3. Add the six exact future rename paths.
4. Preserve the personal-concept path with its pinned replacement digest.
5. Add the one frozen C3R-P append.
6. Preserve all other 18 paths and byte digests exactly.

The result is exactly 26 migration paths. No delete, unmatched insertion,
second append, unlisted rename or unlisted content mutation is authorized.

## Remote-continuity boundary

This decision authorizes repository source changes and fresh isolated C3R-P
validation only. It authorizes zero `supabase link`, `supabase db push`,
`supabase migration repair`, linked reset, remote SQL, remote migration-history
insert/delete, remote schema mutation or Production mutation.

Each of the six `UNKNOWN` renamed histories requires a later separate remote-
reconciliation packet before any remote deployment decision. For the one
`KNOWN_APPLIED` repair, remote ledger identity remains untouched, repaired old
history cannot be replayed remotely, the sole forward append must reassert the
desired final boundary, and even that append remains separately Owner-gated
for remote application.

## Closed future receipt

The machine contract installs `C3RPMigrationMutationReceiptV1` as subordinate
evidence for, never a substitute for, the existing `C3RStageMergeReceiptV1`.
Its closed 17-field envelope binds the exact authority decision/contract
digests, C3R-P PR/base/head/tree, seven old/new path and SQL evidence records,
18 unchanged records, one append, the 26-file effective inventory, exact
dependency/order closure, two distinct reset/replay receipts,
`server_version_num = 150008`, the merged oracle, full canonical final schema/
relation/routine/policy/ACL/owner/RLS/FORCE-RLS state, the exact Practice
runtime receipt, metadata-only artifacts, cleanup and zero remote mutation.

Receipt validation resolves the declared base and candidate head/tree as real
Git objects, requires the base to contain the exact A0 25-file inventory,
compares every candidate SQL blob to the exact effective 26-file receipt, and
re-derives the candidate dependency closure with the immutable A0 analyzer.
The append source must prove a Practice durable schema and RPC, ENABLE plus
FORCE RLS for every relation it creates, and the final service-role-only
boundary for every newly created C3R-P durable relation, policy and routine,
with no Theory or Law outcome. The existing personal-concept transition RPC is
a distinct frozen boundary: the append must revoke EXECUTE from `PUBLIC` and
`anon`, grant EXECUTE only to `authenticated`, and reproduce its exact ten-
argument identity. The final catalog evidence must contain that routine/ACL as
well as service-role-only ACLs and policies for every append-created object.
The source spelling ends in `timestamptz`; the final catalog identity is pinned
to PostgreSQL's canonical `timestamp with time zone` rendering.
Every append-created routine is bound by its source-derived exact identity
arguments through its privilege statements and final catalog record; a safe
pre-existing overload cannot stand in for a newly created overload. The
independent verifier must return the complete canonical catalog records, not
only agree with receipt digests or counts. Unrelated historical relations keep
their exact observed owner/RLS/FORCE-RLS state; this authority does not require
or permit blanket FORCE-RLS hardening outside the created and two expressly
named hardened relations.
Only new non-conditional, non-replacement public-schema tables/routines, their
service-role-only policies/indexes/privileges, and exact ENABLE/FORCE-RLS
hardening of the two named personal-state relations are accepted by the source
envelope. Unqualified, conditional, replacement or unlogged object creates,
routine overloads, extra learner/public grants, destructive DDL, historical-
data DML, multi-object privilege statements and every unlisted statement fail
closed. A parsed receipt
object is never sufficient by itself: a separate verifier must validate the
live PR head, required native checks, clean formal review, both reset artifacts,
candidate oracle artifact, final catalog artifact and Practice evidence. Raw
receipt JSON is duplicate-key rejecting at every nesting level.

The immutable A0 tokenizer boundary also applies inside executable dollar-
quoted SQL/PLpgSQL bodies. Theory/Law/legal object or value provenance and all
dynamic SQL in append-created routine bodies fail closed; a top-level Practice
name cannot conceal a cross-subject implementation. Every append-created
routine body must use exactly one terminal dollar-quoted body in `sql` or
`plpgsql`; ordinary and escape-string function bodies are not authorized.
The same token-level marker boundary covers the complete outer executable SQL,
including underscore-delimited object names, foreign-key targets and static
values.

Unknown, missing, duplicate, extra or mismatched fields fail closed. Digest-
only final-catalog claims are insufficient. A later `DISABLE ROW LEVEL
SECURITY` or `NO FORCE ROW LEVEL SECURITY` operation against a protected
produced relation invalidates the receipt.

## Preserved authority and stage state

The strict stage chain remains `C3R-P → C3R-T → C3R-L`. The sole next C3R
stage is C3R-P and it remains `authorized_unstarted`. C3R-T and C3R-L retain
their existing receipt dependencies. Automatic C3R runtime start is false,
successor runtime started is false, WCV-C3 is incomplete, and #706/#707/#708/
#714/#781 remain open. This decision changes no selector and creates no stage.

## Delivery boundary

The authority candidate uses one branch, ordinary non-force commits and push,
one Draft PR, no auto-merge and no Ready transition. It receives at most two
source corrections and three exact-head formal reviews. Even with exact-head
checks and actionable P0/P1/P2 `0/0/0`, this Work stops at a frozen reviewed
Draft. A separate exact-head Owner approval and squash-merge closeout is
required before this candidate becomes repository authority.

In this exact PRE-C3R-P authority branch/PR context, the validator compares the
actual complete base-to-head plus worktree changed-path set to the frozen
twelve-path manifest; a thirteenth path or a missing declared path fails
closed. That authority-PR-only scope does not constrain a later C3R-P branch;
the durable contract and future receipt validator remain usable after merge.
Native PR validation requires
`pull_request.auto_merge` to be null and the sole checked recommendation to be
`Human approval required`.

The exact source-only owned-path manifest is stored in the machine contract.
It contains the decision, machine contract, QA record, validator, focused
test, five authority/roadmap mirrors, PR-contract validator and Node-suite
registration only. No migration, application, API, UI, runtime, workflow,
package, lockfile, environment, provider or deployment path is owned.

`LOCAL_DOCKER_NOT_REQUIRED_SOURCE_ONLY_AUTHORITY`
