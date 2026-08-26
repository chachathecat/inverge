# Inverge Owner Study OS

## Current main

- SHA: `3e78b8d783506bed676f817a4efe23d576ad5568`
- tree: `268de11f1ca7f0a7c0453020bcbf2681217821c1`

## Current milestones

- `PARALLEL_EXECUTION_V1`, M1 / C3R-T, M2 / C3R-L, M3 / Foundation Freeze, and M4 / common Kernel plus frozen `SubjectAdapterV1`: merged and validated
- M5 / Study Capacity runtime bridge: active
- Question Foundry V1: Draft integration-held after M5
- M6–M10: not started

## Branches and PRs

- M4: merged PR #842 from `codex/owner-study-lane-b-first-stage-kernel-replan-4`
- M5: `codex/owner-study-m5-study-capacity-runtime-bridge`; isolated worktree `.agent-factory/worktrees/owner-study-m5-study-capacity-runtime-bridge`; PR not opened
- Question Foundry: `codex/owner-study-lane-c-question-foundry`; Draft PR #810; parked pending M5 and a clean rights-safe refresh

## Lane ownership

- M5 owns exactly the ten paths in `config/dabangil-first-stage-study-capacity-runtime-bridge-v1.json`, including the sole active log and serial shared-test registration gate
- M5 does not mutate the frozen Kernel/`SubjectAdapterV1`, migrations, auth/RLS, packages/locks, common durable substrate, remote Supabase, or Production
- Question Foundry retains its disjoint nine-path implementation manifest and no current merge authority

## Completed receipts and merge results

- PR #800/#806 / C3R-P: reviewed `8f434027e5d20a5f3e799b1c2d85876e766b3858` and `2b24f29d8e7a8ad41289775a449afce3c0ef5b44`; repaired resulting main `f3251d0161873c0113d82ee2e72b422436a01158`
- PR #807/#808 / start and parallel gates: reviewed `eae0cfc27d6c44f244cd368882fdbdeae7282a0c` and `b06874e4e354e690da53ecd8497fdda04d2cf6ae`; parallel resulting main `cad8b98e4f13a2fe50d82ffd983616adc70eb75a`
- PR #816/#818/#820/#834 / C3R-T: reviewed stage head `96933cbe08864c6b3cb94a7349cb33e92bf2df8d`; repaired and receipt-validated through resulting main `a121eea722fd2a9054d11a5c0e5f3893b52da014`
- PR #832/#834 / C3R-L: reviewed `fa0084b13ea2e6c2bedf72f0084d57c66158bd4d`; receipt-validated through resulting main `a121eea722fd2a9054d11a5c0e5f3893b52da014`
- PR #838 / Foundation Freeze: reviewed `2106d370b2725d3f03923db3a6d279e94778bd6d`; resulting main `aded1d711c837aa6e93470d3b31bd75907452996`; tree `313056e25e3296d1546e909389eb0ad014da5a66`
- PR #842 / common Kernel and frozen `SubjectAdapterV1`: reviewed `b56f9d6db73f15b906f438419ccd818dc65ce11b`; reviewed/resulting tree `268de11f1ca7f0a7c0453020bcbf2681217821c1`; resulting main `3e78b8d783506bed676f817a4efe23d576ad5568`; required checks passed; review `0/0/0`; zero unresolved actionable threads

## Current blocker

- M5 must complete its projection-only server candidate-source bridge, Owner-only adapter-blocked capacity preview, focused/runtime checks, Draft PR exact-head CI, and fresh review without inventing subject scheduling policy

## Next exact action

- finish the exact ten-path M5 vertical, run focused tests/typecheck/lint/build/path checks, commit, push, and open one Draft PR
