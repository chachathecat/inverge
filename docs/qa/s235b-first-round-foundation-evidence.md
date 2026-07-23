# S235B First-Round Foundation Evidence

## Evidence state

- Evidence version: `s235b.foundation.evidence.v1`
- Evidence date: 2026-07-23
- Tracking issue: `#653`
- Branch: `agent/s235b-first-round-foundation-contracts`
- Initial main: `9150aa788ca33be613640bfbe6e531d9993eb983`
- Initial main tree: `9199ac07bb664fd6f0926314a26b94d7c235b7e7`
- Initial reconciliation: exact match
- Runtime evidence: not applicable and not claimed
- OCR benchmark: not executed
- Real content import: not performed
- O3B approval: not requested or granted
- Reconciled base after S235A priority merge:
  `dac5777dab76c95a1451e2adef147b976909c4bd`
- Reconciled base tree: `5bad82f70346adfaa7dbe71268c5cb07769756aa`
- Closeout: the exact 17-path shared intersection was serialized only after
  S235A PR `#656` merged

This is metadata, contract, and source-verification evidence. It is not
learner-runtime, content-readiness, redistribution, or efficacy evidence.

## Canonical source reconciliation

The live source order and exact starting blobs were read before mutation:

| Source | Starting blob |
|---|---|
| `AGENTS.md` | `4071e4e34ea4dbe9ca544b2db484ad1942dc1491` |
| `docs/decisions/2026-07-23-post-650-unified-program-reset.md` | `b5dfcbd37f9706619986517fc501f8194264181d` |
| `docs/dabangil-unified-program-contract.md` | `5232392ade0db0fdd186fc64207c0475a9e2d4d2` |
| `config/dabangil-unified-program-contract.json` | `f1f75b6d6d01e8ca3df33007fcc1ea8944aed9fa` |
| `roadmap/active-program.yml` | `24ee3e7d733ded3a0d0526c1d736a9ceba8359e3` |

At selection:

- S235A was queued with lock `second-golden-readiness`;
- S235B was queued with lock `first-foundation-contracts`;
- S236B was queued behind S235B;
- O3B was queued behind S236B;
- only stale PRs #67 and #423 were open and neither overlapped the S235B
  lane-specific files;
- no published S235A branch, PR, issue, or changed-file manifest was
  discoverable.

After selection, S235A issue
[`#654`](https://github.com/chachathecat/inverge/issues/654) was published
with a 30-file manifest. It owns `roadmap/active-program.yml`, the unified
contract and JSON mirror, and shared tests. The four current S235B lane files
do not overlap that manifest. The exact later intersection with this Work is
the roadmap plus all 16 shared roadmap-status tests, 17 paths total; every
overlapping writer reservation remained with S235A until its priority merge.
The reserved branch
`agent/s235a-owner-private-golden-3-readiness` later appeared at the same
initial main. That first observation had no content commit. A subsequent live
reconciliation found draft PR
[`#655`](https://github.com/chachathecat/inverge/pull/655) with the declared
S235A manifest; it was later superseded without merge. Replacement PR
[`#656`](https://github.com/chachathecat/inverge/pull/656) priority-merged as
commit `dac5777dab76c95a1451e2adef147b976909c4bd`, tree
`5bad82f70346adfaa7dbe71268c5cb07769756aa`.

S235B then fetched and rebased onto that exact `main`, reread the current
governing sources, confirmed the S235A writer reservation was released, and
serialized `S235B.status: queued -> completed` in the shared roadmap. The
first relevant-test run then proved the existing shared roadmap-runner
expectation was stale. The next default-suite run exposed the other 15
existing source tests that encoded the same prior live status/ready set or
used S235B as the report-only target. Those 16 released test paths were added
to the exact manifest and changed only for the resulting `O3A, S236B`
metadata-ready selection and the queued S236B report-only target. Every
pre-rebase or earlier-head test, CI, and hostile-review observation is
discarded as merge-gating evidence.

The post-S235A governing-source reconciliation is:

| Source | Reconciled blob |
|---|---|
| `AGENTS.md` | `4071e4e34ea4dbe9ca544b2db484ad1942dc1491` |
| `docs/decisions/2026-07-23-post-650-unified-program-reset.md` | `b5dfcbd37f9706619986517fc501f8194264181d` |
| `docs/dabangil-unified-program-contract.md` | `bc5bad78fa684d695fe3f3dde36f3993c51240ea` |
| `config/dabangil-unified-program-contract.json` | `223650e9c09d43382189f693b12e0d9beb489fd2` |
| `roadmap/active-program.yml` | `07d0a3cc2801ab6f928dc223c943a36f88ff4a70` |

## Exact owned-file manifest

1. `docs/s235b-first-round-adaptive-mcq-foundation-contract.md`
2. `config/s235b-first-round-adaptive-mcq-foundation-contract.json`
3. `docs/qa/s235b-first-round-foundation-evidence.md`
4. `tests/s235b-first-round-adaptive-mcq-foundation-contract.test.mjs`
5. `tests/agent-factory-github-actions-button.test.mjs`
6. `tests/agent-factory-roadmap-runner.test.mjs`
7. `tests/dabangil-premium-alignment.test.mjs`
8. `tests/practice-answer-review-engine.test.mjs`
9. `tests/s214-reference-answer-pipeline.test.mjs`
10. `tests/s215-reference-answer-release-gate.test.mjs`
11. `tests/s216-error-notebook-gap-taxonomy.test.mjs`
12. `tests/s217-personal-core-concept-graph.test.mjs`
13. `tests/s218-similar-question-review-scheduler.test.mjs`
14. `tests/s219-learner-catalog-usage-ledger.test.mjs`
15. `tests/s220-billing-entitlement-credit-usage.test.mjs`
16. `tests/s221-paid-trust-privacy-cost-guardrails.test.mjs`
17. `tests/s222-academy-answer-operations-tenant-boundary.test.mjs`
18. `tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs`
19. `tests/s224-three-subject-learner-runtime-acceptance.test.mjs`
20. `tests/theory-answer-review-engine.test.mjs`
21. `roadmap/active-program.yml`

The final diff must equal these 21 paths exactly. The first four are
lane-specific. The roadmap and 16 existing source tests are serialized shared
paths mutated only after S235A priority-merged and S235B rebased. The exact
roadmap change is the S235B status transition from `queued` to `completed`;
the source-test changes only update the resulting live status/ready/selected
set from `S235B, O3A` to `O3A, S236B` and retarget one report-only planner
test from completed `S235B` to queued `S236B`. They prove selection does not
start work.

No other path is owned.

## Official-rule evidence

Verified field observations are pinned to the 2026 first-round exam date,
2026-04-04.

| Evidence | Exact official representation and locator | Observed |
|---|---|---|
| Notice identity, number, date, attachments | Q-Net post `5250965`, board `Q001`, rendered title/attachment/announcement blocks; stable `crf002` execution-notice identity | 2026-07-23 |
| First-round date | post `5250965` PDF asset `2247053`, printed p.2, §2, 제1차 시험 row | 2026-07-23 |
| Six statutory/five scored subjects, relationship Laws, five-choice, exam-date version basis | same official asset, printed p.2, §3 가.; Law.go `lsiSeq=265547` Article 9 `joNo=0009`; Annex 1 `bylNo=0001`, `bylEfYd=20240926` | 2026-07-23 |
| 40 questions and 120/80-minute sessions | same official asset, printed p.3, §3 나., 제1차 rows; 2026-04-04 Asia/Seoul | 2026-07-23 |
| 40/60 pass rule | same official asset, printed p.4, §5 가., 제1차 paragraph | 2026-07-23 |
| Five-year English window, tests, thresholds and verification | same official asset, printed pp.1 and 8, 주요 강조사항 / §8 가.; Law.go Article 9(4)–(5); Annex 2 `bylNo=0002`, `bylEfYd=20240926` | 2026-07-23 |
| Qualification, ministry, administering agency | Q-Net qualification detail, `jmCd=9745` | 2026-07-23 |

The contract separates six statutory subjects from five scored MCQ subjects.
It does not describe the five as the complete statutory list.

No notice body or raw asset bytes are persisted, imported, or committed, and
S235B computed no raw asset digest. The verification record is an exact field-level
observation with post/asset/page/section anchors; redistribution remains
blocked until the official bytes and rights pass O3B.

## Q-Net post and asset evidence

No raw asset body was retained, imported, committed, or hashed by S235B. The
evidence records exact page and attachment identifiers only.

| Post | Assets observed | Exact post license evidence | S235B decision |
|---|---:|---|---|
| `5250965` 2026 annual notice | `2247052`, `2247053` | no post-specific KOGL label observed | rights unresolved; metadata/link only; O3B required |
| `5258924` 2026 first-round question sheets | `2253620`, `2253621` | 공공누리 제1유형 / 출처표시 | metadata/link only; O3B required |
| `5262739` 2026 first-round final answer | `2256457` | 공공누리 제1유형 / 출처표시 | metadata/link only; O3B required |

The board-list and detail-page displayed dates differ. Both are retained;
neither is silently reinterpreted as an original publication date.

Each asset remains:

- `hashStatus = raw_bytes_not_persisted_or_hashed_by_s235b`;
- no byte count or digest;
- third-party rights unreviewed;
- redistribution disabled by this contract;
- blocked pending per-asset O3B review.

Every post and asset also records the conservative decision authority
`S235B_conservative_default_not_legal_approval`, a null reviewer and review
time, `pending_O3B`, and `finalDecisionAllowedByS235B=false`. No S235B field
is a legal approval; O3B must supply the named reviewer and final decision.

This fail-closed decision avoids treating a board-wide notice, the absence of
a notice, or a post-level label as an automatic grant for every file.

The future rights receipt is closed and binds each post and asset to exact
retrieved representation evidence. Post and asset transport receipts require
HTTP 200, HTTPS, a verified official Q-Net host, retrieval time, and matching
content type. Identity receipts bind canonical post title/URL or exact
asset ID/filename/kind, positive byte count, lowercase SHA-256, and PDF,
HWP, or HWPX magic. A post cannot broaden an asset decision; missing, stale,
HTML-error, or unrelated-body evidence fails closed.

Evidence kind and primary basis are joined by one closed five-row crosswalk.
No-basis evidence maps only to rejected/empty scope; metadata policy maps
only to metadata/link with empty scope; owner-private policy reaches at most
the one Personal Raw Vault tuple; and official-license evidence reaches only
exact tuples individually proved at the locator in the hashed official
representation. The row also closes evidence/basis decisions, URL and locator
shapes, exact attribution, and maximum final decisions. An unlisted pairing
cannot back a rights receipt.

O3B must cover exactly seven official representations: three Q-Net HTML/PDF
representations, Law Article 9 and both Law annexes, and the qualification
detail HTML. Each has separate transport, content identity, field extraction,
and rights evidence. The annual-notice PDF field projection cannot claim the
HTML or Law anchors.

## Law and K-IFRS evidence state

The contract enumerates Civil Law plus all nine relationship Laws and the
exact cadastral-only scope for the spatial-information Law. Every 2026-04-04
Law snapshot remains unresolved until its official version, effective range,
digest, scope, and reviewer decision are supplied.

The future Law proof binds the exact exam-date effective interval,
predecessor/successor, official version history, successful official-host
transport/content identity, and a complete no-gap/no-overlap amendment-chain
digest. Only `verified_in_force_on_exam_date` can release.

KASB metadata identifies the 2026 active archive as of 2026-01-01. S235B did
not prove completeness through 2026-04-04, retrieve or hash the archive,
establish redistribution rights, or store K-IFRS text. Those states remain
release-blocking.
The K-IFRS completeness contract also records the known
`한국채택국제회계기준 수정목록 26-1` entry. A mandatory index-coverage
receipt binds every page or a proved complete listing, ordered page digests,
the inclusive coverage window, matched/unclassified counts, and every match
to the ordered inventory. Each inventory entry has its own transport,
content-identity, raw-digest, rights, reviewer, and decision evidence.

Future Law digests cover exact raw bytes from a named official Law.go
representation; future K-IFRS digests cover the exact named official KASB ZIP
bytes. Representation URL, content type, byte count, and retrieval time are
mandatory. Rendered, transcoded, extracted, or repacked substitutes do not
satisfy the digest contract.
ZIP archive transport/magic/filename checks are separate from typed
index/amendment/correction checks; a 200 HTML interstitial cannot satisfy
either identity contract.

## Privacy and feedback evidence state

Private capture, rapid-grid data, actor identity, and item references remain
in the Personal Raw Vault for personal-service processing only. Shared Signal,
model evaluation/training/tuning, cross-vault identity, and standards export
are false. O2 must later approve purpose, consent, retention, revocation, and
a closed nonreconstructive adapter before any collection or export.
Collection is currently false under the explicit “no approved policy, no
collection” rule. The event envelope requires consent, retention-policy, and
revocation/deletion receipts before collection and forbids cross-vault actor
resolution.

The five-choice contract has closed correction/explanation state vocabularies
and bodyless references scoped to an authorized plane. Verified release needs
official-key, rights, and applicable exam-date version evidence. Law and
Accounting use their required verified Law/K-IFRS states; Economics and Real
Estate Principles require a subject-validator receipt plus explicit
`not_applicable_verified`. Missing applicability never bypasses the gate, and
a model cannot assign not-applicable. Unresolved prerequisites withhold both
body and reference. Every subject-matrix validator also needs one
applicability receipt: applicable rows require a derived input and passing
receipt, while verified-not-applicable rows require a closed reason and
forbid pass evidence. Approved release attribution is a deterministic
byte-exact projection of the question post/asset/object, key post/asset, and
each non-null correction/explanation rights receipt. Only byte-identical
strings deduplicate; different strings remain separate display blocks. The
key receipt, feedback bundle, release, QTI item/modal shape, and Gold/held-out
ingress all bind the projection and digests. No feedback body or runtime is
present.

The future privacy bundle contains exactly five ordered lifecycle phases tied
to the pre-session event-log precommit and one actor-vault scope. It
recomputes phase ordinals, common fields, temporal/null rules, and zero-copy
deletion. Every privacy-profile literal resolves to the single defined
`privacy-lifecycle-five-phase.v1` registry entry. Choice comparison
additionally requires a unique 32-byte salt in
the Personal-vault commitment/opening. That opening salt may enter only the
future Owner-approved memory-only bridge and is forbidden from every
comparison/scoring receipt, evaluator store, log, cache, or backup.
Independently signed raw-choice destruction evidence covers
session/form/position, timestamps, and zero residual memory, buffer, log,
cache, and backup counts. None was executed by S235B.

The Owner authorization reference is not a policy-time assertion. The same
immutable Owner receipt is projected directly into the scope, privacy,
Personal-log, timed/evaluation, and cross-plane O3B inputs. It is re-resolved
as current and not revoked or superseded immediately before every collection,
processing, opening/bridge, evaluation/scoring, and output action; its
non-null expiry must be strictly later than the corresponding action
timestamp. The five-input coherence root compares the receipt's exact
`evidence_id`, `evidence_version`, and `evidence_sha256` from the projection,
not from the enclosing gate-input receipt, which prevents a digest cycle.
The signed Owner payload is closed and binds the exact data-boundary,
held-out-ingress, and cross-boundary-rule values through ordered RFC 8785
SHA-256 rows.

## Standards claim check

| Target | Pinned mapping shape | Explicitly absent |
|---|---|---|
| QTI 3.0.1 | pinned assessment-item namespaces/schema, identifier/title, adaptive/time-dependent false, five-choice single response, authorized item body, immutable release-attribution reference/row digest/ordered unique values/digest with separate verbatim blocks in item body and modal, mutually exclusive custom inline processing with exact correct→1/other submitted→0 SCORE branches and FEEDBACK in both, one combined modal-feedback shape, Content Package metadata extension | conformance, certification, import/export, player, CAT |
| IEEE 9274.1.1-2023 xAPI | exact Statement fields/verbs, item-vs-assessment object rule, actor and authority Agent Account IFIs, context-extension cause placement, provenance, canonical RFC 3339 UTC `Z` timestamp with exactly millisecond precision and trusted-clock future-time rejection | adapter, LRS, transport, storage, query, conformance, Production collection |
| Caliper Analytics 1.2 | AssessmentProfile, mandatory v1p2 context, exact event/action/entity records, item-vs-assessment object rule, generated references, absolute-IRI Event extensions | Sensor, Envelope transport, delivery, analytics efficacy, Production collection |

Each machine mapping record supplies source, target, type, cardinality,
constraint, extension placement, and future enrichment. K/C/A/R/T/G uses the
versioned `urn:inverge:dabangil:first-round:cause:v1:` namespace and remains
non-native vocabulary. Actor/item exports remain blocked pending an
O2-approved closed, nonreconstructive adapter.
The ten shared project-extension definitions each pin source field, absolute
IRI, value type, cardinality, null encoding, and distinct xAPI/Caliper
placement; no wildcard extension key is authorized.
The xAPI timestamp mapping copies the validated source bytes exactly and
rejects an offset spelling, invalid calendar instant, non-millisecond
precision, or a timestamp later than the trusted adapter clock. It never
clamps or substitutes the time. No adapter or standards conformance is
claimed.

## Gold, held-out, timed, and OMR state

The contract requires different storage-boundary IDs, roots, key classes,
principal classes, access classes, purposes, and future manifests for Gold
and readiness held-out. Held-out access is evaluator/readiness-runner only;
application builds, ordinary CI, development/Preview, learning, tuning,
prompting, and ordinary review are denied. Copying, shared keys/principals,
and membership disclosure are denied. Git may later hold only
nonidentifying attestation and receipt digests.
The displayed future manifest paths are explicitly relative to their separate
vault roots and are not Git paths.

No dataset, store, key, principal, or content is created. Physical/runtime
enforcement is not claimed. Future access logs and contamination receipts are
mandatory. Current readiness is `insufficient_evidence`.

Future Gold and held-out ingress is target-vault specific and requires exact
per-object rights, write/content-identity, and read-after-write receipts.
Question, key, correction, and explanation objects cannot inherit a
manifest-only grant. Every object binding carries its exact attribution set;
each ingress receipt copies the release rows, authoritative display order,
and digests. The per-object union is compared by exact byte-string
set/cardinality, so its class-grouped binding order cannot contradict the
release's interleaved feedback display order.

The bodyless timed/OMR record distinguishes `single`, `blank`, `multiple`,
`ambiguous`, and `unreadable` mark states and records selected marks, form,
session/item/subject position, correction/transfer/finalization, source clock,
elapsed time, and timing provenance. A single state requires exactly one mark
and the same non-null final choice; every non-single state requires a null
final choice. Finalized transfer requires non-null, ordered
marked/transferred/finalized times and resolved correction; corrected transfer
requires correction history. Exact session profiles bind each record to its
40-question subject range and cap elapsed time at 7,200,000/4,800,000 ms. A
timed-session receipt must cover positions 1..120 or 1..80 exactly once, with
the exact subject-position mapping, no missing/duplicate record, and record
timestamps inside session bounds. Any invariant or completeness failure is
readiness-ineligible. It makes no pass-probability claim.

## S236B and O3B handoff evidence

S236B may be selected only later and manually. It requires:

- merged S235B SHA/tree and contract versions;
- the private-capture boundary;
- OCR risk-field taxonomy;
- proposed-only candidate lifecycle and benchmark-only maximum target;
- pinned versions, license/SBOM, model-rights, isolated-environment, native
  fallback, named-owner, and tested-rollback entry receipts;
- source/rights manifest version;
- proof that S235B imported no real content;
- explicit Owner selection.

S236B coherence has exactly seven dimensions covering candidate-set and
configuration preimages/scalar carriers, fixture manifest, environment
identity/configuration, and rollback state. Every position resolves a closed
derivation specification and typed source transformation at one head/tree.
The pre-S236 benchmark evidence has no S236 gate-packet dependency.

O3B requires an exact future packet containing:

- exact scope and exclusions;
- S235B/S236B SHA/tree;
- official rule and subject taxonomy versions;
- per-post evidence and per-asset digest/rights/attribution;
- official-key, Law, and K-IFRS status;
- Gold reviewer and held-out contamination evidence;
- unresolved counts, safe deferred state, and expiry triggers.

One closed Owner root-attestation schema signs the exact O3B scope ID,
decision type, included/excluded actions, authorization boundary, Owner-scope
digest, ordered digests of the timed/OMR data boundary, held-out ingress
shape, and held-out cross-boundary rules, trust-anchor projection, decision
payload digest, and decision time. Its closed nested authorization-boundary
schema requires the exact action-time currentness object, including all
fixed decisions, booleans, action names, and timestamp rule; the decision
payload digest contract is also inside that mechanically recomputed nested
registry. Two executed gate-context equality predicates bind the signed Owner
root-anchor reference and digest to the packet-selected projection. All five
authorization-dependent O3B inputs directly project that same virtual receipt
first and compare its immutable three-field identity. A separate privacy
timed-session precommit dimension compares the five privacy rows' common
immutable precommit reference with the direct Personal-log precommit receipt;
the existing timed-session dimension carries that receipt into the timed and
evaluation chain. The direct target shape exposes the exact
`named_owner_authorized_human_readiness_reviewer` class required by the privacy
source resolver and forbids model issuance or review; the instance
`reviewer_or_workload_identity` never substitutes for that shape authority.
The four allowed direct-domain references are closed over supporting shape,
source role, direct branch, exact target path, schema, decision, and authority
class. Root/support/virtual reclassification, an unregistered direct row, a
missing target ID or direct resolver, or any tuple change returns a
deterministic fail-closed validation error rather than throwing. Missing
projection membership, a changed pointer or anchor digest, a missing or wrong
target reviewer class, a mismatched anchor reference or privacy session, a
mismatched participant, a missing or altered nested currentness or digest
contract, a stale action-time decision, or an enclosing-receipt/
self-referential derivation fails closed.

The future trust chain pins an Owner-approved key registry and gate-specific
root-authority anchors. Root signatures use domain-separated canonical bytes
and algorithm-specific key/signature encodings. Component licenses,
model-asset rights, and any `verified_none_required` inventory disposition
are independently current and expiry-bound. Candidate execution rows are an
ordered projection of the exact supply-chain candidate preimage; environment
identity and configuration digest are both bound.

Post-S236 benchmark evidence must carry a current passing S236B gate packet,
its exact coherence receipt, and a trusted merged-S236B Git snapshot with the
same evaluation commit/tree. Exact zero-count evidence carries a closed,
ordered member population, per-member current status evidence, recomputed
manifest root/count, and the unresolved-member projection; an opaque signed
zero is insufficient.

Neither gate is started or approved by this evidence file.

## Validation ledger

This committed ledger defines the gates but deliberately does not embed their
dynamic pass/fail result: editing that result would create a new head and
invalidate it. After the S235A merge/rebase, every result is regenerated
for one immutable PR-head SHA and read directly from the external evidence
location immediately before ready/merge.

| Gate | Required final rule | Exact-head evidence location |
|---|---|---|
| JSON parse and direct S235B contract test | pass against a clean checkout of the exact PR head | exact command transcript/receipt posted on the PR and naming the immutable SHA |
| relevant source/doc tests and roadmap runner | pass against the exact PR head | exact command transcript/receipt posted on the PR, plus applicable default GitHub CI results |
| `git diff --check` and owned-manifest equality | pass; final diff is exactly the 21 owned paths | local full-history base…head receipt plus GitHub PR changed-file list, both naming the immutable SHA |
| fresh required CI | all required checks success | GitHub check suite anchored to the immutable PR head |
| fresh hostile review | actionable P0 = 0 and P1 = 0 | GitHub review/comment anchored to the immutable PR head |
| actionable review threads | 0 unresolved | GitHub PR conversation/thread state for the immutable PR head |

Any head change—including a merge-base reconciliation, roadmap closeout,
review fix, or metadata edit—expires all rows and requires a fresh external
run. The final merge decision must record the one SHA used for all rows in the
PR timeline or merge handoff, not in this self-validating commit.

## Required post-merge proof

After the explicit squash merge, re-read live `main` and prove:

- the merge SHA and tree;
- only the owned manifest changed;
- S235A was not mutated or completed by this Work;
- S236B remains queued and not started;
- O3B remains queued and unapproved;
- S237B/O4B and learner runtime remain queued/unstarted;
- no route, navigation, onboarding, pricing, billing, schema, persistence,
  migration, RLS, provider, model, prompt, dependency, environment, flag,
  allowlist, Preview, or Production surface changed;
- no PR-level auto-merge was enabled.
