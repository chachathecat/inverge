# 답안길 Study Capacity & Life-Mode Orchestrator v1 — Validation

- Contract: `dabangil.study_capacity_life_mode_orchestrator.v1`
- Status: source implementation validation
- Runtime/UI/persistence: not authorized by this Work
- PR #800 overlap: zero required

## 1. Validation objective

Prove that the deterministic policy engine can distinguish full-time, employed, irregular and recovery constraints without turning life mode or logged time into a learner-quality judgment.

The validation target is not a pass prediction. It is the narrower claim:

> Given metadata-only task candidates and declared/evidence-supported time windows, the engine produces a bounded, explainable plan that respects active-study capacity, cognitive-load budgets, environment, continuous-window requirements and max-three CoreOutcomes.

## 2. Source boundaries

Allowed inputs:

- life mode enum;
- exam mode and study phase;
- date/day-kind;
- metadata-only study windows;
- planned/actual minute counts;
- app-interaction and provider-wait minute counts;
- optional fatigue self-report and late-session error delta;
- metadata-only task identity, subject, task kind, load, minutes and priority signals.

Forbidden inputs and outputs:

- raw problem, answer, OCR, notes or copyrighted text;
- medical diagnosis or inferred disability;
- employer, income, company or job-performance data;
- pass probability, guaranteed score or official required study hours;
- pricing or entitlement decisions from life mode;
- mastery mutation from plan creation or block completion.

## 3. Focused command

```bash
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs \
  --test \
  tests/study-capacity-life-mode-orchestrator.test.mjs \
  tests/dabangil-study-capacity-life-mode-contract.test.mjs
```

Changed TypeScript must also pass the repository `npm run typecheck`, changed-file lint and `git diff --check` on the exact PR head.

## 4. Acceptance matrix

| Fixture | Required result |
|---|---|
| full-time first 600 | `CoreOutcome <= 3`, `ExecutionBlock > 3`, planned active minutes within capacity, non-high-load and buffer protected |
| full-time first 720 | max 720, high-load budget below whole day, medium/low/recovery budgets nonzero |
| employed weekday 180 | at most two CoreOutcomes, 120-minute timed task moves to weekend when no continuous window exists |
| employed weekend 420 | long timed task can execute in a valid continuous window |
| life-mode/capacity independence | full-time recovery day may be compressed; employed weekend may be full-day |
| shift commute 90 | commute-safe recall allowed; desk/calculator task denied |
| history 14 days | `actualActiveMinutes` is already net active study; app interaction/provider wait remain separate exclusion metadata and are neither added nor double-subtracted |
| history identity | explicit as-of date; distinct valid prior dates only; stale rows excluded; duplicate/current/future rows fail closed |
| fatigue/error evidence | capacity guardrail may reduce plan without diagnosis or shame copy |
| Plan Gap | `shortfall = max(0, required - forecast)` exactly; execution constraints remain separately visible; no pass probability |
| overtime 180→60 | unchanged candidate scope required; every candidate kept/deferred/dropped exactly once; backlog clone count exactly zero |
| AI drill budget | verified bank match gives personal generation budget/items `0/0`; only a bank gap can use remaining 48-hour capacity |
| first/second/both | all accepted; schedule output cannot mutate mastery |
| single exam mode | every candidate has `examTrack`; a foreign track is classified `exam_mode_excluded` before priority allocation, does not inflate Plan Gap and terminates weekly carryover after explicit evidence |
| combined exam distance | equal required candidates use the explicit target-date distance weight only for today/future dates within the 180-day horizon; past dates contribute zero |
| combined exam protection | only a required first-track `pass_risk` or required second-track `timed_evidence_missing|unseen_transfer_due` binding can activate the explicit floor; the same comparator governs placement and CoreOutcome identity, and an unmet first floor reports `pass_risk` in Plan Gap |
| recovery new study | non-required `new_study` is deferred before window placement; required work remains eligible |
| invalid windows | overlap and out-of-range minutes fail closed |
| narrow/protected/empty windows | weekly available capacity is bounded to usable nonprotected minutes, including zero |
| high-load continuity | high interruption denied; unsplittable over-limit work deferred; split work is atomic and bounded by `maxParts` |
| hostile input | raw/unknown fields, unknown enums, duplicate IDs/signals and non-finite priority fail closed |
| complexity bound | at most 256 candidates; load/active-impossible candidates short-circuit before split-placement search |
| Plan Gap domain bound | total required scope above 5,040 minutes fails closed; a generated plan at the bound remains valid replan input |
| week-date interval | every supplied day falls within one inclusive seven-day interval; an eight-calendar-day span fails closed |
| deterministic replay | identical input produces identical plan digest and blocks |
| data/copy boundary | no raw body key, shame phrase, guarantee or pass-probability claim |

## 5. Hard invariants

```text
core_outcomes_over_3 = 0
planned_active_minutes_over_capacity = 0
protected_window_use = 0
environment_incompatible_assignment = 0
high_load_in_high_interruption_window = 0
high_load_part_over_continuous_limit = 0
adjacent_high_load_run_over_continuous_limit = 0
partial_split_assignment = 0
non_splittable_long_task_fake_split = 0
life_mode_to_effort_or_price = 0
app_or_wait_to_active_study = 0
block_completion_to_mastery = 0
plan_gap_to_pass_probability = 0
backlog_clone_on_replan = 0
replan_candidate_unclassified_or_duplicated = 0
declared_capacity_over_usable_window_minutes = 0
duplicate_or_future_history_as_evidence = 0
verified_bank_match_personal_generation_budget = 0
unknown_or_raw_input_accepted = 0
candidate_count_over_256_accepted = 0
budget_impossible_exhaustive_placement_search = 0
generated_plan_gap_rejected_by_replan_range = 0
week_plan_dates_outside_one_seven_day_interval = 0
candidate_without_exam_track_accepted = 0
single_mode_foreign_track_scheduled = 0
unbound_or_optional_exam_protection_accepted = 0
single_mode_exam_protection_accepted = 0
recovery_nonrequired_new_study_scheduled = 0
personal_generation_to_readiness = 0
personal_generation_to_cross_user_reuse = 0
raw_body_in_plan = 0
pr800_changed_path_overlap = 0
remote_or_production_mutation = 0
```

## 6. Research and official-source boundary

The official Q-Net appraiser page is the source for exam subjects and timed exam structure. It does not establish an official daily study-hour requirement. Therefore 600/720-minute fixtures are product-policy fixtures for full-day operation, not passing requirements.

The break/fatigue research used in the product rationale supports separating structured work and recovery, but it does not prescribe one universal Pomodoro interval or prove a specific appraiser-study schedule. The engine therefore uses versioned load budgets and evidence calibration rather than a fixed timer dogma.

References:

- Q-Net, 감정평가사 자격상세정보: `https://www.q-net.or.kr/crf005.do?gId=60&gSite=L&id=crf00503`
- Biwer et al., *Understanding effort regulation: Comparing 'Pomodoro' breaks and self-regulated breaks*: PubMed `36859717`
- Diamond, *Executive functions*: PubMed `23020641`

## 7. Integration gate after this source PR

This source PR is complete when its exact changed-path manifest, focused tests, typecheck, lint, diff-check and fresh review are clean. It does not make the learner product complete.

PR #800 is terminal with a validated resulting-main receipt. This source PR may merge after its own fresh exact-head gates. Authenticated integration remains a separate Work and must re-fetch live authority. That later Work must cover:

- onboarding and explicit user consent for optional life-mode fields;
- learner-private persistence and RLS;
- Today/Full-Day UI at 390/768/1440 and 200% reflow;
- refresh/second-browser consistency;
- account A/B denial;
- offline/conflict/session-expiry false-success prevention;
- actual 7/14-day capacity calibration and Owner-private dogfood;
- rollback and feature kill switch;
- no change to mastery, readiness or AI entitlements without their own authority.
