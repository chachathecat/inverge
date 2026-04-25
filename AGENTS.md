# Inverge agent rules

## Product scope (fixed)
This repository is currently focused ONLY on:
- 감정평가사 1차
- 감정평가사 2차

Do not add, expose, or expand product-facing scope to:
- 보험계리사 / 계리사
- CPA
- 세무사
- TOEFL
- SAT
- universal exam track framing
- generic multi-exam messaging

If actuarial/insurance-related code exists internally, treat it as out of current product scope and do not surface it in landing, onboarding, navigation, exam selection, or product copy.

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
