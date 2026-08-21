# 답안길 Post-#650 Unified Program Contract

- Contract version: `dabangil.unified_program.v4`
- Current exact-scope Owner decisions:
  `docs/decisions/2026-08-21-owner-wcv-c3r-a1-serial-program-authority.md`
  for the source-only C3R-A1 serial program and post-merge C3R-P selector,
  `docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md`
  for the immutable upstream PostgreSQL migration-dependency authority,
  `docs/decisions/2026-08-14-owner-unified-product-multisurface-launch.md`
  for the final public product, future Web/iOS/Android and instructor
  surfaces, free-limited launch, separate paid/evidence route, and coordinated
  release,
  `docs/decisions/2026-08-14-wcv-c2-structural-recovery.md`
  for PR #716 terminal closure and the serial WCV-C2R replacement chain,
  `docs/decisions/2026-08-11-owner-accelerated-vertical-slice-authority-roadmap-reconciliation.md`
  for unaffected WCV campaign delivery and roadmap reconciliation,
  `docs/decisions/2026-07-30-owner-o4v-lean-owner-private-gate.md` for lean
  O4V, and
  `docs/decisions/2026-07-29-owner-o3a-golden-3-approval.md`
- Current Owner amendment:
  `docs/decisions/2026-07-26-owner-dogfood-private-plane-schedule-amendment.md`
- Prior Owner decision for unaffected scope:
  `docs/decisions/2026-07-23-post-650-unified-program-reset.md`
- Machine-readable mirror:
  `config/dabangil-unified-program-contract.json`
- Live status and dependencies: `roadmap/active-program.yml`
- Scope: contracts and roadmap only

## 1. Canonical authority

Use this order when sources conflict:

1. a dated Owner decision record for the exact decision it owns;
2. this cross-track unified program contract;
3. `docs/inverge-second-round-final-product-spec.md` and
   `docs/dabangil-second-exam-premium-os.md` for second-round detail;
4. versioned executable/domain contracts for behavior already implemented;
5. `roadmap/active-program.yml` for current primary status, dependencies,
   priority, flat lock group, and WIP;
6. `AGENTS.md` and `config/agent-risk-policy.yml` for operating and risk rules.

Live GitHub and the current tree are authoritative for implemented state.
Attachments, handoffs, issue prose, and old prompts are inputs, not live state.

### Superseded and subordinate map

| Source | Current use |
|---|---|
| 2026-06-25 first-round hard-freeze clauses | Superseded only for Foundation; runtime and exposure gates remain |
| July 16 control plane and execution prompt pack | Historical; never rerun |
| July 22 #644 handoff | Historical; not operational truth |
| Full-Day addendum and paid-beta plan | Inputs subsumed into this contract |
| Attached Post-#650 v3 plan | Owner input; stale live snapshot and embedded prompt are not canonical |
| Attached Owner-dogfood/OR-Tools v4 addendum | Owner input; only the bounded 2026-07-26 decision is canonical, and its accidental linear optimizer dependency is rejected |
| `docs/inverge-master-roadmap.md` | Historical phase detail below this contract |
| `docs/inverge-product-constitution.md` | Historical kernel detail below this contract |
| `docs/inverge-curriculum-system.md` | Legacy compatibility metadata until a new verified Foundation registry exists |
| `docs/inverge-study-schedule-system.md` | Legacy templates, not first-round runtime authority |
| `docs/inverge-business-model.md` | Target catalog history; activation still gated |
| ULC-0 / Issue #719 | Mandatory subordinate V13 launch amendment; authority installed, no runtime started |
| S222 completion | Academy source-contract history, not live Academy service readiness |
| S223/S224 completion | Historical source/runtime contract acceptance, not current content, commercial, or efficacy readiness |
| `o4v-s234r-owner-private-plane-binding-v1` | Rejected and superseded 88-field enterprise packet; never materialized and cannot authorize work |

The scoped supersession does not weaken existing second-round public-launch,
rights, source, legal-version, calculation, privacy, or authority safeguards.

## 2. Product sequence

The current Owner-private path is:

```text
S234R program amendment
├─ O3A exact Golden rights/source/version/purpose decision
└─ O4V lean Owner-private Supabase boundary decision
   └─ S236P synthetic-only private-plane acceptance

O3A + S236P
→ S236A owner-private Golden 3
→ S237A owner-private second-round Study OS core
→ S237P Full-Day native planning contract
→ O4A Owner-private runtime and dogfood activation approval
→ S238A native planner baseline dogfood
→ S240A native extended dogfood acceptance
→ S241A Owner-private authenticated acceptance
```

O3A and O4V are separate branches. O3A does not provision the private plane,
O4V does not approve content rights, S236P uses synthetic data only, and
S236A requires both a valid O3A decision and the exact completed S236P.

The optional schedule-optimizer branch starts after S237P:

```text
S237P
→ S237O isolated OR-Tools benchmark
→ O4T exact threshold decision
→ O2O exact Owner-private comparison measurement/retention decision
→ S238OH Owner-hidden shadow
→ S238OV Owner-visible comparison
→ O4P limited-activation approval
→ S239O Owner-only limited activation
→ S240O optimizer dogfood acceptance
```

There is no optimizer dependency on S241A. Native acceptance can complete
with OR-Tools uninstalled, failed, rolled back, or permanently disabled.

External invitation cohorts, payment, pricing, refunds, capacity, support,
Golden 9 external review, and commercial validation are a separate deferred
track after Owner-private acceptance. That track remains a prerequisite of
future O4D/S225 public self-serve; it is not a prerequisite of S241A and is
not completed by Owner dogfood.

First-round Foundation may proceed in a bounded parallel lane. First-round
runtime, navigation, pricing, learner claims, and public exposure are not
authorized by Foundation.

Both-track begins only after separately proven authenticated first-round and
second-round acceptance. Roadmap item `S238B` is consumed by `ULC-F1`;
roadmap item `S241A` is consumed by `ULC-M1`. Neither gate substitutes for
the other, and mastery never transfers between tracks. Academy runtime begins
only after a named-partner packet and explicit Owner approval.

The repository still contains legacy first-round compatibility routes and
code. This reset neither audits nor removes them and must not claim runtime
absence. Their presence is not authorization for new activation or exposure.

## 2A. WCV campaign delivery overlay

V13 remains the sole active master. The Appraiser Second World-Class Vertical
Execution Standard `1.0.8` is subordinate to V13 and retains its complete
behavior, safety and activation baseline. The 2026-08-11 Owner decision changes
the delivery model and WCV campaign graph for unaffected scope. The
2026-08-14 Owner decision supersedes only the failed C2 atomic delivery shape
with the exact serial WCV-C2R structural-recovery chain.

### One merge-producing writer

At every point in time, there is at most one merge-producing Work, one writing
branch, one writing PR and one writer. Read-only research and non-overlapping
inspection may run concurrently inside that Work.

The roadmap runner counts a `blocked` item as occupied WIP. CPF-1 and S236P are
both truthfully blocked. `program.wipLimit` is therefore three: two blocked
control-plane reservations plus exactly one merge-producing delivery slot.
This capacity is not permission for three writers. The WCV items use one flat
lock group and a dependency chain; the global merge-producing writer limit is
one. Both executable roadmap selectors enforce that explicit cap within each
parsed plan, including across distinct lock groups and after either blocker
clears. This is not a cross-process distributed writer lease; the Owner
single-writer prohibition remains controlling across independent Work windows.

### Complete vertical and closure rule

A complete runtime vertical keeps these required layers in one PR and rollback
unit:

```text
contract and machine validation
+ API and storage/persistence
+ runtime logic
+ learner UI
+ focused/hostile tests and applicable runtime evidence
+ feature flag and safe-deferred behavior
+ rollback evidence
```

One PR may close multiple adjacent child issues only when they form one
learner-visible outcome, one independently testable acceptance story, one
deployment/rollback unit and one coherent data/privacy boundary. The PR body
lists every included issue and maps every acceptance condition. A source-only
artifact cannot establish runtime readiness.

Do not create a mandatory contract-only precursor for behavior implemented by
the same vertical. If the outcome is too large, reduce the learner outcome
without splitting its layers.

For WCV-C2 recovery only, the 2026-08-14 decision is the exact authorized
exception: PR #716 proved that Practice, Theory and Law carry different typed
proof obligations. The prior atomic #702–#705 single-PR requirement is
superseded by two independently complete source-contract outcomes followed by
three subject-complete learner-visible runtime verticals. This exception does
not permit a validator-only, fixture-only, persistence-only, API-only or
UI-only runtime stage and does not weaken the complete-runtime-vertical rule.

### Bounded review

Finish the complete vertical and focused/runtime evidence before review. Then
request one exact-head full-vertical review, batch blocking findings into at
most one corrective pass and perform at most one bounded exact-head correction
verification. P0/P1 always block. A P2 blocks only for an explicitly named
core safety, rights, privacy, evidence, learner-outcome or rollback invariant;
other P2/P3 findings go to backlog. A remaining core blocker returns the PR to
Draft and stops the campaign for resize or structural recovery. Recursive
review/correction cycles are prohibited.

### Campaign map

| Campaign | Lead | Included issues | State after C1 | Outcome |
|---|---:|---|---|---|
| C1 | #713 | #713 | completed source-only on reconciliation merge | authority and roadmap reconciliation; runtime mutation zero |
| C2 | #717 | #702, #714, #703, #704, #705 | terminal Law candidate #764; complete only after expected-head merge and validated receipt | C2R-A through C2R-C-L: two source contracts and three complete subject runtime verticals |
| C3 | #706 | #706–#708 | authorized unstarted after validated terminal C2R-C-L receipt | frozen D+1, sealed D+7, recurrence/reopening, Ledger, recurring deduction and Today/Full-Day |
| C4 | #709 | #709–#710 | queued behind ULC-I1 and the complete ULC pre-proof chain | Owner proof, red-team, baseline and invitation-only commercial readiness; no activation |
| C5 | #711 | #711 | queued behind C4 and unapproved O4W exact cohort gate after ULC-L1 | frozen paid cohort with real delayed-evidence windows |
| C6 | #712 | #712 | queued behind C5 | verified-bank and bodyless calibration flywheel |

Issue #701 remains the parent program. The exact identifiers are completed
roadmap item `WCV-C2`, completed campaign `C2`, recovery tracker #717,
completed source-only stages C2R-A for Issue #702 and C2R-B for Issue #714,
and completed Practice, Theory and Law stages C2R-C-P, C2R-C-T and C2R-C-L
for Issue #703 under expected-head-merge-and-receipt semantics. The current
dependency-ready non-Production selector is roadmap item `WCV-C3`, campaign
`C3`, lead Issue #706, authorized but unstarted. Issue #714 remains open: only
its C2 allocation is complete, while C3, C4 and C6 remain preserved. The
canonical tuple is `WCV-C3 / C3 / #706 / authorized_unstarted`.

`launchConvergenceAmendment`, `wcvCampaignOverlay`, `roadmapContract`, the ULC
preserved-current-authority mirror and active roadmap must expose one identical
sole next replacement stage.

### C2R serial replacement chain

| Order | Stage | Issue | Scope | Depends on |
|---:|---|---:|---|---|
| 1 | C2R-A | #702 | independently complete rights-safe source-firewall contract | terminal merge of this authority PR |
| 2 | C2R-B | #714 | independently complete cognitive-architecture and typed proof-obligation contract | terminal C2R-A |
| 3 | C2R-C-P | #703 lead; contributes to #704/#705 | complete Practice trusted-repair learner outcome | terminal C2R-B |
| 4 | C2R-C-T | #703 lead; contributes to #704/#705 | complete Theory trusted-repair learner outcome | terminal C2R-C-P |
| 5 | C2R-C-L | #703 lead; terminal #703/#704/#705 closeout | complete Law trusted-repair learner outcome and WCV-C2 closeout | terminal C2R-C-T |

Within the replacement-stage graph, C2R-A has no earlier stage dependency; it
has the separate start gate of this structural-authority PR's terminal merge.
C2R-C-P requires terminal validated merges of both C2R-A and C2R-B. Issue
state or closure cannot substitute for either stage merge.

C2R-A and C2R-B are serial, never parallel, and each is a source-contract
outcome rather than a horizontal runtime layer. C2R-C-P contains in one PR the
shared tutor episode kernel needed by Practice, the typed calculation-relation
validator, matching Practice Golden/Owner-Gold fixtures, all required
persistence/forced-RLS/server/idempotency/CAS, API and learner UI layers,
focused and hostile tests, actual browser → Next → Supabase/Postgres evidence,
a safe-deferred capability boundary and independent rollback. The common
runtime substrate first lands only as part of that complete Practice outcome.

C2R-C-T adds in one PR the typed Theory target-scoped predicate validator,
matching Theory Golden/Owner-Gold fixtures, every necessary
persistence/server/API/UI integration delta, complete browser-to-database
evidence, a safe-deferred Theory boundary and rollback that preserves the
already merged Practice outcome. C2R-C-L does the same for the exact Law
source/anchor/locator/effective-version/applicable-date predicate, with Law
fixtures, necessary integration deltas, complete runtime evidence, a
safe-deferred Law boundary and rollback that preserves Practice and Theory.

C2R-C-P and C2R-C-T may record explicit contributions to #703/#704/#705 but
may not close any of them. Only terminal C2R-C-L may complete #703, #704 and
#705, mark WCV-C2 complete and unblock #706/C3. Common persistence, exposure,
partial-loop, API/UI, fork-safe workflow, shared-shell, checkout-credential and
runtime-boundary regressions first covered by C2R-C-P remain mandatory
inherited regressions in C2R-C-T and C2R-C-L.

The structural-recovery records preserve their original
`automaticStartAllowed: false` fact. The later 2026-08-16 GitHub-native
delivery decision authorizes automatic continuation only for the next
dependency-ready, authorized non-Production stage after protected merge and
receipt validation. The maximum remains one merge-producing writer.

### Non-self-referential regression coverage

PR #756 changes only its 11 assigned C2R-C-P rows to
`candidate_coverage_pending_exact_merge`, with the finding/thread ID, stage,
PR number, exact regression assertion ID and test path, inherited-regression
obligations, and receipt policy
`github_exact_head_pinned_squash_merge_v1`. That declaration is a pre-merge
candidate, not effective coverage. A candidate commit does not record its own
reviewed head/tree or future squash-merge commit when doing so would be
self-referential. Those 11 rows do not become effective before merge and
receipt validation; the other 10 rows remain `uncovered`.

GitHub evidence outside the candidate commit binds the exact covering PR,
final reviewed head/tree, fresh checks, final review anchored to that head,
actionable P0/P1/P2 `0/0/0`, covered finding IDs and regression paths. Merge
is squash-only with the reviewed head supplied as the expected head; a stale
remote head fails closed. The successful operation supplies the merge commit.

The same stage Work then adds exactly one machine-readable
`MergeCoverageReceiptV1` comment to Tracker #717. It indexes the stage, PR,
reviewed head/tree, final review, merge commit/tree, covered finding/thread
IDs, regression paths, base and merged-at time. Live GitHub remains the source
of truth: the PR must be merged from the reviewed head, the live merge commit
must match and be present on `main`, its tree must be compatible with the
candidate evidence, and the final review and checks must belong to the
reviewed head. The tracker comment alone grants nothing.

Effective coverage requires the exact matrix declaration, the named passing
regression on the reviewed head, final review `0/0/0`, expected-head-pinned
merge, a valid live GitHub merge receipt, and the matching tracker index. A
donor test, unmerged candidate, stale review or CI result, false or mismatched
receipt, or tracker prose alone fails closed. Terminal C2R-C-L may publish and
validate its own post-merge receipt and then close #703/#704/#705/#717 and
unblock #706/C3 without a successor repository PR. Missing or invalid receipt
keeps those issues open and C3 blocked; only separately authorized
receipt-only recovery may repair the index.

### #714 durable allocation

| Campaign | Allocated requirement groups |
|---|---|
| C2 | adaptive expertise controller; cognitive-load budget; concept-repair need decision; private typed/photo/PDF/voice/structured artifact modes; concept progression gate and three continue semantics; episode prediction/self-diagnosis; initial fading/control transfer; no upload/view/skip shortcut |
| C3 | longitudinal metacognitive calibration; transfer-distance sequencing; motivation/volition/recovery; durable fading/control transfer; artifact/revision/deferral/export/delete lineage; Today/Full-Day defer/reduce/drop and equivalent-task semantics |
| C4 | Owner proof of instructional-mode/routing quality; over/under-scaffolding and shortcut red-team; baseline metacognitive/autonomy comparison |
| C6 | continuous instructional-mode, fading, transfer-distance, routing-error, metacognitive and control-transfer calibration |

The allocation inventory is machine mirrored. No #714 requirement may be lost
or silently treated as implemented. C2R-B completes only the requirements
allocated to campaign C2 and must leave Issue #714 open. The C3, C4 and C6
allocations remain preserved for their original delivery stages.

The 2026-08-11 atomic C2 requirement and its prohibition on standalone #702
and #714 are preserved as history and are explicitly superseded only for the
C2 structural-recovery stage chain. Tracker #717 is the recovery tracker and
campaign-C2 lead record, not a replacement-stage ID or Issue #702. Standalone
#702 and #714 were authorized only as the serial source-contract stages C2R-A
and C2R-B. Their terminal evidence authorized C2R-C-P; C2R-C-P's protected
merge and validated receipt selected C2R-C-T, and C2R-C-T's protected merge
and validated receipt selected terminal C2R-C-L. PR #764 represents the
post-receipt WCV-C3/#706 authorized-unstarted envelope.

## 2B. WCV-C3R source-only serial program authority

PR #785 installed C3R-A0 at squash/main SHA
`3a7047cf4c7fc68247137bafbca2434abdadbc7f`, tree
`543f8dfb5fdd026c1361e1a502376945912e6c5c`, from reviewed head
`f7f959368525f8a5895026f1361f6e13fd6226e0` with passed required checks,
actionable P0/P1/P2 `0/0/0` and zero unresolved actionable threads. C3R-A1
binds that exact receipt and immutable A0 decision/manifest/analyzer digests;
a reverted or mismatched merge or digest drift fails closed. A1 does not copy
or reinterpret the 25-file migration authority.

After A1's own expected-head-pinned squash merge and validated GitHub receipt,
the exact WCV-C3 runtime order is:

`C3R-P → C3R-T → C3R-L`

C3R-P alone is `authorized_unstarted`. It owns the A0-governed migration-
history reconciliation, common durable/forced-RLS/service-only substrate,
complete Practice outcome, D+1/sealed-D+7/recurrence/reopen, Personal Study
Ledger, Review Queue, Today/Full-Day, restore/export/delete, two isolated
reset/replay cycles and exact Practice browser-to-Postgres evidence. C3R-T is
the complete Theory-only delta and remains blocked on a validated C3R-P merge
receipt. C3R-L is the complete Law-only delta and remains blocked on validated
C3R-P and C3R-T merge receipts.

Every runtime dependency uses the closed `C3RStageMergeReceiptV1`: live merged
PR, exact base/reviewed head/tree, pinned squash and resulting main identity,
passed exact-head checks, a formal review anchored to that head, actionable
`0/0/0`, zero unresolved actionable threads, runtime evidence, bodyless
metadata artifacts, default-off state and zero remote mutation. Issue state,
issue closure, branch state, candidate code/tests, closed-unmerged PRs, donor
CI and tracker prose cannot substitute.

Only C3R-L may complete WCV-C3, close #706/#707/#708/#781, complete Issue
#714 allocation C3 while preserving C4 and C6, advance the selector or publish
the terminal receipt. Every subject independently proves its #706 delayed-
evidence sequence, #707 forced-RLS ledger/bodyless projection/restore-export-
delete boundary and #708 deterministic Review Queue/Today/Full-Day/planner-
separation boundary. A single subject or path closes nothing.

A1 starts no runtime. WCV-C3 remains incomplete; #706/#707/#708/#714/#781
remain open; remote Supabase mutation, Production, payment, learner activation
and successor-runtime-start counts remain zero.

## 2C. Unified product and multisurface launch convergence

The 2026-08-14 ULC-0 decision is a mandatory subordinate V13 launch
amendment led by Issue #719. It is not V14, V13.1, another active master or
the current implementation campaign. Its machine contract is
`config/dabangil-unified-product-multisurface-launch-v1.json`.

The final public product is **답안길 — 감정평가사 1·2차 통합 합격
운영체계**. Student surfaces are exactly Web, iOS/iPadOS and Android. The
complete instructor authoring/review console is Web-primary; student apps may
consume tenant-authorized assignments and approved feedback.

### Preserved current authority

ULC-0 preserves the five-stage WCV-C2/C2 recovery chain, Tracker #717, the
21-row regression matrix and the one-writer limit. Under merge-and-receipt
semantics, C2R-A/#702 and C2R-B/#714 are complete source-only, and C2R-C-P,
C2R-C-T and terminal C2R-C-L for Issue #703 are the complete Practice, Theory
and Law runtime stages. Candidate PR #764 represents WCV-C2 completion only
after its expected-head-pinned merge and validated receipt, at which point
roadmap item WCV-C3, campaign C3, lead Issue #706 is authorized but unstarted.
Issue #714 remains open for
C3/C4/C6. The later GitHub-native delivery decision controls protected non-
Production continuation.

### Free-limited and paid routes

The future ULC-L1 route is free-limited public Web/iOS/Android 1.0. For this
route only, paid Founding Beta and paid-conversion evidence are not
prerequisites. It has no in-app purchase CTA, activates no payment, and grants
no commercial-readiness, retention, efficacy, score-gain, pass-rate or causal
claim. The existing S225/O4D commercial route keeps its prior requirements:
O4D remains `[S245C, S242V]`, while S225 requires both independent terminal
gates as `[O4D, WCV-C6]`.

After ULC-L1, the separate paid/evidence path is:

`O4W → WCV-C5 → WCV-C6 → separate payment/paid-claim activation authority`

Payment continues to require a separate exact Owner decision.

### Future complete outcomes

After terminal C2R-C-L, the controlling launch sequence is:

`WCV-C3 → ULC-M1 → ULC-M2 → ULC-K1 → ULC-F1 → ULC-F2 → ULC-F3 → ULC-F4 → ULC-F5 → ULC-I1 → WCV-C4 → ULC-R1 → ULC-L1`

The active roadmap encodes the complete free-launch and later paid/evidence
order with these exact direct dependencies:

```yaml
WCV-C3: [WCV-C2]
ULC-M1: [WCV-C3, S241A]
ULC-M2: [ULC-M1]
ULC-K1: [ULC-M2]
ULC-F1: [ULC-K1, S238B]
ULC-F2: [ULC-F1]
ULC-F3: [ULC-F2]
ULC-F4: [ULC-F3]
ULC-F5: [ULC-F4]
ULC-I1: [ULC-F5]
WCV-C4: [ULC-I1]
ULC-R1: [WCV-C4]
ULC-L1: [ULC-R1]
O4W: [ULC-L1]
WCV-C5: [WCV-C4, O4W]
WCV-C6: [WCV-C5]
O4D: [S245C, S242V]
S225: [O4D, WCV-C6]
```

WCV-C3 retains `terminalReplacementDependency: C2R-C-L` while its active
roadmap dependency remains the WCV-C2 umbrella. WCV-C5 intentionally retains
both direct dependencies even though O4W is downstream of ULC-L1.
O4D authority and WCV-C6 terminal paid evidence are non-substitutable S225
gates. Neither may be bypassed, and completing either or both authorizes no
automatic start, learner activation, payment activation, public release, or
Production activation.

Every runtime stage is an independently deployable learner or instructor
outcome. Framework-only, API-only, persistence-only, UI-only and QA-only
mandatory PRs remain prohibited. Every stage is queued, unselected, unstarted
and `automaticStartAllowed: false`.

### Architecture and learner state

Existing Next.js/Vercel remains Web plus trusted HTTP API. Future native
student clients use Expo React Native, Expo Router, EAS Build/Submit/Workflows
and Maestro. Existing Supabase/Postgres remains authoritative persistence and
tenant boundary. ULC-0 installs no dependency or native project.

A remote-website-only WebView and a static-exported server app are prohibited
as the final native product. All surfaces use one server-authoritative mastery,
verified and source-currentness state. Clients cannot set those states,
receive a service-role secret or place raw answer/OCR/concept/score/private
text in push payloads. Critical mobile behavior requires a versioned trusted
HTTP API.

### Concept Decoder and Formula Graph

Concept Decoder is structured learner-error repair with term/Hanja/English/
symbol decomposition, intuitive explanation, precise exam definition,
analogy limits, applicability, confusions, exam-writing layer, learner-error
provenance, retrieval prompts and D+1/D+7 scheduling.

Formula Graph is a typed relation object with expression, variables, units,
causal direction, applicability, derived forms, rounding/sign constraints,
common errors, exact source/version and a link to the learner's failed
attempt. Explanation alone creates no mastery evidence; only reconstruction
and later independent performance may change learning state.

### Store and coordinated release

ULC-R1 must prove iOS and Android in-app deletion, an external Web deletion
resource, privacy/App Privacy/Data Safety declarations, AI/source/currentness/
human-review disclosure, notification privacy, least-privilege permissions,
app-review access and delete/export verification.

One `DabangilReleaseManifestV1` binds exact source, Web deployment, native
builds, API/evidence/validator versions, migrations, policy/disclosure,
deletion, store metadata and per-surface final gates. iOS and Android are
approved and held, Web remains gated, and one manual command opens all three
within at most 24 hours.

ULC-0 activates none of this runtime.

## 3. Learning execution glossary

`Full-Day` and `Personal Study Ledger` are canonical contracts only. This
reset does not implement either runtime.

`Full-Day` plans against 30–720 available minutes, including explicit
600/720-minute fixtures. It contains zero to three `CoreOutcome` values and
zero or more `ExecutionBlock` values. Planned minutes cannot silently exceed
availability; overflow is reduced, deferred, or dropped with a reason, and
illness/gaps cannot create an unbounded backlog.

The native learning policy is the only authority for `CoreOutcome`, learning
priority, and what should be studied. The native path remains authoritative
and sufficient for S241A.

Google OR-Tools CP-SAT is only a proposed metadata-only
`ExecutionBlock` placement adapter. It may place, shorten, defer, or leave
unassigned already selected candidates under the native contract. It may not
decide official answers, mastery, pass risk, learning value, source/Law
status, feedback, or D+1/D+7 recovery.

Optimizer requests use ephemeral opaque request/candidate IDs and closed enum
reason codes. User/account IDs, `LearningDocument`/`ReviewUnit` IDs,
filenames, titles, free text, hashes, commitments, and question/answer/OCR/
Law/AI bodies are prohibited.

`OPTIMAL` and `FEASIBLE` outputs remain candidates until the native validator
accepts them. Infeasible, invalid, unknown, timeout, schema mismatch, stale
response, or validator rejection uses native fallback. If the fallback is
also invalid, the result is `blocked_manual_plan_required`; there is no false
success.

The exact machine contract is
`config/dabangil-full-day-scheduler-contract.json`.

`Personal Study Ledger` is the append-only private index of
`LearningDocument` lineage, attempt, assistance, exposure, review, rewrite or
recalculation, and delayed independent evidence. Its raw bodies remain in the
Personal Raw Vault.

### `CoreOutcome`

A learner-visible daily outcome. A day has zero to three `CoreOutcome` values.
It is the only count governed by the Today max-three rule.

### `ExecutionBlock`

A bounded piece of lecture, reading, problem solving, answer production, or
review work. A day has zero or more blocks. Blocks fit the declared time
budget; overflow is reduced, deferred, or dropped with a reason. Finishing a
block alone never changes mastery.

### `LearningDocument`

The learner-owned lineage from source identity and capture through revisions,
attempts, review evidence, biggest gap, next action, rewrite/recalculation,
assistance/exposure events, and delayed checks. Raw content stays in its
authorized private vault. Its service answers, notes, handwriting, and raw OCR
never enter shared content. A separately authored user-owned contribution for
which the user has actual rights is a distinct contribution object that may
use the Section 7–8 Cleared Content Bank path; it never converts, derives
from, or relocates the private `LearningDocument`.

### `ReviewUnit`

A non-billable recovery/scheduling object selected against a minute budget.
It is not a usage credit, price unit, entitlement, or Deep Review Unit.

### `attempt_first`

The learner makes an independent attempt before answer or full-solution
exposure. Any later reveal is append-only exposure history and cannot rewrite
the initial attempt as unseen.

### `guided_study`

This is a canonical contract only; this reset implements or authorizes no
guided-study runtime.

The system records exposure before any hint, explanation, answer, or full
solution, then provides a subject-specific worked explanation, a core concept
record, and a future independent review. It cannot be relabeled
`attempt_first`, independent, unseen, or stable.

### `assistance-aware mastery`

This is a canonical contract only; this reset implements no mastery runtime.
Assistance, exposure, and mastery are separate axes. A supported correction,
hinted success, full-solution view, or supported rewrite cannot establish
stable mastery or held-out readiness. Stable candidacy requires delayed,
independent evidence on an unseen or verified variant and remains subject to
the domain validator.

Gold and held-out datasets have separate IDs, storage/access paths, and
contamination tests.

## 4. Deferred Founding Beta commercial hypothesis

The following remains an Owner-approved external-commercial hypothesis, not
an activation and not an Owner-dogfood acceptance criterion:

| Field | Hypothesis |
|---|---|
| Product | 답안길 2차 Founding Beta |
| Access | invitation-only |
| Price | 69,000 KRW, VAT included |
| Term | 30 days, no automatic renewal |
| Included meter | 20 `usable_review_unit_v1` |
| Public self-serve | off |
| Activation | requires later O4 packet |

Every account retains one lifetime full-value review before payment.
Payment-first and deliberately degraded free output are prohibited.

### Three disjoint unit contracts

| Contract | Purpose | Billable |
|---|---|---:|
| `ReviewUnit` | learning recovery and scheduling | no |
| `usable_review_unit_v1` | Founding Beta hypothesis meter | only after O4 activation |
| `deep_review_unit` | legacy S219/S220 premium meter | legacy contract only |

There is no alias, balance sharing, conversion, migration, fallback, or silent
substitution among the three.

For `usable_review_unit_v1`, only these hypotheses are defined:

- 10–25 points: 1 unit;
- 40–50 points: 2 units;
- 100 points: 4 units.

Missing points, 26–39 points, 51–99 points, and any other ambiguous value
require an explicit pre-submit estimate/manual decision. The system must not
infer a charge or raise it after the result.

Usage follows `reserve → usable result commit` or `failure release`. OCR
failure, provider failure, release blockers, persistence failure, re-reading,
scheduled review, export, and delete do not commit units. These rules remain
contract-only until an O4-authorized implementation.

Owner dogfood does not validate price, payment, refund, support, entitlement,
external usability, or capacity. External Wave A/B/C and Golden 9 reviewer
evidence remain queued in their own commercial path before S225.

## 5. Readiness axes

These states never imply one another:

- `runtime_ready`: authenticated storage, failure, recovery, and isolation;
- `content_ready`: source, rights, answer, and version verification;
- `quality_ready`: Gold and deterministic/AI quality gates;
- `commercial_ready`: payment, entitlement, usage, support, cost, refund, and
  legal readiness;
- `observed_efficacy`: repeated held-out improvement was observed;
- `causal_claim_ready`: an O5-approved design supports a causal claim.

Owner-private states are also separate:

- `owner_dogfood_ready`: versioned Owner-only use evidence satisfies its
  exact native or optimizer acceptance contract;
- `owner_private_accepted`: S241A completed on the native path.

Neither state implies `commercial_ready`, `external_usability_validated`,
`observed_efficacy`, or `causal_claim_ready`.

Historical completion of S202–S224 does not make any of these current states
true without fresh evidence.

The roadmap marks S200–S224 with
`completionScope: historical_contract_evidence` and
`currentReadinessEstablished: false`. Their primary `completed` status
preserves history; it is not a current readiness claim.

## 6. First-round Adaptive MCQ Foundation

Foundation owns contracts only:

- official exam notices, subject/rule versions, and taxonomy;
- five subject adapters for 민법, 경제학원론, 부동산학원론,
  감정평가관계법규, and 회계학, all contract-only;
- Q-Net rights evidence per post and per attached asset;
- QTI 3-compatible item/response/scoring shapes without a conformance claim;
- xAPI/Caliper-compatible metadata envelopes without Production telemetry;
- attempt, confidence, elapsed time, answer change, elimination, exposure, and
  assistance events;
- rapid answer grid and private capture contracts;
- five-choice true/false correction and explanation;
- `K/C/A/R/T/G`: knowledge, concept, application, reading, time, and guessing
  causes;
- deterministic accounting/economics checks and versioned Law/K-IFRS status;
- Gold/held-out physical separation and timed/OMR readiness contracts.

Official availability never implies redistribution rights. An item inherits
the most restrictive decision from its source post and asset. Private capture
is `private_personal_use_only`. Resolving its answer or source never changes
that status, and the private capture itself is never promoted. A user may
separately submit an actually rights-owned, separately authored contribution
object under content-contribution consent/contract, rights and O3 review, and
promotion quarantine. That path does not derive from or reclassify the
private capture.

## 7. Data planes

### Personal Raw Vault

User captures, OCR, answers, notes, rewrites, and AI bodies for that user.

### Academy Tenant Vault

Academy problems, rubrics, submissions, instructor edits, and approved prose
for that tenant. Instructor approval alone never creates shared Gold.

### Shared Signal Plane

Only purpose-consented, pseudonymous, non-reconstructive derived signals such
as concept ID, outcome, time, confidence, assistance, exposure, error code,
and delayed recovery.

Existing `SAFE_DERIVED_SIGNAL_KEYS`, key-name sanitizers, and legacy telemetry
are personal-service/legacy metadata only and are not Shared Signal eligible.
Some allow free-text values. A future O2 adapter requires a closed value-level
schema of approved IDs, enums, counts, and buckets, plus purpose consent and
reconstructiveness tests; free text is prohibited.

### Cleared Content Bank

Only rights-cleared official assets, contracted content, owner-created
content, or separately authored user-owned contribution objects after
promotion review. A user-owned contribution requires actual rights and is not
a private service answer, note, handwriting artifact, or raw OCR extraction.

### Model/Eval Registry

Dataset, policy, model, prompt, scheduler, evaluator, held-out, activation,
rollback, and result versions.

Private raw content never automatically enters a shared plane. Before
authorized promotion, private/tenant raw text, corrections, source excerpts,
and reconstructive embeddings are prohibited from Shared Signal, shared
model/eval data, and the Cleared Content Bank. Exported/general cross-vault
equality signals and equality oracles are prohibited. Rights-cleared or
contributed content may exist in the Cleared Content Bank only after the
promotion basis and review below; the sole pre-promotion comparison is the
rights-gated, least-privilege quarantine preflight.

Rights-cleared content may improve shared references and evaluation through
the Cleared Content Bank. Purpose-consented pseudonymous derived signals may
improve scheduling and evaluation through the Shared Signal Plane. Neither
permission creates a path for private raw bodies to enter a shared plane.

Private and Academy fingerprints are domain-separated and vault-scoped.
They are keyed and one-way with vault-specific non-exportable domain keys and
never expose an equality oracle.
Plaintext SHA-256 for private raw content is vault-local integrity metadata
only. It cannot leave the vault or become an object/API/idempotency key,
receipt, export/log/telemetry/issue/PR field, shared identifier, or
cross-plane comparison handle. External private references are random opaque
vault-scoped IDs. A private keyed commitment cannot be returned to a client,
receipt, export, log, analytics event, or lookup/equality endpoint.
Global dedup identifiers are permitted only after material has been promoted
into the Cleared Content Bank. The promotion basis is rights-cleared
official/owner-created/contracted content, or a separately consented
user-owned contribution object meeting the boundary above. O3/review and
quarantine always apply.
Pseudonymous-signal consent alone never permits a global fingerprint or
pre-promotion cross-vault comparison.

One narrow pre-promotion operation is allowed inside rights-promotion
quarantine: after applicable rights prerequisites and, for user-owned
material, content-contribution consent/contract, an access-controlled,
domain-separated, least-privilege internal promotion fingerprint may compare
the candidate with the Cleared Content Bank. It emits only decision metadata,
no equality signal to the source vault, user, or tenant, and creates no global
identifier. A global identifier exists only after promotion.

## 8. Consent, promotion, and quarantine

The Consent/Opt-out Ledger versions purpose, subject, scope, policy, grant,
revocation, and effective time separately for:

1. personal service processing;
2. pseudonymous product-improvement signals;
3. Academy sharing;
4. separately authored, rights-owned content contribution;
5. offline model training.

Opt-out or revocation stops future use for the revoked purpose, including
Shared Signal use, Academy sharing, content promotion, and offline
training/dataset refresh as applicable. Deletion and retention remain
purpose-scoped and follow legal/contractual obligations without silently
authorizing a different purpose.

Rights promotion records source/post/asset identifiers, rights tier, hash,
attribution, answer status, effective version, reviewer, and decision.

That rights-cleared provenance hash belongs to the Cleared Content Bank
promotion record. It does not authorize a private-body plaintext hash outside
the private vault.

Fingerprint/dedup review, conflicting-answer quarantine, poisoning/anomaly
quarantine, and held-out contamination checks occur before promotion. No
online model-weight update from any input is permitted. All permitted
training is offline and requires an exact-scope O5 gate.

## 9. OSS and standards lifecycle

The lifecycle state vocabulary is:

```text
proposed
→ benchmark_only
→ shadow
→ limited_activation
→ active
```

Transition requirements are edge-specific. `proposed → benchmark_only`
requires a pinned version, license/SBOM, model-asset rights where relevant, an
isolated benchmark environment, a fallback adapter, a named owner, and a
tested rollback plan; it requires neither prior performance/comparison
evidence nor an activation gate. Its named owner must still manually select
the queued roadmap item; benchmark entry or execution is never automatic.
`benchmark_only → shadow` requires stage-specific benchmark/comparison
evidence, exact-scope O2 measurement/consent, and the adapter-specific
prerequisites below. `shadow → limited_activation` requires shadow evidence
from the same exact adapter, version, and configuration, plus an exact-scope
O4E approval naming adapter, version/config, cohort, and purpose. Evidence
cannot transfer across adapters, versions, or configurations, and no
transition is automatic.

The exact Owner-private Full-Day optimizer is the only scoped gate mapping:
O4T fixes benchmark thresholds; O2O permits only closed, no-free-text
Owner-private comparison metadata and exact retention/deletion before shadow;
and O4P, after completed native S240A, permits only exact Owner-only limited
activation. O2O/O4P do not substitute for generic O2/O4E. Any Shared Signal,
telemetry, external-learner, Academy, or other adapter measurement/activation
still follows generic O2/O4E.

This reset schedules only
`proposed → benchmark_only → shadow → limited_activation`; its required safety
path then goes to `rollback`. `limited_activation → active` is unscheduled and
not authorized. O4E authorizes limited activation only, never `active`; a
future active transition requires that exact adapter/version/config's
limited-activation evidence, a new roadmap item, and a separate exact-scope O4
approval distinct from O4E.

`rollback` is a direct safety transition from `benchmark_only`, `shadow`,
`limited_activation`, or `active`. Limited activation never has to advance to
active before rollback. Rollback is immediate and fail-safe; it never waits
for a new Owner gate or fresh comparison evidence. Its tested plan must exist
before entering any non-proposed stage. The minimum safety path is therefore
`benchmark_only → shadow → limited_activation → rollback`.

- OpenCV and PaddleOCR start as capture benchmarks.
- QTI 3 and xAPI/Caliper are compatibility targets, not certification claims.
- `ts-fsrs`/`pyBKT` remain `benchmark_only`, with no learner-hidden
  instrumentation, until adapter-specific benchmark/comparison evidence
  exists and the exact-scope O2 measurement/consent gate is approved. Only
  then may they enter learner-hidden `shadow`; `ts-fsrs` additionally requires
  beta evidence and `pyBKT` sufficient closed-schema skill-event data.
- IRT/CAT remains a contract-only offline analysis/simulation lane after
  sufficient independent attempts and contamination-safe held-out data; this
  reset authorizes no IRT/CAT execution. Synthetic or non-personal
  rights-cleared fixtures may be eligible for a separately authorized future
  offline analysis under their source rights; this reset does not authorize
  it. Any learner- or Academy-derived attempt signal instead requires an exact
  O2-approved purpose, purpose consent, a closed non-reconstructive value
  schema, purpose-scoped retention/revocation, and storage in the Shared Signal
  Plane; tenant contract alone is insufficient and raw content is prohibited.
  Any IRT/CAT fitting, training, or dataset refresh requires eligible inputs,
  separate exact-purpose consent, and an exact-scope O5. Any future runtime
  model/parameter/config output starts as a new `proposed` candidate.
- LTI 1.3/H5P waits for a named Academy partner.

For generic and non-specialized adapters, `shadow` is
observation/comparison only. The native fixed schedule and native rules
remain the sole decision authority. Shadow output cannot change
learner- or Academy-visible output, Today/Full-Day, Review Queue, mastery,
scheduling, recommendations, entitlements, operational decisions, or
persisted product state. The only permitted data write is to the Shared Signal
Plane, and only after exact-scope O2 approval, purpose consent, a pseudonymous
non-reconstructive transform, and an approved closed value-level schema with
no raw content or free text. Purpose-scoped retention applies and revocation
stops future use. The Model/Eval Registry may receive only aggregate, version,
and evidence metadata, never a learner-level record or raw content. Shadow
records cannot influence runtime product behavior. Aggregate, versioned
evidence in the Model/Eval Registry may inform a human Owner gate, but it can
never trigger an automatic transition.

The exact Owner-private Full-Day specialization instead writes only the
closed O2O-approved comparison fields to the Owner-private metadata store;
it writes no Shared Signal or telemetry, contains no free text, and still
cannot influence canonical schedule or product state before O4P.

Runtime candidates stay frozen and versioned: `shadow`, `limited_activation`,
and any future `active` candidate never fit, train, or refresh in place.
Before O5, shadow and limited activation are inference/evaluation only and
cannot authorize research use or ground an efficacy claim. O2 and O4E do not
substitute for O5. Any separate offline training or dataset-refresh workflow
requires eligible inputs—purpose-consented pseudonymous non-reconstructive
Shared Signal or promoted Cleared Content Bank material only—separate
exact-purpose consent, and a future exact-scope O5 gate. Direct Personal or
Academy raw content is ineligible. O5 scopes are non-transferable:
training/refresh approval does not authorize research opt-in or efficacy
claims, and vice versa. Online model-weight updates remain prohibited for
every stage and every input.

O5 authorizes only its named offline work, not runtime use. A resulting
model, parameter, or adapter configuration receives a new candidate identity
at `proposed`, a new manually selected queued roadmap item, and no reuse of
completed S270/O4E evidence or gates. It must independently clear
held-out/benchmark evidence, `shadow`, and a new exact-candidate activation
gate; hot-swapping into an existing limited or active adapter is prohibited.
A refreshed dataset instead receives a new dataset identity and independently
clears eligible-input, exact-consent, rights/lineage, quarantine, and held-out
validation. It is a versioned logical manifest over eligible bodies that
remain in the Shared Signal Plane or Cleared Content Bank, not a new durable
body store. Model/Eval stores only version, lineage, and evidence manifest
metadata, never row bodies. An exact-O5 offline workflow may make only a
least-privilege ephemeral materialization with purpose-scoped
retention/deletion; it is deleted when the workflow ends and is never retained
outside the five canonical planes. The dataset has no runtime influence by
itself, and every runtime artifact produced from it re-enters the adapter
lifecycle at `proposed`.

O2 authorizes only its exact measurement/consent scope. Benchmark and shadow
evidence follows O2; any limited activation still requires a separate
exact-scope O4 approval. O4E is that limited-activation gate only and cannot
authorize `active`. Golden 3 O3 approval does not authorize Golden 9, and
Founding Beta O4 approval does not authorize S225 public self-serve.

This reset adds no package, import, provider, model, prompt, or scheduler.

### OR-Tools schedule adapter

The 2026-07-26 amendment adds only the source contract and queued roadmap
branch for Google OR-Tools CP-SAT. Its lifecycle state is `proposed`; no
package, Python service, provider, telemetry, or runtime dependency is added.

S237O must pin the exact Python and OR-Tools versions, license/SBOM, solver
seed, workers, time limit, integer scaling, adapter/policy versions, isolated
benchmark boundary, and tested native fallback. Only metadata-only synthetic
fixtures are eligible.

Adapter requests and solver-originated projected responses are separate
closed-world shapes. The projected response contains only a raw solver-owned
status, exact request/snapshot correlation echoes, objective/violation
diagnostics, elapsed timing, and candidate-plan fields when applicable. It
never contains, accepts, requires, selects, references, authorizes, or releases
`fallback`, `native_plan_version`, a canonical native fallback plan, a
canonical plan reference, `version_info`, or gateway-owned version/configuration
fields. After complete raw-response, exact-correlation, and required-bijection
validation, only the trusted gateway constructs canonical `version_info` from
the exact trusted correlated configuration, with exactly
`contract_version`, `native_policy_version`, `adapter_version`,
`optimizer_version`, `objective_version`, `threshold_version`, `solver_seed`,
`solver_workers`, `time_limit_ms`, and `integer_scaling_version`. It also
classifies adapter/schema/correlation/validator failures, independently
resolves or prepares one immutable native fallback in the canonical original-ID
domain, constructs canonical fallback state, and releases it only after
separate complete canonical and native validation. Canonical fallback state
and canonical `version_info` are exactly the two gateway-constructed
exceptions to projected/canonical non-ID equality. Missing, ambiguous, stale,
untrusted, or mismatched canonical metadata is `validator_rejected` and enters
the same single independent fallback path; an invalid fallback releases only
`blocked_manual_plan_required`. Exact top-level and nested allowlists cover
each schema separately. Unknown fields, stable identities, calendar
titles/locations, filenames, bodies, free text, or raw projected version
fields fail closed.
One prior accepted placement snapshot is eligible only as closed, ephemeral
metadata for midday replanning and schedule-churn measurement. The server
must load the latest non-superseded monotonic lineage from the authoritative
Owner-private store; if it exists the exact signed snapshot is required, and
`null` is allowed only with a fresh signed no-schedule lookup result. Separate
closed signed native-validator and authenticated Owner receipts plus a signed
provenance bundle bind the exact schedule/head/tree/versions/lineage. Approved
O4V plus completed S236P bind the private store, while exact O4A separately
binds issuance and runtime use. A fresh signed replan lookup rechecks trust,
expiry, and revocation within 300 seconds. The server uses the Asia/Seoul
minute ceiling cutoff, making elapsed/in-progress blocks immutable. The
snapshot cannot select learning work or override current native constraints.
This object terminates at the trusted native gateway. OR-Tools receives only
a fresh ephemeral projection of windows, candidates, fixed blocks, cutoff,
immutable past/in-progress placements, and soft future-placement preferences;
all store/scope/lineage/receipt/bundle/authorization references and digests
are stripped and cannot be resolved by the optimizer. The gateway retains
trusted canonical `study_date_kst`; it is not projected. Every execution block
in a projected optimal/feasible candidate, complete canonical result, and
releasable canonical native fallback resolves its candidate exactly once.
The gateway derives `block_end_utc` from `study_date_kst` and
`end_minute_kst` in IANA `Asia/Seoul`, treating `1440` as next-day 00:00, and
requires it to be less than or equal to each non-null exact ISO-8601 UTC
`hard_deadline_or_null`; `null` means no hard cutoff. Candidate
mapping/correlation faults are `schema_mismatch`; a known breach is
`validator_rejected` and attempts exactly one independently prepared canonical
native fallback. `minimize_deadline_lateness` uses only
`soft_deadline_or_null` and cannot override the hard deadline. Elapsed and
in-progress immutable placements must pass this predicate before projection
and cannot be moved, dropped, unassigned, shortened, extended, or rewritten
to repair a breach.
The same pre-release gate applies three closed relational predicates in both
projected and canonical identifier domains to every optimal/feasible
candidate, complete canonical result, and releasable canonical native
fallback. For cutoff feasibility, it reads the exact
`replan_cutoff_minute_kst_or_null` from the same trusted correlated invocation;
`null` means no lower bound. Only an exact immutable elapsed/in-progress prior
placement whose candidate, window, `start_minute_kst`, `end_minute_kst`, and
`duration_minutes` match field-for-field and resolve exactly once is exempt.
Every other new or moved block requires
`start_minute_kst >= replan_cutoff_minute_kst_or_null`; equality is feasible, a
one-minute-early start is rejected, and cutoff `1440` releases no new or moved
block.

Intervals are half-open, `[start_minute_kst, end_minute_kst)`. Every applicable
distinct pair requires
`a.end_minute_kst <= b.start_minute_kst || b.end_minute_kst <= a.start_minute_kst`,
so boundary equality is feasible. Validate every execution-block pair, every
execution block against every fixed block, and every new or moved execution
block against every immutable prior placement. The unique exact unchanged
representation of an immutable placement is one logical block and does not
overlap itself. For each placed dependent, resolve it and every
`prerequisite_candidate_ids` member exactly once through that invocation and
active domain, place every prerequisite exactly once, and require
`prerequisite.end_minute_kst <= dependent.start_minute_kst`. An empty list is
unconstrained; every member of a multiple-prerequisite set must pass, and an
unassigned prerequisite cannot support a placed dependent.

Unknown, dangling, duplicate, cross-domain, non-bijective mapping/correlation,
or ambiguous immutable matching remains `schema_mismatch`. A known
before-cutoff start, overlap, or missing, unassigned, or reversed prerequisite
placement is `validator_rejected` and attempts exactly one independently
prepared canonical native fallback. That fallback must satisfy all three
predicates; an invalid fallback releases no plan and returns only
`blocked_manual_plan_required`. Immutable and fixed placements cannot be
moved, dropped, unassigned, shortened, extended, or rewritten to repair a
breach, and elapsed/in-progress immutable placements pass these predicates
before projection. Bind cutoff to
`new_or_moved_execution_block_starts_at_or_after_replan_cutoff`, overlap to
`block_overlap_zero`, and ordering to `prerequisite_order_violations_zero`.
Add no projection field or result inverse-map path.
The lookup binds a single-use nonce, monotonic non-reusable scope generation,
and acceptance high-water mark. Absence requires high-water zero;
supersession requires atomic sequence+1 acceptance and deletion leaves a
signed tombstone. The complete latest-pointer tuple is atomically rechecked
and the nonce consumed within 300 seconds immediately before projection.

S237O authorization is computed without a signature cycle: canonical
proposal, separate immutable signed Owner decision, then final approved
authorization digest. Materialized ready/decided packets live in the exact
metadata-only authorization store outside the Git head/tree they bind.
The six S237O receipts form one canonically ordered digest after only their
receipt-set and independent-attestation slots are normalized. A distinct
verifier must cryptographically verify a fresh, unrevoked DSSE artifact over
the exact authorization, verifier/key/trust-root/time/revocation bindings,
that set, and the otherwise-complete evidence preimage. Each receipt has an
exact fixture/subassertion policy; deterministic replay uses one worker and
three cold plus three warm byte-identical canonical results. The final
evidence digest includes the verified artifact digest.
Canonical assertion-evidence and primary-attestor-provenance set digests
project every receipt in operation order. A closed benchmark-result artifact
binds replay, failure-status, fallback, rollback, metadata-boundary, and time
outcomes; its ref/digest are signed. The S237O Owner decision receipt is
re-resolved and revalidated at benchmark start and acceptance, so the final
authorization digest is not a bearer token.

O4T follows the exact S237O benchmark and fixes latency, native-validator
candidate-schedule acceptance, edit, error, and regression thresholds with a
version, effective date, and evaluation window. This rate measures candidate
placements accepted by the native validator; it grants no CoreOutcome or task
selection authority. Thresholds cannot be silently or retroactively weakened.

The pending O4T packet
`o4t-s237o-owner-private-schedule-thresholds-v1` remains unapproved and
non-approvable while its S237O receipt/head/tree, adapter/optimizer/config,
any threshold value/unit/comparator, effective date, evaluation window, or
normalized canonical digest is null. O2O and S238OH must bind the exact
approved packet. That immutable packet is content-addressed by its final
threshold-binding digest in the exact private O4T store bound by the packet's
Owner-decision store reference and policy digest. Both stages resolve and
canonically rehash it at start and acceptance, then revalidate the exact
approval record, DSSE receipt, and revocation state; lookup ambiguity, absence,
duplication, binding mismatch, digest mismatch, or an invalid receipt fails
closed. Wildcard or automatic shadow transition is forbidden.
The exact store reference and policy digest are first obtained from a current,
unrevoked, replay-protected signed O4T control-plane resolver binding, not from
the unresolved packet. The resolved packet must match those trusted
coordinates. One final digest maps to one immutable, append-only canonical
packet; aliases, redirects, and mutable overwrites are forbidden. Start and
acceptance each reject a wrong resolver binding, stale or expired packet,
approval-record/receipt mismatch, or failed signature, trust-path, expiry, or
revocation validation.
That resolver is an exact closed DSSE artifact. Its signed payload binds the
Owner-private scope, O2O/S238OH audience and purpose, store coordinates, final
packet digest, externally trusted registry/key/root versions and algorithm,
issue/expiry window, single-use nonce, monotonic generation, and revocation
evidence. The Owner-approved O4T trust-anchor registry is resolved from
authenticated control-plane configuration before the artifact, so neither it
nor the packet can select its verifier. Outer-to-signed equality, all digests,
signature and trust path, scope, replay state, expiry, and revocation are
recomputed at every start and acceptance; unknown or untrusted keys, unsigned
or mismatched payloads, cross-scope use, replay, or stale evidence fail closed.

O2O is required before S238OH. Before O2O, comparison is ephemeral and writes
no measurement. Exact O2O may authorize only closed, no-free-text
Owner-private comparison metadata in the approved private metadata store,
with exact retention/deletion. It does not authorize Shared Signal,
telemetry, external-learner, or Academy measurement; those retain generic O2.

S238OH is genuinely Owner-hidden: it cannot change or display the canonical
schedule. S238OV may display a comparison to the Owner, but neither the
comparison nor O2O-scoped preference evidence may change canonical schedule
or product state. Native and optimizer acceptance evidence remain distinct.
O4P requires completed native S240A and authorizes only the exact
adapter/version/config for Owner-only limited activation.

The D0-to-D+1 freeze covers Notebook, Full-Day, learning/assistance policy,
model, prompt, rubric, and source version. A necessary security repair
invalidates paired evidence and restarts at D0.

## 10. Private Authoring/Review Plane

The exact contract is
`docs/dabangil-private-authoring-review-plane-contract.md` and
`config/dabangil-private-authoring-review-plane-contract.json`.

The 2026-07-30 Owner decision rejects and supersedes the unmaterialized
`o4v-s234r-owner-private-plane-binding-v1` 88-field enterprise packet. Its
proposal and all-null provider-template digests remain historical integrity
values only. No DSSE rejection receipt, final approved-binding digest,
customer-managed KMS/HSM, separate attestation store, or independent
infrastructure verifier was materialized or claimed.

The active gate is `dabangil.o4v.lean_owner_private_gate.v1`. It reuses the
existing Supabase Pro project `inverge-beta` and requires one Owner-only
private bucket, Owner-only metadata RLS, no public access, and bidirectional
Owner A/B denial. Signed URL TTL, when used, is at most 300 seconds. OCR/AI
content-provider mode is exactly `none`.

Raw content in logs, analytics, telemetry, APM, exceptions, queues, and CI is
zero. S236P uses synthetic data only and real content remains off. Private
content retention is at most 365 days, metadata-log retention at most 7 days,
temporary-copy TTL at most 300 seconds, application-cache TTL exactly zero,
and export/delete SLA at most 7 days.

Automatic object-version rollback is not guaranteed. Owner-pilot recovery is
re-upload of the original retained by the Owner. Dedicated KMS/HSM, a
separate DSSE store, and an independent infrastructure verifier are not
required before external users, payment, or regulated customers. A future
expanded gate must decide those requirements before that boundary is crossed.

O4V authorizes only a later manually started S236P Work to provision and
verify this lean stack with synthetic fixtures. O4V does not itself create a
resource or start S236P. Public access, cross-account success, signed URL TTL
over 300 seconds, forbidden raw-content emission, a non-`none` content
provider, exceeded retention/TTL/SLA limits, or real-content enablement fails
S236P closed.

The regenerated O3A packet was approved by the exact-scope 2026-07-29 dated
Owner decision. That decision binds canonical manifest SHA-256
`de0e79159d8538d0e658bb9b0693ce27ed2bf7fcea3cf0d19198894cd7905b72`
and packet SHA-256
`8189997e733eb0c8bef62c3ba5fa1cadac39a807c34d925b2e1a291fa30e654c`,
and expires with the packet at `2026-08-09T14:59:59.000Z`. The approved
proposal preimage remains immutable, including its pre-decision
`pending_owner_decision` and `ownerApproved: false` fields. No allowed
authoring or execution operation becomes executable until completed exact
S236P is revalidated, and S236A still requires a separate manual start.

## 11. Academy and both-track gates

Academy requires a named partner, one tenant, named instructors, learner
range, pilot dates, content rights, privacy/data-processing terms, support,
exit/refund owner, tenant isolation evidence, and explicit instructor approval
before learner handoff. AI drafts never auto-send.

Both-track keeps first- and second-round states separate. `S241A`, Owner-
Private Second-Round Authenticated Acceptance, is consumed by `ULC-M1`.
`S238B`, First-Round Authenticated Acceptance, is independently consumed by
`ULC-F1`. Bridge concepts do not transfer mastery, and acceptance evidence
cannot substitute in either direction. Both gates must be separately complete.

## 12. Owner gates

| Gate | Owns |
|---|---|
| O1 | product order, canonical authority, scoped supersession |
| O2 | Production measurement, consent, retention, telemetry |
| O3 | content rights, Gold reviewers, public/shared content |
| O4 | migration, secret, provider, price, payment, real users, flags |
| O5 | randomization, research opt-in, offline training, efficacy claims |

Scoped O3A and O4-family gates are not interchangeable:

- O3A: exact Golden 3 rights/source/version/Owner-private purpose only;
- O4V: exact lean Owner-private Supabase/storage/RLS/retention boundary only;
- O4A: Owner-private runtime and native dogfood activation;
- O4T: exact post-benchmark optimizer threshold decision;
- O2O: exact Owner-private comparison measurement/retention only;
- O4P: exact Owner-only optimizer limited activation;
- O4F: future external commercial beta activation;
- O4W: exact frozen paid-cohort manifest authorization for WCV-C5 only; and
- O4D: future public self-serve activation.

An approval packet states exact scope, non-goals, owner action, evidence,
unapproved safe state, and expiry. O1R is approved only for its source
amendment. O3A is approved only for the exact immutable packet named by the
2026-07-29 decision and authorizes no immediate operation. O4V is approved
only for the lean Owner-private gate in the 2026-07-30 decision and authorized
no immediate operation at decision time. The live roadmap now records S236P
as factually blocked after its consumed failed attempt; acceptance remains
false. Every other O4-family runtime/content/commercial gate above remains a
future gate. O4W is queued and unapproved behind ULC-L1; it authorizes no learner,
payment, delayed-evidence, cohort or Production operation.

## 13. Roadmap, locks, and WIP

Every Work is global single-writer for merge-producing mutation. The root/
Owner writer owns the one writing branch and PR; additional inspection is
read-only and non-overlapping. Both executable selectors mechanically enforce
the explicit `program.globalMergeProducingWriterLimit` within one parsed
roadmap plan. They count raw `active`, `in_progress`, `in_review` and `pr_open`
aliases against writer capacity even when an active item's dependencies are
invalid. `blocked` and `human_decision` retain WIP reservations but consume no
writer capacity.

This per-plan selection cap is not a cross-process distributed writer lease.
It cannot prevent a human from opening independent Work windows, so the Owner
single-writer prohibition remains controlling across processes.

Primary statuses use only runner-supported values. Future gated work is
`queued` with unmet dependencies; it is not marked `blocked` or
`human_decision`, because those values consume WIP.

`program.wipLimit` is three. Two slots are occupied by the truthful blocked
CPF-1 and S236P control-plane items, leaving one merge-producing delivery
slot. The separate global merge-producing writer limit is exactly one, so WIP
three never authorizes parallel writers. Shared source-of-truth, schema,
auth/RLS, billing, runtime and other control-plane mutations are serialized.

The runner still supports only one flat exact-string `lockGroup`; it has no
hierarchical or multi-lock ownership model, cross-run reservation, distributed
lease, or owned-file-overlap enforcement. The explicit global writer cap now
prevents distinct lock groups from expanding one plan beyond one selected
merge-producing item. Cross-process exclusivity still requires exact Owner
authority and manual launch discipline.

Each lock group permits one concurrent writer and zero additional concurrent
writers. All WCV campaign items and the auxiliary O4W gate share
`wcv-vertical-campaign`. WCV-C4 depends directly on ULC-I1, and O4W remains
queued and unapproved behind ULC-L1; WCV-C5 depends on both WCV-C4 and O4W.
Any Work must declare an exact owned-file manifest; overlap is resolved before
mutation. The complete ULC/WCV dependency graph, O4W edge and global writer
limit serialize campaign work.

The S234 reset snapshot contained exactly:

- `S235A`: second-round owner-private Golden 3 readiness only;
- `S235B`: first-round Adaptive MCQ Foundation only.

S234R, S235A, and S235B are completed as source/contract evidence. The current
authority is `roadmap/active-program.yml`; this contract deliberately does
not mirror its dynamic ready-item list.
O3A and lean O4V are completed as exact Owner decisions; S236B remains queued,
CPF-1 and S236P remain
factually blocked, and S236A remains queued with S236P as its unmet dependency.
The machine mirror pins the WCV campaign graph and structural-recovery chain,
not the unrelated dynamic ready list. Runner selection is metadata-only: it
does not start, reserve, provision, author, or execute work. After C1, the
single available runner slot may select the WCV-C2 umbrella; lead authority is
#717. C2R-A and C2R-B are terminal source outcomes, but a separate exact Work
is still required to start C2R-C-P. No later replacement stage can auto-start
or bypass its terminal predecessor.

PR #660 remains Draft and blocked. Its current exploratory OCR evidence does
not establish S236B. Any continuation must reconcile onto amended main and
regenerate exact-head evidence.

## 14. Brand and home

Mineral Cobalt `#4653A6`, the approved Figma assets, and home work remain
queued. They are not implemented or completed by this reset.

## 2026-08-15 C2R-A rights-safe source contract

The Owner decision `docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md` and machine contract `config/dabangil-rights-safe-adaptive-variant-foundry-v1.json` complete the C2R-A source outcome under merge-and-receipt semantics.

For its exact scope, the 2026-08-15 decision precedes and supersedes the
2026-08-14 structural-recovery decision only for the C2R-A source contract and
post-merge current-stage selectors. The older decision remains controlling for
PR #716, Tracker #717, the five-stage chain, stage scopes, one-writer,
no-auto-start and preserved #714 allocations. The later decision becomes
repository authority on the clean expected-head-pinned merge; C2R-B cannot
operationally start before the validated A receipt and #702 closure.

The eight exact source classes fail closed through machine denial codes. Academy/commercial material, learner-private material, rights-unknown material and blocked material cannot enter any shared blueprint, generation, bank, cache, calibration, analytics, training or paid-delivery route. The raw learner-body training ban is unconditional and consent cannot override it.

Learning, Transfer and Measurement banks remain distinct. Bank search precedes bodyless scarcity recording and offline generation. Candidates traverse the exact cheap-to-expensive validation cascade; near-copy, reconstruction, rights, deterministic/source, dispute, staleness and retirement failures block release or assignment.

A conditionally eligible `SourceEligibilityDecisionV1` must bind exact
`RightsManifestV1.manifestId` and `manifestVersionId` plus
`rightsEvaluatedAt` before any shared blueprint extraction. Source class,
purpose, territory, active status and the validity window are revalidated at
extraction and every shared-route use. Deny-only decisions may omit a manifest
and remain denied. A later release-manifest binding is independently required
but cannot cure missing pre-blueprint lineage.

This is source authority only. C2R-A has no assigned donor matrix rows, so the 21-row matrix remains unchanged. The post-merge next stage is C2R-B/#714, authorized but unstarted; C2R-C-P remains blocked until terminal validated A and B merges.

## 2026-08-15 C2R-B typed subject proof contract

The later Owner decision
`docs/decisions/2026-08-15-owner-c2r-b-typed-proof-obligations.md` and machine
contract `config/dabangil-c2r-b-typed-subject-proof-architecture-v1.json`
complete only Issue #714's campaign-C2 allocation under merge-and-receipt
semantics. The A decision remains historical authority for the A contract and
its post-A selector; the B decision owns the later post-B selector.

`RepairAnchorV1` is exactly the union of Practice calculation relations,
Theory target-scoped predicates and Law exact applicability anchors. Every
stable/version identity and internal reference resolves exactly once through
an acyclic graph. Disconnected numbers, cross-target evidence, same-target
mixed polarity, unresolved anaphora, status-only Law labels, stale or
ambiguous Law bindings, unsupported input and overflow all fail closed.
Generic token presence is candidate evidence only and cannot create verified,
proof, transfer or mastery.

The future Tutor interface freezes prediction/self-diagnosis before help,
typed/photo/PDF/voice/structured private inputs, smallest scaffolds, three
continuation commands and no-shortcut semantics. It implements no runtime.
The three successor stages remain complete subject outcomes, and their common
runtime substrate may first land only inside C2R-C-P.

After terminal B merge and receipt, #714 remains open with C3/C4/C6 preserved.
PR #756 supplied the complete default-off Owner-only Practice runtime and 11
exact matrix declarations; PR #762 supplied the complete default-off Owner-
only Theory runtime and five direct declarations. Candidate PR #764 supplies
the terminal default-off Owner-only Law runtime and the final five direct
declarations. After its protected merge and validated receipt, the current
tuple is `WCV-C3 / C3 / #706 / authorized_unstarted`; only then may
#703/#704/#705/#717 close. Issue state cannot replace any required stage merge
or receipt, and no Production or learner activation begins.
