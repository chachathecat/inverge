# Inverge agent rules

## Product source of truth

The implementation source of truth is:

1. `docs/inverge-second-round-final-product-spec.md`
2. `docs/dabangil-second-exam-premium-os.md`
3. `roadmap/active-program.yml`
4. this `AGENTS.md`

If older product, business-model, roadmap, or closed-beta documents conflict with the final second-round specification or the S200R Dabangil premium OS brief, follow the final specification, the S200R brief, and the latest active program.

## Product scope (fixed by human decision on 2026-06-25)

This repository is focused ONLY on learner-facing 감정평가사 2차 for all three subjects:

- 감정평가실무
- 감정평가이론
- 감정평가 및 보상법규

All three subjects must be complete and pass the integrated quality/release gates before public paid launch.

감정평가사 1차 code may remain for compatibility and rollback, but it is frozen:

- do not add new first-round features;
- do not surface first-round entry in landing, onboarding, navigation, pricing, or learner product copy;
- do not schedule first-round corpus, quick-solve, or commercial work in the active program;
- do not delete first-round code or regression coverage solely to simplify a task.

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

## CASIO fx-9860GIII practical routine rules

The practical calculator model is fixed as `casio_fx_9860giii`.

Required principle:

> 시험장 리셋 후에도 손으로 재현 가능한 fx-9860GIII 타건 루틴만 훈련한다.

Every GIII routine specification should support formula, extracted values, hand-keyed sequence, expected display, unit check, rounding check, answer-sheet transfer template, common mistake warnings, reset-safe reproduction, and no stored-program dependency.

Do not teach calculator program storage as an exam strategy.

## Separate B2B Academy Console scope

A separate instructor-facing B2B scope is allowed and planned.

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
- Never claim that Inverge provides a human expert review service.
- API authorization must match or exceed page authorization.

## Pricing and commercial product rules

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

Separate:

- official/public/licensed reference data;
- user-owned raw answers, OCR, rewrites, and uploads;
- safe derived learning signals;
- academy tenant-scoped learner data.

Rules:

- Do not use learner answers for model training without explicit consent.
- Do not place raw learner answers or OCR text in telemetry, logs, issue bodies, test fixtures, screenshots, or reference corpora.
- Provide export/delete behavior before paid launch.
- Respect retention and tenant boundaries.
- Do not merge user artifacts into historical-question or reference-answer records.
- Do not expose service-role keys or provider secrets.

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

- Product and commercial decisions: `docs/inverge-second-round-final-product-spec.md`
- Active work, dependencies, lock groups, status, and WIP limits: `roadmap/active-program.yml`
- Risk paths, signals, blocking labels, and automation policy: `config/agent-risk-policy.yml`
- Do not duplicate or independently redefine active roadmap status inside this file.

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
