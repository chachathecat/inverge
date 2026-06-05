# Closed Beta Learning Loop QA v2

Date: 2026-06-05  
Base: `work` at PR #319 (`Add Today Plan source union (#319)`)  
Scope: QA + guardrail tests only. No payment, public archive UI, new exams, live notifications, instructor grading changes, Supabase migrations, dashboard, or major UI changes were added.

## Summary verdict

**Source/helper-level pass with durable-persistence caveats.** The closed-beta learner loop remains coherent at the route and helper level after the Today Plan Source Union layer:

- Capture and answer-review flows can create sanitized learning signals.
- Execution surfaces expose result controls that produce learning outcomes without raw problem/answer/OCR text fields.
- Review Queue remains the durable learner recovery surface.
- Personal Concept Graph can rank and adapt concept nodes, and the repository adapter is metadata-only, but it is intentionally in-memory/test-only in this PR line.
- Today Plan Source Union safely merges Review Queue, Personal Concept Graph, and Study Schedule metadata into max-3 metadata-only actions.
- Staging route checks are source-level because no authenticated browser/base URL credentials are available in this environment.

**Release stance:** acceptable for closed-beta helper-level QA; do not claim durable Personal Concept Graph persistence or unified Today Plan UI wiring until the next PR completes an explicit route/service integration pass.

## Routes inspected

| Route | Source inspected | QA result | Notes |
|---|---|---:|---|
| `/app` | `app/app/page.tsx` | Pass with integration gap | Loads Today Focus, Review Queue, Learning Signal events, and existing Today Plan task engine. Does not yet call `buildTodayPlanSourceUnion` directly. Existing UI Today Plan remains max 3 via `buildTodayPlanTasks`. |
| `/app/onboarding` | `app/app/onboarding/page.tsx` | Pass | Keeps first Today Plan creation copy and execution bridge routing for beginner tasks. |
| `/app/capture` | `app/app/capture/page.tsx` | Pass | Primary copy remains “오늘 한 것 올리기”; capture is not score-first. |
| `/app/review` | `app/app/review/page.tsx` | Pass | Review Queue stays retry/rewrite-focused, with capture-origin support metadata only. |
| `/app/calculator` | `app/app/calculator/page.tsx`, `components/review-os/calculator-workflow-page.tsx` | Pass | Preserves `practice`/`accounting` context routing and CASIO focus routing. |
| `/app/session` | `app/app/session/page.tsx`, `components/review-os/today-session-runner.tsx` | Pass | Runs selected queue/session item and includes execution result controls on completion surfaces. |
| `/app/write` | `app/app/write/page.tsx` | Pass | Remains a 2차 writing/rewrite execution surface; no instructor-grading route exposure found. |
| `/answer-review` | `app/answer-review/page.tsx`, `app/answer-review/answer-review-client.tsx`, `app/api/answer-review/structure/route.ts` | Pass with boundary note | Uses learner structure endpoint and learning-signal save path; does not call the older grading endpoint from the client. Raw inputs stay in the local learner request path, not in Today Plan/graph outputs. |

## Learner loop map

```text
1. Learner input/capture
   /app/capture, /app/write, /answer-review
   -> sanitized capture/answer-review structures and learning-signal inputs

2. Execution/result
   /app/session, /app/calculator, /app/first/ox, /app/write
   -> ExecutionResultControls labels: 완료 / 틀림 / 모르겠음 / 다시쓰기 필요 / 나중에
   -> execution learning signal helper

3. Recovery scheduling
   execution learning signal
   -> Review Queue item helper
   -> persisted Review Queue service/repository path where existing schema supports it

4. Personal understanding model
   execution-like signal
   -> Personal Concept Graph engine
   -> metadata-only repository adapter
   -> Today recommendations through Concept Graph Today Plan adapter

5. Unified recommendation layer
   Review Queue tasks + Personal Concept Graph actions + Study Schedule blocks
   -> Today Plan Source Union
   -> max 3, metadataOnly, deduped, learner-scope-safe actions
```

## What is connected

- `/app` is connected to persisted Today Focus / Review Queue and persisted learning signal events through `reviewOsService.getTodayFocus`, `getLearningSignalSummary`, and `listLearningSignalEvents`.
- `/app/review` reads the persisted Review Queue and keeps retry/rewrite as the visible next action.
- `/answer-review` calls `/api/answer-review/structure`; authenticated learner usage attempts to save a learning signal via `reviewOsService.createLearningSignalEvent`.
- Execution learning-signal helpers can generate Review Queue items and Personal Concept Graph updates without raw text fields.
- Today Plan Source Union helper accepts:
  - Review Queue items converted through existing Review Queue Today Plan prioritization.
  - Personal Concept Graph nodes/actions converted through the Concept Graph Today Plan adapter.
  - Study Schedule daily/weekly blocks as weaker fallback metadata.
- Guardrail tests now cover max-3 output, source precedence, dedupe, metadata-only output, raw text rejection, official-claim rejection, nudge-ethics rejection, blocked-surface copy rejection, and 감정평가사-only scope.

## What is helper-only

- `buildTodayPlanSourceUnion` is not yet directly wired into `/app` rendering; `/app` still uses the existing `buildTodayPlanTasks` engine.
- Personal Concept Graph repository adapter is explicitly in-memory/test-only in this PR line.
- Concept Graph Today Plan adapter is helper-level and covered by tests, but not yet a durable live learner route feed.
- Study Schedule metadata participates in Source Union tests, but there is no new schedule UI or dashboard.
- Staging route smoke checks are source-level; no Playwright authenticated hosted-route pass was run in this environment.

## What is not yet persisted durably

- Personal Concept Graph nodes are not durably persisted to Supabase in this PR; the adapter states that production durable persistence is pending an explicit review-os schema.
- Unified Today Plan Source Union output is not stored as a durable daily recommendation artifact.
- Study Schedule source metadata is computed helper output; the union does not create or mutate schedule persistence.
- No new Supabase migrations were created, per scope.

## UI/UX risks

1. **Dual Today Plan engines:** `/app` still renders the existing Today Plan task engine while the Source Union is helper-level. The user experience can pass closed beta, but future ranking parity risk remains until `/app` consumes union output or an adapter-normalized service response.
2. **One-screen/one-primary-action pressure:** `/app` contains the main Today Plan plus supporting cards/details. Existing max-3 task cap holds, but visual clutter should be manually checked at 360px and 390px widths before a larger beta cohort.
3. **Answer Review wording:** `/answer-review` uses “검토 보조 초안” style copy, which is acceptable for learner structure review. Continue avoiding official grading/final score language and keep it separated from instructor-console claims.
4. **CASIO copy:** CASIO calculator routing remains valid for 2차 calculation practice. Guardrails reject casino/gacha-style copy while allowing CASIO routing.

## Data-boundary risks

1. **Raw learner text:** Source Union and Personal Concept Graph repository reject raw/OCR/problem/answer/user text field names, but `/answer-review` necessarily accepts raw inputs transiently for structuring. Do not forward these raw fields into graph/shared/reference outputs.
2. **Unsupported exam leakage:** Internal actuarial routes/files still exist outside current learner scope. Learner route source checks guard `/app*` and `/answer-review`, and Source Union now rejects unsupported exam copy.
3. **Official-claim leakage:** Union tests reject official grading, official score prediction, official score, and official model-answer claims. Continue extending checks if new Korean/English claim variants appear.
4. **Durability mismatch:** Review Queue and Learning Signal events use existing repository paths; Personal Concept Graph remains non-durable helper/repository-adapter state.

## Staging smoke-check status

- Added/updated lightweight source smoke checks because this environment does not provide an authenticated staging base URL or invited-account credentials.
- Covered source-level assertions:
  - `/app` does not expose instructor/studio/admin links.
  - `/app/capture` keeps “오늘 한 것 올리기” and is not score-first.
  - `/app/review` stays review/retry-focused.
  - `/app/calculator` preserves CASIO/accounting/practice routing.
  - `/answer-review` remains separated from instructor grading and does not call `/api/answer-review/grade-second` from the client.
  - Today Plan helper output remains max 3.

## Recommended next PR

**Recommended next PR: “Wire Source Union into learner Today Plan service preview.”**

Scope should stay narrow:

1. Add a read-only service adapter that produces Source Union output for `/app` without storing raw text.
2. Feed Review Queue + Personal Concept Graph + Study Schedule metadata into that adapter from existing durable/safe sources.
3. Keep UI identical or near-identical; replace ranking source only behind a helper/service boundary.
4. Preserve max-3 primary tasks and one primary learner action.
5. Add one authenticated Playwright smoke once staging credentials/base URL are available.
6. Do not add migrations until the Personal Concept Graph durable schema is explicitly reviewed.
