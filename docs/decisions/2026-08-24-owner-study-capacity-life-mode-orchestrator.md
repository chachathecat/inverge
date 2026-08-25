# 2026-08-24 Owner Decision — Study Capacity & Life-Mode Orchestrator v1

- Repository: `chachathecat/inverge`
- Status: proposed dated Owner decision; repository authority only after a protected expected-head-pinned merge
- Risk: medium
- Production authorization: none
- Runtime activation authorization: none
- Relation to PR #800: strictly separate; PR #800 source, branch, metadata, reviews and runtime evidence are immutable to this Work

## Decision

Implement one independently complete, default-off, deterministic source vertical for study-capacity and life-mode-aware planning.

The vertical must distinguish:

- full-time study from full-time employment, part-time employment, shift work, caregiving, health constraints and custom constraints;
- declared study windows from active study minutes;
- weekday from weekend capacity;
- high, medium, low and recovery cognitive-load budgets;
- first-round, second-round and combined-exam modes;
- schedule feasibility from pass probability;
- plan/block completion from mastery;
- study time from AI-generation entitlement or cost.

This decision preserves the existing product rule:

```text
CoreOutcome <= 3
ExecutionBlock = 0..N within evidence-supported capacity
```

It does not interpret `10 hours` as an official passing condition or a universal default. A full-time learner may have a 180-minute recovery day, while an employed learner may have a 600-minute weekend day. Life mode is a scheduling constraint, not an effort, ability, price or seriousness score.

## Exact separation from PR #800

This Work must not change any path in PR #800 and must not change:

- PR #800's branch, head, base, title, body, Draft state, review threads or checks;
- any `c3r-p` source, migration, workflow, API, component, runtime script or runtime test;
- `AGENTS.md`, dated decisions already governing C3R-P, canonical unified contracts, `roadmap/active-program.yml`, migration inventory or selector state;
- Supabase, Storage, RLS, environment variables, Vercel settings, provider configuration, billing, public navigation, real-user access or Production.

PR #800 remained an independent C3R-P candidate while this source Work was opened. It has since merged through the protected exact-head path; live GitHub identifies resulting `main` as `71fd878a7369c25a153bc90389347039684c501f` with tree `f6fb7bc1d1613a8431a4bbdfe155eea9d9f5303c`. That terminal dependency permits this source PR to proceed through its own ordinary Ready/review/merge gates, but this decision neither completes, supersedes nor supplies a receipt for C3R-T or C3R-L.

## Authorized source implementation

After re-fetching exact `main`, confirming the exact new branch/path set is absent and treating PR #800 as read-only, this decision authorizes one ordinary branch and one Draft pull request containing exactly these paths:

1. `docs/decisions/2026-08-24-owner-study-capacity-life-mode-orchestrator.md`
2. `docs/product/dabangil-study-capacity-life-mode-orchestrator-v1.md`
3. `config/dabangil-study-capacity-life-mode-orchestrator-v1.json`
4. `docs/qa/dabangil-study-capacity-life-mode-orchestrator-validation.md`
5. `lib/review-os/study-capacity-life-mode-orchestrator.ts`
6. `tests/study-capacity-life-mode-orchestrator.test.mjs`
7. `tests/dabangil-study-capacity-life-mode-contract.test.mjs`

The implementation is source-complete only for a pure deterministic policy engine. It may expose no learner UI, persist no profile or plan, and activate no runtime. Later integration into authenticated Today/Full-Day, onboarding, persistence and calibration requires a separate live-authority reconciliation after the current merge-producing writer is terminal.

## Required behavior

The source vertical must provide:

- `LifeModeV1`, `ExamModeV1`, `StudyPhaseV1` and daily-changing capacity-band contracts;
- a 30–720 active-minute envelope;
- deterministic as-of-date calibration from distinct valid prior dates in the recent 28-day horizon, with 7-day and 14-day evidence levels that exclude app interaction and provider waiting;
- fatigue/error guardrails without medical diagnosis or shame copy;
- environment-aware study windows, usable nonprotected-window capacity bounds and protected-window rejection;
- deterministic task ranking and allocation;
- high-interruption rejection for high-load work, max-continuous enforcement, atomic bounded splitting and employed-weekend routing;
- max-three CoreOutcomes with more than three ExecutionBlocks when capacity permits;
- arithmetically exact `PlanGapV1` and usable-window-bounded weekly feasibility projections without pass prediction;
- bounded replan decisions that classify the unchanged candidate scope exactly once with no backlog cloning;
- verified-bank-first personal drills with zero new-generation budget while a match exists, then 48-hour-capacity-bounded personal generation only on a gap;
- no mastery mutation from schedule generation or block completion;
- deterministic replay and fail-closed invalid input handling.

## Non-goals

This decision does not authorize:

- a first-round public product;
- 1차 content publication, question-bank import or user upload reuse;
- learner profile persistence or demographic inference;
- calendar, push, mobile or instructor integration;
- a new scheduler dependency, OR-Tools, FSRS or pyBKT;
- pass probability, score prediction or required-study-hour claims;
- pricing or plan entitlement based on life mode or study hours;
- AI problem generation counted as readiness evidence;
- another master plan, V14, roadmap selector change or active-stage change.

## Safety and evidence invariants

```text
life_mode_to_effort_rating = 0
life_mode_to_price_discrimination = 0
logged_time_to_mastery = 0
block_completion_to_mastery = 0
assisted_success_to_independent_success = 0
same_surface_retry_to_transfer = 0
plan_gap_to_pass_probability = 0
app_interaction_to_active_study = 0
provider_wait_to_active_study = 0
backlog_clone_on_replan = 0
personal_generation_to_readiness = 0
personal_generation_to_cross_user_reuse = 0
pr800_changed_path_overlap = 0
remote_or_production_mutation = 0
```

## Merge and continuation boundary

The original Draft-only boundary applied while PR #800 occupied the sole merge-producing writer slot. PR #800 is now terminal with a validated resulting-main receipt, and the Owner Study OS program expressly requires this source PR to merge before runtime-bridge work. This PR may therefore be marked Ready and squash-merged only after refreshed-main exact-head tests, required CI, zero unresolved actionable threads and fresh actionable P0/P1/P2 `0/0/0` review.

Runtime/UI/persistence integration remains blocked pending fresh authority and path reconciliation plus a separate exact-scope authenticated integration Work. Source merge does not authorize runtime activation, Supabase/Production mutation, public first-round exposure, payment or external learner activation. Follow-on work proceeds only under the then-live Owner Study OS milestone order.
