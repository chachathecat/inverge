# Inverge Owner Study OS

## Current main

- SHA: `cad8b98e4f13a2fe50d82ffd983616adc70eb75a`
- tree: `dae1e5d7a2d7138f2e793f50e08f721ece354472`

## Current milestones

- operating amendment: `PARALLEL_EXECUTION_V1` merged and validated; no runtime
- M1 / C3R-T: active in Lane A from the validated amendment resulting main
- M4 / first-stage common kernel: Draft candidate integration-held and Lane B parked for the shared access-registry handoff
- Question Foundry V1: active in Lane C
- M2, M3, M5–M10: not started; integration remains blocked by declared order

## Branches and PRs

- Lane A: `codex/owner-study-lane-a-c3r-t-replan-1`; worktree `.agent-factory/worktrees/owner-study-lane-a-replan-1`; base `cad8b98e4f13a2fe50d82ffd983616adc70eb75a`; no PR yet; replacement candidate exact 20-path manifest; focused `66/66`, full `1558/1558`, typecheck, lint, production build and diff checks clean; fresh review `0/0/0`. Predecessor Draft PR #815 closed unmerged at head `6c1e3430c5d9a508bbbecf2113772c2ddeb1d514` after its exact-head fixture attempted a no-change commit and its native service assertion read record counts in the same unordered expression as mutating RPCs
- Lane B: `codex/owner-study-lane-b-first-stage-kernel`; worktree `.agent-factory/worktrees/owner-study-lane-b`; base `cad8b98e4f13a2fe50d82ffd983616adc70eb75a`; Draft PR #813 correction-trigger head `9e0b8306809a40302953328924efcfe7678e91f8`; tree `ef74ee83cd17192f306749b21a8699b1e0231fe8`; local full/focused/typecheck/lint/build/diff clean; Draft integration-held and lane parked; required CI and final review pending
- Lane C: `codex/owner-study-lane-c-question-foundry`; worktree `.agent-factory/worktrees/owner-study-lane-c`; base `cad8b98e4f13a2fe50d82ffd983616adc70eb75a`; Draft PR #810 head `c7a3fd818259b088acd8caf0e5cb6efed4c8becb`; tree `1ab32f16cad5154fe89274cde2ce678ea363c47c`; all required checks successful; formal review `0/0/0`, zero threads; integration-held
- frozen read-only M1 donor: `codex/wcv-c3r-t-theory-durable-learning-delta`; worktree `.agent-factory/worktrees/c3r-t`; base `c269d8fa489dc1ac77ef77d203dadffc0e4e73e5`; no PR

## Lane ownership

- Lane A / second stage: C3R-T app/API/UI/runtime/config, the two declared C3R-T migrations, its exact-head runtime workflow, C3R-P durable-integration verifier/test seams, C3R-T and specialized access-guard tests, and this log
- Lane B / first stage: parked/read-only; Draft first-stage common MCQ kernel, SubjectAdapter, route/UI, config, and focused test remain integration-held
- Lane C / foundry: Question Foundry config/contracts/generation/validation/audit/offline script and focused test
- shared auth/RLS, packages/locks, frozen amendment artifacts, `AGENTS.md`, and `scripts/run-node-tests.mjs`: no lane mutation

## Completed receipts

- PR #800: reviewed `8f434027e5d20a5f3e799b1c2d85876e766b3858`; resulting main `71fd878a7369c25a153bc90389347039684c501f`; tree `f6fb7bc1d1613a8431a4bbdfe155eea9d9f5303c`
- PR #806: reviewed `2b24f29d8e7a8ad41289775a449afce3c0ef5b44`; resulting main `f3251d0161873c0113d82ee2e72b422436a01158`
- PR #807: reviewed `eae0cfc27d6c44f244cd368882fdbdeae7282a0c`; resulting main `c269d8fa489dc1ac77ef77d203dadffc0e4e73e5`; tree `90c725a3f82665d8533a20254f1088de86fef18c`; contribution present and unreverted
- PR #808: reviewed `b06874e4e354e690da53ecd8497fdda04d2cf6ae`; resulting main `cad8b98e4f13a2fe50d82ffd983616adc70eb75a`; resulting tree `dae1e5d7a2d7138f2e793f50e08f721ece354472`; exact-head checks and actionable review `0/0/0`; contribution present and validated

## Current blocker

- none in source; exact-head runtime and CI remain pending until the replacement Draft PR exists

## Next exact action

- create the first ordinary replan commit, push without force, open one new Draft PR and inspect its exact-head runtime and CI
