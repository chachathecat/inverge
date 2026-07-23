# Inverge agent rules

## Product source of truth

Use this authority order when sources conflict:

1. a dated Owner decision for the exact decision it owns, currently
   `docs/decisions/2026-07-23-post-650-unified-program-reset.md`;
2. `docs/dabangil-unified-program-contract.md` and its machine-readable mirror
   `config/dabangil-unified-program-contract.json`;
3. `docs/inverge-second-round-final-product-spec.md` and
   `docs/dabangil-second-exam-premium-os.md` for second-round detail;
4. versioned executable/domain contracts for behavior already implemented;
5. `roadmap/active-program.yml` for current status, dependencies, priority,
   flat lock group, and WIP;
6. this `AGENTS.md` and `config/agent-risk-policy.yml`.

Live GitHub and the current tree remain authoritative for implemented state.
Attachments, old execution prompts, handoffs, issue prose, and historical plans
are inputs, not live operational truth.

## Product scope (Owner O1 reset on 2026-07-23)

The currently exposed product remains focused ONLY on learner-facing 감정평가사 2차 for all three subjects:

- 감정평가실무
- 감정평가이론
- 감정평가 및 보상법규

Invitation-only second-round Founding Beta is the critical release path and
must precede S225 public self-serve launch. Private beta acceptance and public
launch acceptance are separate.

The 2026-06-25 first-round hard freeze is superseded only for a bounded
Adaptive MCQ Foundation contract lane. Existing first-round compatibility
code and routes are present, unaudited by this reset, and not newly authorized.

- official rules, taxonomy, source/rights/version manifests, event shapes, and
  held-out contracts may be queued in the active program;
- do not implement or activate first-round learner runtime in a Foundation
  work item;
- do not surface first-round entry in landing, onboarding, navigation, pricing, or learner product copy;
- do not activate first-round pricing, billing, public claims, or content;
- do not delete first-round code or regression coverage solely to simplify a task.

Both-track work begins only after separately authenticated first-round and
second-round acceptance. First-round evidence never silently transfers
mastery to second-round, or vice versa.

Do not add, expose, or expand learner-facing scope to:

- 보험계리사 / 계리사
- CPA
- 세무사
- TOEFL
- SAT
- universal exam track framing
- generic multi-exam messaging

If unrelated exam code exists internally, treat it as out of current learner product scope.

## Product identity and positioning

Inverge is the internal codename and repository name.

The learner-facing brand is **답안길**.

The premium learner-facing product is **답안길 2차 합격관제 OS**.

Preferred learner-facing positioning:

> 감평 2차 실무·이론·법규 답안을 시험일까지 운영해주는 합격관제 OS

답안길 is:

- a premium 감정평가사 2차 answer operating system
- an Evidence Review and rewrite/recalculation system
- a CASIO fx-9860GIII practical-routine system
- a theory paragraph-production system
- a law issue/application-production system
- a learning-record, weakness-map, Review Queue, and Today Plan system

답안길 is NOT:

- an official grader
- an official model-answer service
- a pass-probability or pass/fail prediction product
- a guaranteed-score product
- a human expert-review B2C service
- a public historical-question archive
- generic dashboard SaaS
- a motivation/streak app
- a broad multi-exam platform

Allowed learner-facing result framing:

- Evidence Review
- 답안 검토 리포트
- 합격관제 리포트
- 가장 큰 간극 1개
- 다음 행동 1개
- 연습점수 범위 with confidence and evidence
- 루브릭별 점수 범위 and deduction candidates
- 재작성 and regrade/recalculation
- GIII 실무 루틴
- 자동 오답노트 and 핵심개념 추적

Required reference-answer caveat:

- generated reference answers are learning references, not official answers or official grading criteria;
- each answer must expose source/verification status and uncertainty;
- no reference answer may be released when a blocking legal-source, calculation, or unresolved-consensus error remains.

Prohibited learner-facing claims:

- 공식 채점
- 확정 점수
- 공식 모범답안
- 합격 가능성 / 합격 확률
- 합격 보장
- AI 최종 판정
- 정답 보장

Core operating loop:

- historical question → attempt → OCR confirmation → Evidence Review → one biggest gap → one next action → compare with verified learning reference → rewrite or recalculate → error note/concept graph → scheduled review

When practice calculation is relevant, the loop must prefer a reset-safe CASIO fx-9860GIII hand-keyed routine and must not teach stored-program dependency as an exam strategy.

## Historical-question and reference-answer rules

- Target all officially available historical questions for all three second-round subjects.
- Keep source, hash, year, round, subject, question, points, exam date, law-effective date, extraction status, and rights status.
- Do not assume public availability means redistribution permission.
- Use full text, official-file embed, metadata/deep link, or operator-only display according to rights status.
- Never ingest third-party academy questions, model answers, textbooks, or feedback without license.
- Keep problem-text verification and reference-answer verification as separate states.
- Reference answers must use independent candidates, subject validators, critic review, consensus/conflict handling, source anchors, and release gates.
- Practice calculations must be independently recalculated and unit-checked before release.
- Legal claims must be tied to the law version applicable to the exam date when relevant.

## Learning behavior rules (non-negotiable)

- Never make passive answer browsing the default when retrieval or production is possible.
- Attempt before reveal is the default, but learners may deliberately override it after a clear confirmation.
- Retrieval/production before explanation by default.
- Spaced review is opt-out, not opt-in.
- Feedback must identify one biggest gap and point to immediate action.
- Every feedback state must end in retry, rewrite, regrade, or scheduled review.
- Preserve one screen, one primary task.
- If more than three competing primary choices appear, simplify.
- Every completed review must emit safe learning-gap and concept-state signals.
- Automatic error notes must explain why the learner was wrong, the correct principle, the immediate fix, recurrence, and next review.
- Score display must never be the final endpoint.
- Today Plan must show at most three primary tasks.
- Every learner-facing review or note should prioritize one biggest gap, one next action, Evidence Review / 답안 검토 리포트, rewrite or recalculation, automatic error note, core concept tracking, weekly weakness report for paid tiers, GIII practical routine when relevant, and Deep Review Unit only where paid high-cost review is intentionally requested.

Canonical learning execution terms:

- `Full-Day`: a contract-only 30–720 minute planning envelope;
- `Personal Study Ledger`: a contract-only append-only private index of
  `LearningDocument` lineage and assistance/exposure history;
- `CoreOutcome`: zero to three learner-visible daily outcomes;
- `ExecutionBlock`: zero or more time-bounded work blocks; completion alone
  never changes mastery;
- `LearningDocument`: learner-owned source/capture/revision/attempt/review and
  exposure lineage whose raw body remains in its authorized vault;
- `ReviewUnit`: a non-billable, minute-budget recovery/scheduling object;
- `attempt_first`: an independent attempt before answer or full-solution
  exposure, with append-only exposure history;
- `guided_study`: a contract-only assistance flow where exposure is recorded
  before help; it cannot be relabeled independent/unseen or establish stable
  mastery, and it schedules a later independent review. This reset authorizes
  no guided-study runtime.
- `assistance-aware mastery`: a contract-only separation of assistance,
  exposure, and mastery; this reset authorizes no mastery runtime.

Assistance, exposure, and mastery are separate axes. Gold and held-out
datasets require separate identifiers, storage/access paths, and
contamination checks.

## CASIO fx-9860GIII practical routine rules

The practical calculator model is fixed as `casio_fx_9860giii`.

Required principle:

> 시험장 리셋 후에도 손으로 재현 가능한 fx-9860GIII 타건 루틴만 훈련한다.

Every GIII routine specification should support formula, extracted values, hand-keyed sequence, expected display, unit check, rounding check, answer-sheet transfer template, common mistake warnings, reset-safe reproduction, and no stored-program dependency.

Do not teach calculator program storage as an exam strategy.

## Separate B2B Academy Console scope

A separate instructor-facing B2B contract is allowed, but Academy runtime is
not authorized. It requires a named partner packet and explicit Owner
approval before any pilot.

- Product name: **학원용 답안 운영 콘솔**
- Audience: academy staff / instructors / graders only
- Purpose: assignment, batch answer operations, AI grading/feedback drafts, instructor approval, cohort weakness analytics, and rewrite management
- Inverge does not sell or supply human experts as a consumer review service.

Allowed academy capabilities:

- tenant-scoped roster and class management
- problem/assignment distribution
- OCR answer upload
- rubric-based practice-grading draft
- feedback/comment draft
- reference-answer package
- instructor edit and approval
- student and cohort concept/weakness analytics
- rewrite and resubmission tracking
- usage/export/retention controls

Guardrails:

- Never present academy console tools in learner navigation or learner UI.
- Keep academy routes, roles, tenant boundaries, consent, retention, and reuse controls separate.
- If an academy publishes a final grade to a learner, academy approval is required.
- Instructor approval alone does not promote tenant content into shared Gold
  or the Cleared Content Bank.
- Never claim that Inverge provides a human expert review service.
- API authorization must match or exceed page authorization.

## Pricing and commercial product rules

The Owner-approved Founding Beta hypothesis is invitation-only, 69,000 KRW
VAT included for 30 days with no automatic renewal and 20
`usable_review_unit_v1`. It is not an activation, entitlement, public offer,
or permission to change billing. A later O4 packet is required.

Three unit contracts are disjoint:

- `ReviewUnit`: non-billable learning recovery/scheduling;
- `usable_review_unit_v1`: Founding Beta hypothesis meter;
- `deep_review_unit`: legacy S219/S220 premium meter.

They have no alias, balance sharing, fallback, conversion, or silent
migration. `usable_review_unit_v1` hypotheses are 1 unit for 10–25 points,
2 for 40–50, and 4 for 100. Missing points and 26–39 or 51–99 require an
explicit pre-submit estimate/manual decision; usage never increases after the
result.

Final target learner plan taxonomy:

- `free`: 0 KRW, one lifetime full-value review experience
- `second_os_basic`: 59,000~69,000 KRW/month hypothesis
- `second_os_pro`: 119,000~149,000 KRW/month hypothesis
- `second_control_premium`: 249,000~299,000 KRW/month hypothesis

One-off Deep Review SKUs:

- `deep_review_5`: 49,000 KRW hypothesis
- `deep_review_15`: 129,000 KRW hypothesis
- `deep_review_40`: 299,000 KRW hypothesis

Optional/later SKUs remain disabled until explicit future implementation and operational capacity exist:

- `managed_cohort`: 690,000~990,000 KRW / 8 weeks hypothesis, later only
- `season_pass`: later only

Academy list-price hypotheses:

- Academy Team: 1,490,000 KRW/month
- Academy Pro: 3,900,000 KRW/month
- Enterprise: from 7,000,000 KRW/month

Pricing remains configurable, versioned, and a hypothesis until paid-beta evidence. Never hard-code scattered UI/API literals or a launch-ready claim without billing, refund, privacy, cost, entitlement, and runtime gates.

No unlimited second-exam precision review is allowed. Deep Review Units must be consumed only through a future usage ledger; failed generation must not consume units; expensive provider work should reserve first and commit only after a usable result in a later implementation PR.

## Data and privacy boundaries

Use five separate planes:

- **Personal Raw Vault** for one user's raw captures, OCR, answers, notes,
  rewrites, and AI bodies;
- **Academy Tenant Vault** for one tenant's problems, rubrics, submissions,
  instructor edits, and approved prose;
- **Shared Signal Plane** for purpose-consented, pseudonymous,
  non-reconstructive derived signals only;
- **Cleared Content Bank** for rights-cleared or separately contributed and
  reviewed content only;
- **Model/Eval Registry** for version and evidence metadata, not raw content.

Existing `SAFE_DERIVED_SIGNAL_KEYS`, key-name sanitizers, and legacy telemetry
remain personal-service/legacy metadata and are not Shared Signal eligible.
A future O2 adapter needs a closed value-level schema of approved IDs, enums,
counts, and buckets, reconstructiveness tests, purpose consent, and no free
text.

Rules:

- Do not use a private raw learner answer directly for model training.
  Exact-purpose consent is necessary but not sufficient; O5 training input is
  limited to consented pseudonymous non-reconstructive signals or promoted
  Cleared Content Bank material.
- Private raw content never automatically enters a shared corpus or plane.
- Do not place raw learner answers, notes, handwriting, or raw OCR extraction
  in telemetry, logs, issue bodies, test fixtures, screenshots, or reference
  corpora. A separately authored, actually rights-owned contribution is a
  distinct object and can enter shared content only through the Cleared
  Content Bank path.
- Provide export/delete behavior before paid launch.
- Respect retention and tenant boundaries.
- Do not merge user artifacts into historical-question or reference-answer records.
- Keep private and Academy fingerprints domain-separated and vault-scoped;
  they must be keyed/one-way with vault-specific non-exportable domain keys
  and must not return an equality oracle.
  Global dedup identifiers require material already promoted into the Cleared
  Content Bank. Its basis is rights-cleared official/owner-created/contracted
  content, or a separately authored, actually rights-owned user contribution
  object; O3/review and quarantine always apply. It cannot reclassify a
  private service answer, note, handwriting artifact, or raw OCR.
  Pseudonymous-signal consent is not sufficient.
- Promotion quarantine may make one access-controlled, domain-separated
  least-privilege internal preflight comparison to the Cleared Content Bank
  after applicable rights prerequisites and user-owned contribution consent
  where required. It emits only decision metadata, no equality result to the
  source vault/user/tenant, and creates no global ID before promotion.
- Keep conflicting-answer, poisoning/anomaly, and held-out-contamination
  quarantine before rights promotion.
- Maintain a versioned Consent/Opt-out Ledger with separate purposes for
  personal service, pseudonymous product signals, Academy sharing,
  user-owned content contribution, and offline model training.
- Revocation stops future use for that purpose, including Shared Signal,
  Academy sharing, content promotion, or offline training/dataset refresh;
  deletion and retention remain purpose-scoped.
- Never perform any online model-weight update from any input. All permitted
  training is offline and requires an exact-scope O5 gate.
- Do not expose service-role keys or provider secrets.

## First-round source and standards rules

- Version official notices, exam rules, subjects, taxonomy, Law, and K-IFRS
  status.
- Record Q-Net rights per post and per attached asset; an item inherits the
  most restrictive decision.
- Private capture remains `private_personal_use_only` and is never promoted
  or reclassified. Only a distinct, separately authored, actually
  rights-owned contribution object may follow the Cleared Content Bank path.
- Define rapid answer grid, five-choice feedback, and `K/C/A/R/T/G`
  knowledge/concept/application/reading/time/guessing contracts.
- Keep timed, OMR, Gold, and held-out contracts physically and logically
  separate.
- QTI 3 and xAPI/Caliper are compatibility targets, not certification claims.

Dependency and model adapters use the state vocabulary `proposed`,
`benchmark_only`, `shadow`, `limited_activation`, `active`, and `rollback`.
This reset schedules only
`proposed → benchmark_only → shadow → limited_activation`; its required safety
path then goes to `rollback`. `limited_activation → active` is unscheduled and
not authorized. O4E authorizes limited activation only, never `active`; a
future active transition requires that exact adapter/version/config's
limited-activation evidence, a new roadmap item, and a separate exact-scope O4
approval distinct from O4E. `rollback` is directly available from benchmark,
shadow, limited activation, and active.
OpenCV/PaddleOCR begin as benchmarks. `ts-fsrs`/`pyBKT` remain
`benchmark_only`, with no learner-hidden instrumentation, until
adapter-specific benchmark/comparison evidence exists and the exact-scope O2
measurement/consent gate is approved. Only then may they enter learner-hidden
`shadow`; `ts-fsrs` additionally requires beta evidence and `pyBKT` sufficient
closed-schema skill-event data. IRT/CAT remains a contract-only offline
analysis/simulation lane after sufficient independent attempts and
contamination-safe held-out data; this reset authorizes no IRT/CAT execution.
Synthetic or non-personal rights-cleared fixtures may be eligible for a
separately authorized future offline analysis under their source rights; this
reset does not authorize it. Any learner- or Academy-derived attempt signal
instead requires an exact O2-approved purpose, purpose consent, a closed
non-reconstructive value schema, purpose-scoped retention/revocation, and
storage in the Shared Signal Plane; tenant contract alone is insufficient and
raw content is prohibited.
Any IRT/CAT fitting, training, or dataset refresh requires eligible inputs,
separate exact-purpose consent, and an exact-scope O5. Any future runtime
model/parameter/config output starts as a new `proposed` candidate.

Transition requirements are edge-specific. `proposed → benchmark_only`
requires a pinned version, license/SBOM, model-asset rights where relevant, an
isolated benchmark environment, a fallback adapter, a named owner, and a
tested rollback plan; it requires neither prior performance/comparison
evidence nor an activation gate. Its named owner must still manually select
the queued roadmap item; benchmark entry or execution is never automatic.
`benchmark_only → shadow` requires stage-specific benchmark/comparison
evidence, exact-scope O2 measurement/consent, and the adapter-specific
prerequisites above. `shadow → limited_activation` requires shadow evidence
from the same exact adapter, version, and configuration, plus an exact-scope
O4E approval naming adapter, version/config, cohort, and purpose. Evidence
cannot transfer across adapters, versions, or configurations, and no
transition is automatic. Rollback is an immediate fail-safe transition and
never waits for a new Owner gate or fresh comparison evidence; its tested plan
must exist before entering any non-proposed stage. This contract does not
activate a dependency, provider, prompt, model, or telemetry.

`shadow` is observation/comparison only. The native fixed schedule and native
rules remain the sole decision authority. Shadow output cannot change
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

## Nudge and ethics rules

- Set a good default next action.
- Always provide easy override options.
- Use smart friction only to clarify consequence, never to shame.
- Normalize mistakes as learning input.
- Never use dark patterns:
  - shame or fear language
  - ranking pressure
  - addictive streak mechanics
  - fake urgency / manipulative scarcity
  - intentionally degraded free output
  - hidden answer access designed only to force payment

## UX and design rules

- One screen = one primary action.
- Reduce extraneous cognitive load.
- Logged-in app must not render public marketing UI.
- Keep law, theory, and practice clearly identifiable while preserving one common workflow.
- Home should feel like a calm operating screen.
- Korean copy must be calm, precise, and operational.
- Visual direction: warm, minimal, premium, low-noise.
- Use `docs/DESIGN_SYSTEM_IMPLEMENTATION_SPEC.md` and `docs/inverge-design-system.md` for UI decisions.

## Prohibited product patterns

- payment-first flow before the one complete free review
- complex control-room dashboard in learner execution
- score-first UX with no next action
- dashboard clutter in execution flow
- broad AI hype copy
- partial-subject public paid launch presented as complete
- pass-probability simulation
- unsupported practice calculation presented as certain
- unverified generated answer presented as released

## Priority and quality bar

Treat these as blocking or high-priority risks:

- access/security failures
- auth/session breakage
- data loss or entitlement overwrite bugs
- first-round or unsupported exam scope exposed in product-facing surfaces
- production route crashes
- rights-unclear raw question exposure
- fabricated legal source or case citation
- incorrect practice calculation released as verified
- score deductions without learner-answer evidence
- reference-answer/rubric mismatch
- learner and academy tenant boundary failure

## Done criteria

A task is done only when:

- implementation is complete;
- lint, typecheck, build, and relevant tests pass;
- quality evals for the changed domain pass;
- relevant rights/source status is recorded;
- runtime evidence is supplied when required;
- cost and data boundaries are checked;
- changed files and remaining risks are reported.

A source-level green check does not prove real runtime behavior or content correctness.

## Autonomous delivery contract

- One issue produces one focused, reviewable pull request.
- Every implementation PR must link exactly one GitHub issue using `Closes #<issue>` or `Fixes #<issue>`.
- Each issue must define goal, non-goals, risk classification, acceptance criteria, runtime evidence requirements, rollout/rollback, and remaining risks.
- Do not ask the human about routine implementation details, file selection, naming, test placement, or ordinary refactoring choices.
- Make reasonable implementation decisions independently.
- Never weaken or delete an existing test merely to make CI green.
- Never conceal skipped runtime or quality verification.
- Use feature flags for incomplete or operationally risky behavior.
- A task is not complete merely because source-level tests pass.

## Mandatory human-decision conditions

Stop implementation and create a `human-decision` record only when:

- product scope or learner promise must change;
- official-source or redistribution-rights interpretation is ambiguous;
- authentication, entitlement, billing, refunds, privacy, retention, destructive data transformation, or production secrets require a policy choice;
- a new production dependency or provider is required;
- reference-answer release criteria or calculation tolerances would be weakened;
- public three-subject launch gate would be bypassed;
- the proposed work exceeds the stated cost or operational budget;
- the same CI/review failure remains after three repair attempts;
- rollback cannot be made safe.

Do not stop for ordinary implementation choices.

## Review guidelines

Treat the following as blocking P1 findings:

- Auth, RLS, role, or tenant bypass.
- Raw learner content crossing the documented data boundary.
- Official grading/model-answer/pass-probability claims.
- Rights-unclear question text exposed publicly.
- Fabricated legal/case/source references.
- Unverified or incorrect practice calculation released.
- Reference answer released with unresolved blocker.
- Migrations without idempotency and rollback/disable instructions.
- Payment activation based on client input.
- Workflow changes that grant broader token permissions.
- Skipped required runtime or quality evidence.
- Weakened regression tests.
- Today Plan showing more than three primary tasks.
- Learner and academy surfaces becoming mixed.
- API authorization weaker than its page authorization.

## No-test-weakening rule

Never weaken, delete, or modify an existing test solely to satisfy CI. If a test fails due to new implementation, fix the underlying bug or justify the test update through a human-decision when policy changes.

## Source-only vs runtime evidence rule

For operations requiring runtime evidence, tests must be accompanied by runtime validation artifacts such as aggregate logs or manual session outcomes. A test that only inspects source-level behavior cannot declare runtime success.

Content-quality work also requires domain eval evidence. A structurally valid JSON output cannot by itself prove legal, theoretical, or calculation correctness.

## Risk and roadmap sources of truth

- Cross-track product order, glossary, data planes, gates, and commercial
  hypothesis: `docs/dabangil-unified-program-contract.md`
- Second-round product detail:
  `docs/inverge-second-round-final-product-spec.md` and
  `docs/dabangil-second-exam-premium-os.md`
- Active work, dependencies, lock groups, status, and WIP limits: `roadmap/active-program.yml`
- Risk paths, signals, blocking labels, and automation policy: `config/agent-risk-policy.yml`
- Do not duplicate or independently redefine active roadmap status inside this file.

Roadmap primary status must use runner-supported values. Encode future gates
as `queued` items with unmet dependencies so they consume no mutation WIP.
`blocked` and `human_decision` consume WIP and are not future-state labels.
The runner enforces only one flat exact-string `lockGroup`; it does not
automatically enforce global, hierarchical, multi-lock, cross-run, or
owned-file exclusivity. Serialize shared source-of-truth, schema, auth/RLS,
billing, and control-plane mutation at overall WIP one through dependencies
or an explicit manual Owner gate.

Owner gates:

- O1: product order and scoped supersession;
- O2: Production measurement, consent, retention, and telemetry;
- O3: rights, Gold reviewers, and public/shared content;
- O4: migration, secret, provider, price/payment, real users, and flags;
- O5: research opt-in, offline training, and efficacy claims.

O1 is approved only for the Post-#650 reset. O2–O5 remain unmet until a
separate exact-scope approval packet is accepted.

## Review focus

- Security, role, tenant, and access-control boundaries.
- Accuracy and provenance of historical questions and reference answers.
- Legal-source version correctness.
- Practice calculation and unit correctness.
- Answer-review evidence quality and rewrite usefulness.
- Error-note and concept-state correctness.
- Accessibility and keyboard/screen-reader behavior.
- Visual consistency and responsive behavior.
- Golden-image provenance and screenshot diff evidence.
- Performance and AI-cost regressions.
- Test weakening or hidden skipped checks.
