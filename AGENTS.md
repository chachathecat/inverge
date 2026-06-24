# Inverge agent rules

## Product scope (fixed)
This repository is currently focused ONLY on learner-facing:
- 감정평가사 1차
- 감정평가사 2차

Do not add, expose, or expand learner-facing scope to:
- 보험계리사 / 계리사
- CPA
- 세무사
- TOEFL
- SAT
- universal exam track framing
- generic multi-exam messaging

If actuarial/insurance-related code exists internally, treat it as out of current learner product scope and do not surface it in landing, onboarding, navigation, exam selection, or learner product copy.

## Separate B2B Instructor Console scope (documentation policy)
A separate instructor-facing B2B scope is allowed in documentation when clearly separated from learner-facing Inverge.

- Product name for this surface: **학원용 답안 운영 콘솔**
- Audience: academy staff / instructors / graders only
- Purpose: **첨삭 운영 보조**, not learner-facing final judgment
- Allowed capability framing:
  - OCR answer upload
  - 채점 초안
  - rubric-based scoring draft
  - feedback/comment draft
  - reference answer draft
  - mandatory **강사 검수** before final release

Guardrails:
- Never present instructor console tools in learner navigation or learner UI
- Never claim AI final judgment or no-review grading
- Keep instructor routes separate (future direction: `/instructor` or `/studio`)
- Keep tenant separation and consent/reuse controls explicit in docs and implementation

## Product identity and positioning
Inverge is:
- 감정평가사 합격 운영 시스템
- a premium AI-based exam-prep operations system

Inverge is NOT:
- AI 채점기 / 자동 채점 서비스
- AI final-judgment product
- generic dashboard SaaS
- motivation/streak app

Core operating loop:
- input → diagnosis → tracking → prediction → recommendation → execution → retry/rewrite

## Learning behavior rules (non-negotiable)
- Never make passive review the default when retrieval/production is possible.
- Retrieval before explanation by default.
- Spaced review is opt-out, not opt-in.
- Feedback must identify one biggest gap and point to immediate action.
- Every feedback state must end in retry/rewrite/scheduled review (not score-only endpoint).
- Preserve one screen, one primary task.
- If >3 competing primary choices appear, simplify.

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

## UX and design rules
- One screen = one primary action.
- Reduce extraneous cognitive load.
- Logged-in app must not render public marketing UI.
- Keep 1차 and 2차 clearly separated.
- Home should feel like a calm operating screen.
- Korean copy must be calm, precise, and operational.
- Visual direction: warm, minimal, premium, low-noise (no loud generic AI SaaS look).
- Use `docs/DESIGN_SYSTEM_IMPLEMENTATION_SPEC.md` and `docs/inverge-design-system.md` for UI decisions.

## Prohibited product patterns
- payment-first flow
- complex control-room dashboard
- score-first UX with no next action
- dashboard clutter in execution flow
- broad AI hype copy

## Priority and quality bar
Treat these as high-priority risks:
- access/security failures
- auth/session breakage
- data loss or entitlement overwrite bugs
- unsupported exam scope exposed in product-facing surfaces
- production route crashes

## Done criteria
A task is done only when:
- implementation is complete
- lint passes
- build passes
- relevant smoke tests are run
- changed files and remaining risks are reported

## Autonomous delivery contract

- One issue produces one reviewable pull request.
- Do not ask the human about implementation details, file selection, naming, test placement, or routine refactoring choices.
- Make reasonable implementation decisions independently.
- Never weaken or delete an existing test merely to make CI green.
- Never conceal skipped runtime verification.
- Link every PR with `Closes #<issue>`.
- Keep implementation PRs focused. Split work when unrelated concerns or conflicting lock groups appear.
- Use feature flags for incomplete or operationally risky behavior.
- A task is not complete merely because source-level tests pass.

## Mandatory human-decision conditions

Stop implementation and create a `human-decision` record only when:

- Product scope or learner promise must change.
- Official-source interpretation is ambiguous.
- Authentication, entitlement, billing, privacy, destructive data transformation, or production secrets require a policy choice.
- A new production dependency or provider is required.
- The proposed work exceeds the stated cost or operational budget.
- The same CI/review failure remains after three repair attempts.
- Rollback cannot be made safe.

Do not stop for ordinary implementation choices.

## Review guidelines

Treat the following as blocking P1 findings:

- Auth or RLS bypass.
- Raw learner content crossing the documented data boundary.
- Official grading/model-answer claims.
- Migrations without idempotency and rollback/disable instructions.
- Payment activation based on client input.
- Workflow changes that grant broader token permissions.
- Skipped required runtime evidence.
- Weakened regression tests.
- Today Plan showing more than three primary tasks.
- Learner and instructor surfaces becoming mixed.

## No-test-weakening rule

Never weaken, delete, or modify an existing test solely to satisfy CI. If a test fails due to new implementation, either fix the underlying bug or justify a test update via a human-decision.

## Source-only vs runtime evidence rule

A source-level green check does not guarantee real behavior. For operations requiring runtime evidence (e.g., database migrations, push notifications, payments), tests must be accompanied by runtime validation artifacts such as logs or manual session outcomes. A test that only inspects source-level behavior cannot declare runtime success.

## Issue/PR linking rule

Every implementation PR must link exactly one GitHub issue using `Closes #<issue>` or `Fixes #<issue>`. The issue must clearly state goals, non-goals, risk classification, acceptance criteria, runtime evidence requirements, and remaining risks.
