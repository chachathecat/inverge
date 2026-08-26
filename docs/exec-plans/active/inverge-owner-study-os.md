# Inverge Owner Study OS

## Current main

- SHA: `fd8d0039bbeb2981935fdb671094e37d73a34400`
- tree: `1d338b7be92cfc98c00611b4ff3f2b75dea1784d`

## Current milestones

- M1 / C3R-T, M2 / C3R-L, M3 / Foundation Freeze, M4 / common Kernel plus frozen `SubjectAdapterV1`, and M5 / Study Capacity runtime bridge: merged and validated
- Question Foundry V1 second clean replacement: active, source-only/offline/default-off
- M6–M10: not started

## Branches and PRs

- M5: merged PR #845 from `codex/owner-study-m5-study-capacity-runtime-bridge-r1`
- Question Foundry: `codex/owner-study-question-foundry-r2`; isolated worktree `.agent-factory/worktrees/owner-study-question-foundry-r2`; PR #847; implementation head `406ea48c2a946da77d470c9a289324bd69f52359`; tree `5fd670b570a9b9781b176632663fb02ed5ed6cea`; source correction 2/2 repairs the exact-head numeric, callback-preflight and bank-lifecycle findings
- Exhausted candidates: PR #846, PR #843 and PR #810 closed unmerged

## Lane ownership

- Question Foundry owns exactly the eleven paths in `config/dabangil-question-foundry-v1.json`, including this sole active log and serial shared-test registration
- It does not mutate the frozen Kernel/`SubjectAdapterV1`, migrations, auth/RLS, packages/locks, common durable substrate, remote Supabase, Production, public, payment, or external learner activation

## Completed receipts

- PR #800/#806 / C3R-P: repaired resulting main `f3251d0161873c0113d82ee2e72b422436a01158`
- PR #807/#808 / start and parallel gates: resulting main `cad8b98e4f13a2fe50d82ffd983616adc70eb75a`
- PR #816/#818/#820/#834 / C3R-T and PR #832/#834 / C3R-L: receipt-validated through `a121eea722fd2a9054d11a5c0e5f3893b52da014`
- PR #838 / Foundation Freeze: reviewed `2106d370b2725d3f03923db3a6d279e94778bd6d`; resulting main `aded1d711c837aa6e93470d3b31bd75907452996`; tree `313056e25e3296d1546e909389eb0ad014da5a66`
- PR #842 / common Kernel and frozen `SubjectAdapterV1`: reviewed `b56f9d6db73f15b906f438419ccd818dc65ce11b`; resulting main `3e78b8d783506bed676f817a4efe23d576ad5568`
- PR #845 / Study Capacity bridge: reviewed `162d21df9ae77fb22888ab80c03992304f021717`; resulting main `fd8d0039bbeb2981935fdb671094e37d73a34400`; tree `1d338b7be92cfc98c00611b4ff3f2b75dea1784d`; required checks passed; review `0/0/0`; zero unresolved actionable threads

## Current blocker

- PR #847 source correction 2/2 must pass focused/full gates and fresh exact-head review; no acceptance gate is waived

## Next exact action

- run the full required local suite and exact-head CI, audit live review threads, and obtain a fresh formal `0/0/0` review before the Owner merge gate
