# Inverge Study Schedule System

## 2026-07-01 Product Constitution Transition

The active learner product is 감정평가사 2차 Dabangil only. Existing 1차
schedule templates are frozen compatibility metadata; they do not authorize
first-round learner runtime, commercial products, navigation, or public
exposure. The Post-#650 Adaptive MCQ Foundation lane owns new contracts only
and must not treat these templates as verified runtime authority.

Planning distinction:

- 1차 legacy templates: frozen compatibility metadata only; new Foundation
  contracts require fresh official/rule/version evidence;
- 2차: active Dabangil learner operating scope for 실무, 이론, 법규;
- 동차: not a current learner-facing product or commercial catalog; any future treatment requires a separate source, rights, billing, privacy, and roadmap decision.

Today Plan max 3 remains non-negotiable. The prioritization order is due review, recent wrong, confidence gap, pass risk, exam urgency, missed recently, and weak structure. Capture-to-Note is the learner-loop entry before any public historical archive or passive question-bank front door.

## Purpose

The study schedule system defines how Inverge should translate curriculum metadata and learner signals into calm daily execution. This document is a roadmap/reference standard only and does not implement notifications or new product behavior.

## 1차 tracks

### 30-day 1차 track

- Purpose: final compression and 과락 risk protection.
- Daily focus: due review, weakest subject, high-frequency concept nodes, O/X trap repair.
- Best for: learners with prior coverage who need execution discipline.

### 60-day 1차 track

- Purpose: fast rebuild with coverage plus review.
- Daily focus: two subject blocks, O/X retrieval, cloze recall, accounting template repetition.
- Best for: learners with partial coverage and repeated wrong/unknown items.

### 90-day 1차 track

- Purpose: balanced curriculum coverage and spaced review.
- Daily focus: concept node study, retrieval, review queue, and periodic mixed checks.
- Best for: learners starting with moderate time.

### 120-day 1차 track

- Purpose: full operating-system rhythm from foundation to final review.
- Daily focus: foundation nodes, low-pressure retrieval, cumulative review, and 과락 monitoring.
- Best for: beginners or learners rebuilding from low confidence.

## 2차 tracks

### 90-day 2차 track

- Purpose: output-focused rewrite and issue spotting.
- Daily focus: issue spotting, short rewrite, CASIO drill, and one structured feedback loop.
- Best for: learners close to exam day with existing theory exposure.

### 180-day 2차 track

- Purpose: balanced theory, law, and practice answer-writing build.
- Daily focus: rotating subject blocks, answer skeletons, calculation traceability, and rewrite history.
- Best for: learners needing both coverage and production.

### 365-day 2차 track

- Purpose: long-term mastery through spaced writing and cumulative review.
- Daily focus: concept foundation, short production, weekly full answers, and measured ramp-up.
- Best for: beginners and repeat learners rebuilding fundamentals.

## Daily schedule templates

### 30 min

1. Due review: 10 min
2. One retrieval or production task: 15 min
3. Retry/rewrite or scheduled review decision: 5 min

### 60 min

1. Due review: 15 min
2. Primary weak-node task: 25 min
3. Explanation ladder and retry: 10 min
4. Next scheduled review setup: 10 min

### 90 min

1. Due review: 20 min
2. Main task block: 40 min
3. Secondary repair task: 20 min
4. Summary, retry/rewrite, and schedule: 10 min

### 180 min

1. Due review: 30 min
2. Deep work block 1: 55 min
3. Deep work block 2: 55 min
4. Mixed retrieval/rewrite: 25 min
5. Recovery and schedule adaptation: 15 min

## Prioritization rules

Today Plan ordering should consider:

1. **Due review**: due items come first unless there is severe imminent 과락 risk.
2. **Confidence**: low-confidence items rise in priority.
3. **Wrong/unknown**: wrong and unknown items outrank merely slow items.
4. **과락 위험**: subjects or units creating fail-line risk are protected.
5. **Exam date**: nearer exam date compresses breadth and raises high-yield repair tasks.
6. **Recent missed tasks**: missed review or rewrite tasks re-enter with recovery language, not shame.

## Today Plan max 3 rule

Today Plan must show **max 3** primary tasks. If more than three tasks compete, the system should collapse them into the best default next action plus at most two supporting actions. The learner must have easy override options.

## Morning brief logic

A morning brief should be a calm planning surface, not a pressure notification. It should include:

- one sentence about today’s study risk or opportunity;
- up to three Today Plan tasks;
- due review count without shame language;
- one recovery option if yesterday was missed;
- one capture reminder only when recent captures are stale;
- an explicit override such as “오늘은 30분만 하기”.

Morning brief behavior must avoid fake urgency, ranking pressure, casino-style gamification, and addictive streak mechanics.

## Verification policy

Schedule labels and subject assumptions must be connected to curriculum metadata that has Q-Net/current official notice verification before production use.

## Study schedule kernel v1 addendum

Inverge is not a question archive. Study tracks convert curriculum metadata and learner signals into a calm Today Plan max 3 operating contract.

- Capture-to-Note is the front door; schedule decisions should start from captured learner traces and derived metadata.
- 20-year past papers are reference metadata, not the product front door.
- Curriculum nodes are the basis for Today Plan, Review Queue, O/X, cloze, calculation, and rewrite.
- The schedule kernel ranks due review, recent wrong, confidence gap, pass risk, exam urgency, missed recently, and weak structure.
- Raw user OCR/problem/answer text must remain user-owned service data. Derived metadata/signals may drive product behavior after sanitization.
- Official syllabus, exam calendar, and current public notices require Q-Net/current official notice verification before production use.

## PR #339 curriculum-anchored capture candidates

PR #339 adds helper-level curriculum-derived Today Plan and Review Queue candidates from Capture-to-Note signals.

- Capture-derived candidates are ranked with existing study schedule ranking before display, and Today Plan remains capped at max 3 primary tasks.
- Due review and recent wrong/unknown work outrank generic new study. Low confidence or confident-wrong metadata raises priority without shame language.
- In 2차, weak structure, missing issue, or paragraph weakness raises rewrite priority; 실무 calculation/CASIO priority is used only for calculation-like captures.
- Visible Today Plan titles are derived action summaries from subject, curriculum topic, gap label, next action, and estimated minutes, not raw problem/question text.
- This remains metadata-only and does not enable durable production rollout, live notification, payment, public archive, or new exam behavior.

## PR #340 learning state priority addendum

PR #340 extends schedule and Today Plan priority with curriculum-anchored personal learning state metadata.

- State update candidates are metadata-only and contain no raw learner text. They record concept node, prior/next status, reason, priority delta, confidence delta, source event type, and a next review candidate.
- Learning state is not official grading, scoring, pass/fail prediction, official model-answer comparison, or 합격 보장. It is a deterministic operations signal for selecting the next task.
- The learner owns raw capture/rewrite/answer text. The schedule layer may consume sanitized state metadata, but raw text must not enter Today Plan candidates, Review Queue candidates, or reference corpus storage.
- Priority order now accounts for concept state risk: `confident_wrong` > `wrong` > `confused`; due `recovering` review beats generic new study; `stable` is lower priority unless a scheduled review is due.
- OCR-pending captures must surface OCR confirmation before concept practice. Pending OCR cannot improve a concept to `stable`.
- The max-three visible Today Plan rule remains non-negotiable, and durable Today Plan rollout remains gated/off by default.

## PR #342 adaptive study planner v1 addendum

PR #342 adds the adaptive study planner layer that turns personal learning state metadata into a live Today Plan and weekly study preview.

- The planner uses durable personal learning state metadata when available, or in-memory/source-union candidates when durable reads are unavailable.
- Inputs remain metadata-only: personal concept state, curriculum node importance/risk, due review signals, capture-confirmation candidates, learner availability, and missed-day count.
- Today Plan remains capped at **max 3** visible primary tasks. When `dailyAvailableMinutes` is small, the planner shrinks task minutes instead of adding more tasks.
- Ordering prefers due review over new study, `confident_wrong` over `wrong`, `wrong` over `confused`, and due `recovering` review over stable new study.
- High-risk and high-importance curriculum nodes raise planning priority without making official grading, score, pass/fail, model-answer, or guarantee claims.
- Missed-day recovery uses calm recovery copy: missed work is treated as a scheduling signal, not shame or fear pressure.
- Weekly plan preview is helper-level metadata only: max 3 focus lines, target concepts, recovery items, and estimated total minutes.
- The planner does **not** send push notifications and does not add native app behavior.
- Production durable rollout remains gated/off by default.

## PR #346 official-source verification dependency

Study schedule metadata remains Inverge learning-operation guidance unless a schedule or exam metadata node is verified against Q-Net/current public notice or another registered official source. Production use requires verified or explicitly draft-safe nodes, while closed beta can use draft schedule nodes only as guidance.

The schedule system must not imply official scoring, official answer status, pass/fail outcomes, score prediction, or 합격 보장. Time-sensitive public-notice and exam-calendar facts should move to `needs_update` when the manual recheck date passes.

## 2026-07-26 Full-Day Native and Optional Optimizer Contract

The executable source is
`config/dabangil-full-day-scheduler-contract.json`. S234R adds contracts and
validators only; it does not install OR-Tools, change schedule runtime, write
learner data, or activate any flag.

### Native path

`S237A -> S237P -> O4A -> S238A -> S240A -> S241A`

The native planner remains authoritative for Owner-private authenticated
acceptance. It owns plan validity, max-three visible priorities, hard-window
and availability compliance, deterministic fallback, explanation, manual
edit/replan, and rollback. OR-Tools is not a dependency of S238A, S240A, or
S241A.

### Optional optimizer path

`S237P -> S237O -> O4T -> O2O -> S238OH -> S238OV -> O4P -> S239O -> S240O`

The optional CP-SAT adapter may receive only metadata-only ExecutionBlocks:
ephemeral opaque block IDs, closed-enum type/subject/priority, durations,
allowed windows, precedence edges, split rules, and hard/soft constraint
metadata. It must not receive user/account/document IDs, raw question,
answer, OCR, reference-answer, Law or AI bodies, free text, private locators,
reusable plaintext digests, or cross-plane equality tokens.

The prior-schedule/provenance object is a closed trusted-native-gateway input,
not an OR-Tools payload. The gateway completes authoritative lookup and
cryptographic validation, derives the cutoff, then creates a one-request
projection containing only freshly remapped ephemeral request/snapshot/
candidate/window IDs, windows, fixed blocks, candidates, cutoff, immutable
elapsed/in-progress placements, and soft future-placement preferences.
Store/scope/lineage references, acceptance sequence, head/tree/date,
receipt/bundle references or digests, and O4V/S236P/O4A bindings are stripped
before optimizer invocation. The isolated solver and transient IPC stay
inside the trusted native gateway. A solver-originated projected response
contains only exact request/snapshot correlation echoes, a raw solver-owned
status, objective/violation diagnostics, elapsed timing, and candidate-plan
fields for `OPTIMAL` or `FEASIBLE`. It cannot contain, accept, require, select,
reference, authorize, or release fallback state, `native_plan_version`, a
canonical native plan, a canonical plan reference, `version_info`, or any
gateway-owned version/configuration field. Timeout/dependency/adapter/schema/
correlation/validator classifications, canonical fallback state, and canonical
version metadata are trusted-gateway-owned.

For `OPTIMAL` or `FEASIBLE`, the gateway validates the complete projected
candidate-plan response against the separate closed projected-ID result
contract and exact invocation request/snapshot IDs, validates the per-class
bijections, and inverse-maps only the six declared request, snapshot,
execution-block candidate/window, unassigned-candidate, and
violation-candidate paths. It preserves every solver-owned non-ID value and
array cardinality/order. Only after complete raw-response, exact-correlation,
and required-bijection validation does it construct canonical `version_info`
field-for-field from exact trusted correlated configuration, using exactly
`contract_version`, `native_policy_version`, `adapter_version`,
`optimizer_version`, `objective_version`, `threshold_version`, `solver_seed`,
`solver_workers`, `time_limit_ms`, and `integer_scaling_version`. It then
constructs canonical
`used=false/reason_enum=not_used/native_plan_version=null` and validates the
complete canonical result and native hard constraints before release.
Canonical fallback state and canonical `version_info` are exactly the two
gateway-constructed exceptions to projected/canonical non-ID equality.
For a projected solver failure envelope or a direct gateway failure classified
before a candidate plan exists, the projected attempt carries no candidate plan
or canonical fallback/version state. A direct gateway failure cannot fabricate
a projected response and must validate its retained exact
invocation/configuration binding. A gateway classification raised while
validating an `optimal` or `feasible` candidate-plan attempt instead discards
that plan and any constructed `used=false` tuple without release; late
canonical/native rejection is `validator_rejected`. Missing, ambiguous, stale,
untrusted, or mismatched canonical version metadata is also
`validator_rejected`. Every path enters the same failure branch exactly once.
The gateway independently resolves or prepares exactly one immutable native
fallback in the canonical original-ID domain, constructs its exact trusted
canonical ten-field `version_info` and `used=true`
exact-trigger/non-null-version tuple, and separately validates the complete
canonical result. A missing, unavailable, or invalid fallback, including
invalid canonical version metadata, yields only
`blocked_manual_plan_required`; recursive fallback is forbidden.

The mapping remains in gateway memory until every required projected-response
validation and inverse mapping finishes, is destroyed on every success or
failure after applicable canonical/native validation and before a canonical
result leaves, and is never retained after gateway exit. Projected IDs may not
enter logs or artifacts; only an identifier-free replay-input digest receipt
may be materialized after destruction. The adapter cannot resolve or access
the authoritative, identity, receipt, authorization, or provenance planes.
The projection contract has exact top-level and nested field schemas plus an
exact source-field map. Request, snapshot, window, fixed-block, and candidate
IDs use a per-request one-to-one remap; allowed-window, prerequisite, fixed
block, and prior-placement references must use the same bijections with no
dangling, duplicate, or cross-class ID. Non-ID values and array cardinality/
ordering remain equal to the validated gateway input. The cutoff is `null`
only for a verified genesis/no-schedule checkpoint and otherwise equals the
signed server cutoff. Any mapping or schema failure blocks manual planning
before OR-Tools sees a payload. The gateway retains canonical
`study_date_kst`, which never enters the optimizer projection. For every block
in a projected `optimal`/`feasible` candidate, complete canonical result, or
releasable canonical native fallback, it resolves the candidate exactly once
and derives `block_end_utc` from `study_date_kst + end_minute_kst` in IANA
`Asia/Seoul`; `end_minute_kst=1440` means next-day 00:00. A non-null exact
ISO-8601 UTC `hard_deadline_or_null` requires
`block_end_utc <= hard_deadline`, while `null` means no hard cutoff. Candidate
mapping faults remain `schema_mismatch`; a known late block is
`validator_rejected` and attempts the same single independent canonical native
fallback. `minimize_deadline_lateness` reads only `soft_deadline_or_null` and
cannot override the hard constraint. Elapsed and in-progress placements must
pass this predicate before projection and may not be moved, dropped,
unassigned, shortened, extended, or rewritten to repair a breach.

Gateway input, optimizer projection, projected solver response, and canonical
gateway result are distinct closed-world schemas. Top-level request/result,
candidate, available-window, fixed-block, execution-block, unassigned,
objective, and violation fields are exact allowlists in every applicable
schema; version and fallback fields exist only in the canonical gateway result.
Unknown or nested extra fields fail closed. Window/block identifiers are
ephemeral, minute bounds are numeric, enums are closed, and calendar titles,
locations, filenames, free-text reasons, or stable identities are forbidden.
Input may carry one metadata-only prior accepted schedule for midday
replanning and churn measurement, but it is not client-optional when the
Owner-private authoritative store has an accepted schedule for that study
date. The server performs a fresh signed lookup, loads the exact latest
non-superseded monotonic lineage, and rejects an omitted, older, superseded,
invalid, expired, or revoked snapshot as `blocked_manual_plan_required`.
`null` is accepted only when that same lookup cryptographically attests that
no accepted schedule has ever existed: the signed acceptance high-water mark
must be zero. Once positive, the high-water mark never returns to zero.
Supersession is atomic only with acceptance of sequence+1; deletion retains a
signed tombstone/high-water mark and an unresolvable latest snapshot blocks
manual planning rather than becoming “no schedule.”

The signed schedule binds exact accepted head/tree, native-plan and input
versions, opaque store/scope/lineage references, acceptance sequence and
previous digest, the same study date, and the immutable placement projection
of candidate/window/start/end/duration. Derived placement state is not stored
or signed. The canonical schedule digest excludes Owner acceptance time and
lineage so the native validator can sign it before Owner acceptance; the
subsequent Owner receipt and provenance bundle bind that digest together with
acceptance time, authoritative store/scope, lineage and sequence. Separate
closed DSSE native-validator and authenticated Owner receipts, plus a distinct
signed provenance bundle, bind the resulting chain. The
private store and trust material must match approved O4V and completed S236P;
issuance and runtime use must separately match exact O4A. Neither authority
substitutes for the other.

The server derives `replan_requested_at` and converts it with IANA
`Asia/Seoul`. The cutoff is the clamped minute-of-day ceiling: an exact-minute
instant is unchanged, while any non-zero second or fractional second advances
one minute, including a clamp to 1440 after 23:59. At replan, a fresh signed
lookup/verification receipt rechecks the bundle and both receipts, their
keys/trust roots/expiry, and authenticated revocation evidence no more than
300 seconds from the request. Placement state is then recomputed from signed
bounds. Elapsed and in-progress blocks retain the exact
candidate/window/start/end/duration and cannot be moved, shortened, dropped,
or duplicated; no new block may start before the cutoff. Only future
placements are eligible for churn-aware replanning. The prior schedule cannot
select CoreOutcomes or tasks, override current availability/fixed
blocks/pins/native priority, or introduce a current candidate/window. A prior
placement whose candidate or window is absent from the current input fails
closed to `blocked_manual_plan_required` before optimizer projection. Removal
churn is measured only for prior placements whose candidate and window both
resolve through the exact current-input bijections.
The lookup also signs a monotonic, non-reusable per-scope generation, a
cryptographically random request nonce, and the ref/digest of the latest
signed authoritative-state checkpoint. The checkpoint is an append-only hash
chain in a rollback-resistant store outside the latest-pointer rollback
domain. Genesis is valid only at generation/high-water zero with no lineage,
latest schedule, or previous checkpoint; active and tombstoned checkpoints
retain the exact high-water/lineage/latest tuple. Immediately before
projection, the server atomically compares the full
decision/store/scope/date/generation/high-water/checkpoint/lineage/latest/
receipt tuple, consumes the nonce, and authorizes projection in the same
transaction. A restored historical genesis, broken checkpoint chain, stale
receipt, or mismatch fails closed. Every create, supersede, tombstone, delete,
rollback, or restore latest-pointer mutation increments the generation and
appends exactly one checkpoint.

S237O authorization is a non-cyclic chain: a canonical exact proposal, a
separate immutable signed Owner approval record over that proposal, then a
final approved-authorization digest over the validated approved packet. The
Owner receipt never signs the final digest. Ready, approved, or rejected
artifacts are materialized in the exact metadata-only authorization store,
not committed into the Git head/tree they bind. Authorization, attestation,
revocation-evidence, and Owner-decision store references and policy digests
are exact packet bindings.
The proposal also binds the authenticated Owner-private scope digest and
exact opaque Owner-decision actor ID. The approval record and resolved DSSE
receipt must agree on decision, proposal, decision time, receipt reference,
and receipt digest; a signed rejection can never satisfy an approved packet.
The current pending proposal digest is
`c72b60bb0543589673a26d177e762aca8eccd794c4b4c3bd58062329352a9662`.

S237O itself has a closed acceptance envelope. It binds exact head/tree,
Python and OR-Tools versions, dependency lock, license text and SBOM digests,
adapter/config/policy/objective versions, deterministic seed/workers/time
limit/scaling, isolation/no-network policy, fixture/result digests, native
fallback proof, rollback proof, and metadata-only proof. Six exact receipts
must pass once each with one run ID, exact head/tree/config, closed result,
assertion-evidence digest, attestor/provenance, and independent-verifier
attestation. The receipt-set digest is part of canonical S237O evidence and
O4T must bind both the accepted evidence and receipt-set digests. This
amendment installs no package and authorizes no benchmark execution.

The receipt-set digest orders the exact six receipts by operation ID and
canonicalizes their exact fields after normalizing only the receipt-set and
independent-attestation digest slots to `null`. Each receipt and the evidence
carry that result. Each operation also has an exact fixture, required
subassertion list, assertion count, and canonical assertion-policy digest.
The deterministic receipt requires a fixed seed, exactly one worker, three
cold and three warm replays over byte-identical input/config inside one
explicit six-process benchmark projection session, and
byte-identical canonical status/placements/unassigned/objectives/violations/
fallback after excluding only `elapsed_ms`. The session reuses one fresh
in-memory ID bijection only for those six processes and retains it through all
six complete projected-response validations, exact inverse mappings,
canonical-result validations, and native validations. It destroys the mapping
and projected identifier material after the sixth complete path on success or
after failure classification and validated fallback preparation on failure,
always before any canonical result set leaves the gateway, and never reuses
the mapping in another session. The later bundle's projected replay-input
child is an identifier-free digest receipt; projected bytes and IDs never
enter the artifact. Any mismatch fails S237O. The current
assertion-policy digest is
`d1616bbc8c7681c19b42bdffc86e0d5e34a62710bf9ba727fe5355ca0ad69da8`.
Two additional canonical projections bind the six per-receipt assertion
evidence digests and primary-attestor provenance digests, in operation-ID
order, to both evidence and the independent signed payload. The benchmark
result reference resolves one immutable content-addressed compound bundle.
It contains the exact closed outer result, projected replay input, authorized
replay config, six-result set, complete failure-status set, rollback result,
and metadata-boundary result. Every child is schema-validated and hashed from
RFC 8785 bytes; the native-fallback set digest is recomputed as an exact
projection of the failure set. Unresolved, missing, extra, cross-run, or
digest-mismatched children fail closed. The outer reference and digest are
also in evidence and the independent signed payload.

Independent verification is a closed metadata-only DSSE
signed artifact: its canonical payload binds head/tree, adapter config, run,
exact S237O authorization, assertion policy, receipt set, evidence preimage,
primary attestor, verifier identity, verification key/trust root/signature
algorithm, issue/expiry time, revocation policy/evidence/status, provenance,
and assertion evidence. These outer values must equal the signed payload. The
verifier must differ from the primary attestor by class and opaque identity;
the exact S237O authorization must bind its package/config plus attestation
store, verification key, trust root, signature algorithm, and revocation
policy. Acceptance independently recomputes the signature/trust path and
fresh authenticated revocation status and requires an unexpired,
unrevoked `signature_verified=true` artifact. The evidence preimage
canonicalizes the otherwise-complete evidence with only the independent
attestation slot set to `null`, avoiding a self-reference; the final evidence
digest then includes the verified artifact digest.
The final S237O authorization digest is not a bearer token: the exact signed
Owner decision receipt is re-resolved from its approved store and its
signature, trust path, expiry, and fresh revocation evidence are revalidated
at benchmark start and again at acceptance. Packet expiry cannot outlive that
receipt.

The isolated solver returns only exact correlation echoes, its raw status,
objective/violation diagnostics, elapsed timing, and a candidate placement for
`OPTIMAL` or `FEASIBLE`; it returns no fallback reason, canonical fallback
state, `version_info`, or gateway-owned version/configuration field. After
complete raw-response, exact-correlation, and required-bijection validation,
the gateway alone constructs the canonical exact ten-field `version_info` from
the trusted correlated configuration. Native validation is authoritative. A
non-droppable candidate is exactly one with `pinned === true` or
`can_drop === false`; it must occur exactly once in execution blocks and never
in unassigned candidates, regardless of reason or `requiredness_enum`. Every
block must resolve one candidate and one window through the exact invocation,
use a window in that candidate's `allowed_window_ids` whose `available` value
is true, and satisfy
`window.start <= block.start < block.end <= window.end` within that single
referenced window. Adjacent-window stitching is forbidden.

Unknown, duplicate, cross-domain, or non-bijective candidate/window relations
fail as `schema_mismatch`. Known disallowed, unavailable, or out-of-bounds
relations fail as `validator_rejected`. Elapsed and in-progress prior
placements must pass the same current relation before projection and cannot be
moved, dropped, unassigned, shortened, extended, or rewritten to repair an
incompatibility. They must also pass the hard-deadline predicate before
projection without repair. Using retained, unprojected canonical
`study_date_kst`, every projected optimal/feasible, complete canonical, and
releasable fallback block derives its UTC end from `end_minute_kst` in IANA
`Asia/Seoul`, with `1440` as next-day midnight. Every non-null UTC hard
deadline requires end-at-or-before equality; `null` has no cutoff. A known
breach is `validator_rejected`, while resolution/mapping faults are
`schema_mismatch`; soft deadline lateness cannot override either result.
Dependency-unavailable, invalid input/output, timeout, infeasible, error,
failed version construction, or failed native validation invokes exactly one
separately prepared and validated canonical native fallback and never makes
OR-Tools a native-path dependency. The fallback must carry gateway-constructed
canonical ten-field version metadata and satisfy the same hard deadline. If
that fallback is invalid, the result fails closed as
`blocked_manual_plan_required`.

Contract fixtures cover 30, 60, 90, 180, 600, and 720 available minutes plus
zero capacity, partial windows, rollover, over-capacity, unsatisfiable
precedence, locked blocks, conflicting windows, timeout, and malformed
candidate output. O4T must approve an exact versioned threshold packet after
the benchmark; native-validator candidate-schedule acceptance, latency,
edit-distance, manual-edit, constraint, and fallback thresholds cannot be
silently or retroactively weakened. Candidate-schedule acceptance measures
placements accepted by the native validator and grants no CoreOutcome or task
selection authority.
The pending packet is
`o4t-s237o-owner-private-schedule-thresholds-v1`. It is unapproved and
non-approvable until exact S237O evidence/head/tree, adapter/optimizer/config
versions, every value/unit/comparator, effective date, evaluation window, and
canonical digest plus exact private Owner-decision store/scope/actor/key/
trust-root/revocation bindings are populated. O2O and S238OH must bind the
final approved threshold-binding digest and revalidate its closed DSSE Owner
decision receipt at start and acceptance; a proposal digest, status flag, or
bare 64-character receipt claim cannot authorize either stage. No wildcard
or automatic shadow transition is allowed.
Before either stage may start, the immutable approved packet must be written
under that final digest in the exact private O4T packet store bound by the
packet's Owner-decision store reference and policy digest. O2O and S238OH must
resolve the packet from that exact store at both start and acceptance,
recompute the canonical digest, validate the exact packet schema and approval
record, and revalidate the current DSSE receipt and revocation state. A missing,
ambiguous, duplicate, store- or policy-mismatched, digest-mismatched, or
invalid-receipt lookup fails closed.
The first store coordinates cannot come from the packet being looked up.
Each stage first verifies a current, unrevoked, replay-protected signed O4T
control-plane resolver binding that supplies the exact store reference, store
policy digest, and final packet digest. The packet's own Owner-decision store
values must equal those trusted coordinates. Each final-digest key has exactly
one immutable, append-only canonical packet; aliases, redirects, and mutable
overwrites are forbidden. Both start and acceptance recheck `approved` status,
`ownerApproved=true`, approval-record/receipt equality, packet expiry, and the
receipt signature, trust path, expiry, and revocation. A wrong resolver binding
or mutable, redirected, stale, or expired object also fails closed.
The resolver is itself a closed DSSE artifact and signed payload, not a status
flag. It signs the exact Owner-private scope, O2O/S238OH audience and purpose,
store coordinates, final digest, externally resolved registry/key/root
versions and algorithm, issue/expiry times, single-use nonce, monotonic
generation, and revocation evidence. Its trust-anchor registry is resolved
from authenticated Owner-approved O4T control-plane configuration before the
artifact; neither the artifact nor threshold packet may choose a key or root.
Outer and signed fields, payload/envelope/artifact digests, registry bindings,
signature, scope, nonce/generation, expiry, and revocation are recomputed at
every start and acceptance. Unknown keys, untrusted roots, unsigned or
mismatched payloads, cross-scope use, replay, or stale revocation evidence fail
closed.
Its current pending proposal digest is
`60d62b97c50771402f70a88275d58a385ed7ee7bd2a6de28db48066f99b59a63`.
The digest normalizes only status, `ownerApproved`, its own proposal-digest
slot, and the separate approval record to `null`. Approval is valid only when
that immutable record references the same digest, includes decision time and
Owner decision-receipt reference/digest, is unexpired, exactly matches the
signed decision/proposal/head/tree/S237O evidence/threshold/evaluation-window
bindings, and every finite threshold value is complete.
O2O is required before shadow and may authorize only closed, no-free-text
Owner-private comparison metadata with exact retention/deletion. Shared
Signal, telemetry, external-learner, and Academy measurement remain
prohibited without generic O2. Owner-hidden shadow precedes Owner-visible
comparison; neither changes canonical schedule or product state. O4P is
required before limited Owner-only activation and additionally requires
completed native S240A. Native and optimizer acceptance remain separate.

Notebook, Full-Day, and learning-policy runtime mutations are frozen from D0
through D+1 so acceptance evidence is not invalidated mid-window.
