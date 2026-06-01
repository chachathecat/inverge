# Inverge Closed Beta QA / Release Hardening v1

This checklist is the closed-beta release gate for the learner-facing Inverge app. It protects the existing learning operations loop only: **감정평가사 1차** and **감정평가사 2차**. It does not add payment, public archive browsing, instructor grading, or additional exam tracks.

## Release decision

- Decision: Pending / Approved / Blocked
- QA owner:
- Preview URL:
- Build SHA:
- Date:
- Known risks:

Block release if any critical learner route crashes, if a non-invited user can reach learner data, if raw learner text leaks into derived metadata/reference requests, if unsupported exam scope appears in learner UI, or if the app presents official score/pass/fail/final-grading claims.

## Automated gate

Run these commands before approving the closed beta:

```bash
npm run verify:learner-loop:ci
npm run check:taxonomy
npm run build
npm run check:closed-beta-readiness
```

`check:closed-beta-readiness` runs the learner-loop smoke contract, data-boundary tests, question-reference tests, route/source guard checks, and a production build. Playwright is not required for this PR. If a browser is unavailable, use the manual QA checklist below on the Vercel preview and record evidence.

## Manual QA checklist

### 1. Access / onboarding

- [ ] Non-invited account opens `/app` and sees a calm blocked state: “아직 초대 승인 전입니다.”
- [ ] Invited account opens `/app` and sees the learner operating screen, not marketing UI.
- [ ] Learner navigation has no admin, instructor, studio, payment, or public archive links.
- [ ] `/admin/*`, `/api/admin/*`, `/instructor`, `/instructor/second-grading`, and `/studio` do not expose public tools to a learner account.
- [ ] Onboarding remains limited to 감정평가사 1차 and 감정평가사 2차.

### 2. Capture-to-Note

- [ ] Mobile photo input is reachable at `/app/capture` and does not overflow at 360px.
- [ ] Multi-page image upload preserves page order and shows the editable OCR draft before save.
- [ ] PDF fallback does not crash; if OCR cannot run, the learner can enter/edit text manually.
- [ ] Low-confidence OCR shows a calm warning and asks for confirmation, not a hard failure.
- [ ] Saving creates one user-owned item and one safe learning signal/review entry.
- [ ] Raw OCR/problem/answer text is not copied into derived metadata, telemetry metadata, or reference requests.

### 3. Today Plan / Review Queue

- [ ] A saved capture appears in Today Plan.
- [ ] Today Plan defaults to at most 3 tasks.
- [ ] Details and reference hints are collapsed by default.
- [ ] The screen does not show pass/fail, official score, or score prediction copy.
- [ ] Complete, retry, rewrite, and scheduled-review paths can be executed without a route crash.

### 4. 1차 O/X

- [ ] Practice shows one statement at a time.
- [ ] O/X and certainty buttons work.
- [ ] Correct+certain produces no new learning signal flood.
- [ ] Wrong, confused, or unknown creates a safe learning signal.
- [ ] Concept popup appears only after learner friction.
- [ ] Smart cloze review renders safely and ends with a retry/review action.

### 5. Accounting/Economics Template

- [ ] Supported template calculates deterministically from extracted numeric inputs.
- [ ] Unsupported template degrades safely and stores classification/OCR review only.
- [ ] Invalid numeric input does not crash.
- [ ] LLM final-answer text is ignored as a calculation source.

### 6. 2차 Rewrite / CASIO

- [ ] Feedback shows one biggest gap and one rewrite action.
- [ ] Original answer summary and rewrite paragraph remain separate.
- [ ] Supported CASIO mapping shows deterministic keystrokes.
- [ ] Unsupported CASIO mapping shows fallback copy.
- [ ] No official grading, model-answer certainty, score, pass/fail, or final-judgment copy appears.

### 7. Reference Context / Question Archive

- [ ] Reference hints are optional and collapsed.
- [ ] No dense public archive dashboard is linked from learner flow.
- [ ] Question archive records are metadata-only.
- [ ] No raw/copyrighted problem text is required for hints.
- [ ] User raw text never enters the reference corpus.

### 8. 1차 → 2차 Mode Migration

- [ ] Migration is manual and requires explicit confirmation.
- [ ] 1차 history is archived, not deleted.
- [ ] Active mode becomes 2차 after migration.
- [ ] Today Plan emphasizes 2차 rewrite after migration.
- [ ] No pass/fail or official-result claim appears.

### 9. Data Boundary

- [ ] Telemetry sanitizer removes raw keys recursively.
- [ ] Derived metadata excludes raw OCR, user answer, problem, and rewrite paragraph fields.
- [ ] Reference requests strip raw fields before matching.
- [ ] Learning-signal metadata keeps safe derived fields only.

## UI guardrails

- [ ] Critical learner pages are mobile-first and have no horizontal overflow at 360px.
- [ ] One screen has one primary action.
- [ ] No raw JSON/debug/internal fields are learner-visible.
- [ ] No instructor UI, payment/paywall, official score, pass/fail, or public archive UI is exposed.
- [ ] Korean copy is calm, precise, and operational.

## Evidence log

| Flow | Result | Evidence / notes | Owner |
| --- | --- | --- | --- |
| Access / onboarding | Pending |  |  |
| Capture-to-Note | Pending |  |  |
| Today Plan / Review Queue | Pending |  |  |
| 1차 O/X | Pending |  |  |
| Accounting/Economics Template | Pending |  |  |
| 2차 Rewrite / CASIO | Pending |  |  |
| Reference Context / Question Archive | Pending |  |  |
| Mode Migration | Pending |  |  |
| Data Boundary | Pending |  |  |

## Closed Beta QA Agent Pass — 2026-05-31

- Branch basis: PR #291 / latest checked-out main after merge (`e9d483c`, `Document closed beta QA agent pass (#291)`).
- Mode: source-level and script-level QA only. Browser/Vercel preview access was unavailable in this environment, so visual/mobile/auth flows remain manual-only.
- Release-blocker result: no P0/P1 learner-facing closed-beta blockers found. No feature, payment, public archive UI, additional exam scope, or instructor grading changes were made.

### Commands run

| Command | Result | Evidence / notes |
| --- | --- | --- |
| `npm run verify:learner-loop:ci` | Pass | 147 learner-loop tests passed, 5 quality-eval tests passed, taxonomy check passed, and production build completed. Build emitted the existing Turbopack NFT tracing warning for `next.config.ts` → `lib/review-os/question-reference.ts` → `app/app/items/[itemId]/page.tsx`; no command failure. |
| `npm run check:taxonomy` | Pass | Sample taxonomy classifications returned high-confidence 감정평가사 1차/2차 nodes: 회계학 재고자산 저가법, 민법 물권변동, 감정평가 및 보상법규 사업인정. |
| `npm run build` | Pass | Next.js production build completed, TypeScript passed, and 46 static pages generated. Build emitted the existing Turbopack NFT tracing warning noted above; no route crash during build. |
| `npm run check:closed-beta-readiness` | Pass | Learner-loop verification, data-boundary tests, question-reference tests, route/source guard checks, and production build passed. Final script output: `[closed-beta-readiness] PASS: closed beta learner loop, data boundary, route/source guards, question references, and build passed.` |

### Evidence log

| Flow | Result | Evidence / notes | Owner |
| --- | --- | --- | --- |
| Access / onboarding | Source/script pass; manual preview pending | `/app` layout requires a server session and learner access before rendering the learner shell; non-allowed access shows the blocked invite state. `ensureAccess` preserves existing invite/entitlement state and only inserts new profiles as active when allowlisted. Browser checks for real invited/non-invited accounts remain manual-only. | QA agent |
| Capture-to-Note | Source/script pass; mobile device pending | Learner OCR and capture flows keep OCR drafts editable, support multi-page ordering/PDF fallback checks, avoid auto-save/auto-grade after OCR/PDF, and sanitize raw OCR/problem/answer text out of derived metadata. Real camera/gallery/PDF capture remains manual-only. | QA agent |
| Today Plan / Review Queue | Source/script pass; visual preview pending | Tests verified Today Plan/Review Queue routing, capped primary tasks, collapsed reference hints/details, retry/rewrite/scheduled-review actions, and no score/pass/fail prediction copy. 360px visual overflow remains manual-only. | QA agent |
| 1차 O/X | Source/script pass; visual preview pending | Tests verified one-statement practice, O/X/certainty behavior, no correct+certain signal flood, safe friction signals for wrong/confused/unknown, gated concept popup, and Smart Cloze retry/review routing. | QA agent |
| Accounting/Economics Template | Source/script pass | Tests verified deterministic supported calculations, safe degradation for unsupported templates, invalid numeric input handling, and ignoring LLM final-answer text as a calculation source. | QA agent |
| 2차 Rewrite / CASIO | Source/script pass; handwriting OCR pending | Tests verified one biggest gap + one rewrite action, original/rewrite separation, deterministic CASIO mapping when supported, fallback copy when unsupported, and no grading/score/pass/fail/final-judgment claims. Actual OCR quality with handwritten answers remains manual-only. | QA agent |
| Reference Context / Question Archive | Source/script pass | Tests verified optional collapsed hints, metadata-only question reference records, no dense learner archive UI created by question-reference DB integration, no raw/copyrighted problem text requirement for hints, and stripping user raw text before reference matching. | QA agent |
| Mode Migration | Source/script pass; visual preview pending | Tests verified manual migration, archived 1차 history, second-mode next-action emphasis, and no pass/fail or official-result claim. | QA agent |
| Data Boundary | Source/script pass | Tests verified recursive raw-key telemetry sanitization, derived metadata exclusion for OCR/user answer/problem/rewrite paragraph fields, raw-field stripping for reference requests, and safe learning-signal metadata. | QA agent |
| Product scope / nav boundaries | Pass after #292 | Source review verified learner navigation excludes admin/instructor/studio/payment/archive links and unsupported actuarial learner routes are hard-blocked with `notFound()`. `/exams` now exposes only `감정평가사 1차` and `감정평가사 2차` as learner exam-selection cards. `/answer-review` remains available as a supporting/internal review flow through existing learner/review links where needed, but it is no longer exposed as the public exam selection surface. Instructor/studio placeholders/admin APIs remain protected. | QA agent |

### Routes/files checked

- Learner app routes: `app/app/layout.tsx`, `app/app/page.tsx`, `app/app/capture/page.tsx`, `app/app/write/page.tsx`, `app/app/review/page.tsx`, `app/app/first/ox/page.tsx`, `app/app/mode-migration/page.tsx`, `app/app/items/[itemId]/page.tsx`.
- Public/selection routes: `app/page.tsx`, `app/exams/page.tsx`, `app/answer-review/page.tsx`, `app/problem-snap/page.tsx`.
- Unsupported/non-learner boundaries: `app/exams/actuary/page.tsx`, `app/exams/actuary-first/layout.tsx`, `app/exams/actuary-second/layout.tsx`, `app/exams/archive/page.tsx`, `app/instructor/page.tsx`, `app/instructor/second-grading/page.tsx`, `app/studio/page.tsx`, `app/admin/page.tsx`.
- Learner APIs: `app/api/os/items/route.ts`, `app/api/os/profile/route.ts`, `app/api/os/review-queue/route.ts`, `app/api/os/today-focus/route.ts`, `app/api/os/mode-migration/route.ts`, `app/api/os/first-ox/attempts/route.ts`, `app/api/inverge/ocr/route.ts`, `app/api/answer-review/structure/route.ts`, `app/api/problem-snap/solve/route.ts`, `app/api/problem-snap/save/route.ts`.
- Auth/access/data-boundary core: `lib/auth/session.ts`, `lib/auth/admin.ts`, `lib/review-os/server.ts`, `lib/review-os/repository.ts`, `lib/review-os/service.ts`, `lib/review-os/data-boundary.ts`.
- QA/readiness docs and scripts: `docs/inverge-closed-beta-qa.md`, `scripts/check-closed-beta-readiness.mjs`, `scripts/check-taxonomy-classification.mjs`.

### Remaining manual checks

- Real mobile camera capture.
- Invited/non-invited account login.
- Actual OCR quality with handwritten answer.
- Production environment variables.
- 360px mobile visual overflow and Vercel preview route smoke for `/app`, `/app/capture`, `/app/review`, `/app/first/ox`, `/app/write`, `/answer-review`, and `/problem-snap`.

## Authenticated Closed Beta E2E QA Attempt — 2026-06-01

- Scope requested: authenticated closed-beta learner QA with the secret invited and non-invited accounts, using only `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_NOT_INVITED_EMAIL`, and `E2E_NOT_INVITED_PASSWORD`.
- Secret-handling result: no credential values were printed, committed, documented, or captured. No screenshots were taken. Playwright transient test artifacts from failed environment bootstrap attempts were removed before commit.
- Environment result: all five requested E2E environment variables were missing in this runtime, so account-specific login, invite-blocking, learner-data-access, and saved-item retry verification were **not verifiable** from this environment.
- Browser availability result: Chromium and host dependencies were installed successfully after an initial missing-browser/missing-dependency failure. The authenticated Playwright smoke command then exited cleanly with both tests skipped because `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` were not set.
- Release-blocker result: no new P0/P1 blocker was found by source-level, unit/smoke, taxonomy, readiness, or production-build gates. Authenticated browser QA remains a manual-only check until the requested secret E2E variables are present in the runner.

### Requested authenticated flow evidence

| Flow | Result | Route checked | Evidence / notes | Remaining manual-only checks |
| --- | --- | --- | --- | --- |
| 1. Non-invited account | Not verifiable | `/login`, `/app` | `E2E_NOT_INVITED_EMAIL` and `E2E_NOT_INVITED_PASSWORD` were missing. Source/readiness guards still verify invite-only learner access and blocked invite-state coverage. | Log in with the non-invited secret account, open `/app`, confirm “아직 초대 승인 전입니다.”, and confirm learner data/API responses are not accessible. |
| 2. Invited account | Not verifiable | `/login`, `/app` | `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` were missing. Authenticated Playwright smoke was available after browser setup, but skipped because credentials were absent. | Log in with the invited secret account and confirm `/app` loads the learner operating screen rather than marketing UI. |
| 3. Capture-to-Note | Source/script pass; authenticated browser not verifiable | `/app/capture` | Learner-loop/readiness checks verify photo/PDF/text entry coverage, editable OCR draft behavior, safe save metadata, and no official grading/final score/pass-fail claims. Browser route access with the invited account was not verifiable without credentials. | With the invited account, open `/app/capture`, verify photo/PDF/text entry, editable OCR output before save, and no official grading/final-score/pass-fail copy in the live browser. |
| 4. Today Plan | Source/script pass; authenticated browser not verifiable | `/app` | Automated learner-loop/readiness checks verify Today Plan is capped at 3 primary items and keeps details/reference hints collapsed by default. | With the invited account, confirm the live Today Plan has no more than 3 primary tasks and details are collapsed by default. |
| 5. 1차 O/X | Source/script pass; authenticated saved-item retry not verifiable | `/app/first/ox`, `/app/first/ox?retryItemId=...` | Learner-loop/readiness checks verify one-statement practice, 모름/헷갈림 review-signal behavior, concept-popup guardrails, and retry/review routing. Account-backed saved statement replay could not be verified without credentials. | In browser, answer 모름 or 헷갈림, confirm the concept popup, confirm the review signal is saved, open the created item if possible, click “같은 선지 다시 판단하기”, and confirm `/app/first/ox?retryItemId=...` loads the saved statement with “저장된 선지를 다시 판단합니다.” |
| 6. 2차 Rewrite / CASIO | Source/script pass; authenticated browser not verifiable | `/app/write`, `/app/calculator`, `/app/items/[itemId]` | Learner-loop/readiness checks verify one gap + one rewrite action, unsupported CASIO fallback copy, deterministic supported CASIO mappings, and no official grading/pass-fail/final-judgment claims. | With the invited account, complete the live 2차 rewrite/CASIO browser path and confirm the same copy guardrails. |
| 7. Boundaries | Source/script pass; authenticated learner nav not verifiable | `/app`, `/exams`, `/admin`, `/instructor`, `/studio`, `/pricing`, `/checkout`, `/exams/archive` | Readiness route/source guards verify learner nav excludes admin/instructor/studio/payment/archive links and `/exams` exposes only `감정평가사 1차` and `감정평가사 2차`. Browser nav verification under an invited account was not possible without credentials. | With the invited account, confirm learner nav does not expose `/admin`, `/instructor`, `/studio`, `/pricing`, `/checkout`, or `/exams/archive`, and confirm `/exams` shows only 감정평가사 1차 and 감정평가사 2차. |

### Commands run on 2026-06-01

| Command | Result | Evidence / notes |
| --- | --- | --- |
| `npm run verify:learner-loop:ci` | Pass | 152 learner-loop tests passed, 5 quality-eval tests passed, taxonomy check passed, and production build completed. Build emitted the existing Turbopack NFT tracing warning for `next.config.ts` → `lib/review-os/question-reference.ts` → `app/app/items/[itemId]/page.tsx`; no command failure. |
| `npm run check:closed-beta-readiness` | Pass | Learner-loop verification, data-boundary tests, question-reference tests, route/source guard checks, and production build passed. Final script output: `[closed-beta-readiness] PASS: closed beta learner loop, data boundary, route/source guards, question references, and build passed.` |
| `npm run check:taxonomy` | Pass | Sample taxonomy classifications returned high-confidence 감정평가사 1차/2차 nodes for 회계학 재고자산 저가법, 민법 물권변동, and 감정평가 및 보상법규 사업인정. |
| `npm run build` | Pass | Next.js production build completed, TypeScript passed, and 46 static pages generated. Existing Turbopack NFT tracing warning remained non-fatal. |
| `npx playwright install chromium` | Pass with environment warning | Chromium downloaded successfully after the first CDN mirror returned 403 and the fallback mirror succeeded. Playwright reported missing host dependencies afterward. |
| `npx playwright install-deps chromium` | Pass with environment warning | Browser host dependencies installed successfully. `apt-get update` warned that the `mise.jdx.dev` proxy returned 403, but Ubuntu package indexes and dependency installation succeeded. |
| `npx playwright test tests/e2e/authenticated-smoke.spec.ts` | Not verifiable | After browser setup, the command exited 0 with 2 skipped tests because the invited-account credential variables were missing. |
| `npm run lint` | Pass with existing warnings | ESLint exited 0 with 10 pre-existing unused-variable warnings and no errors. |

### Remaining manual-only checks

- Provide the requested secret E2E variables in a secure runner and rerun authenticated browser QA against the intended preview/staging `E2E_BASE_URL`.
- Complete non-invited account access blocking and learner-data inaccessibility checks in a live browser.
- Complete invited account `/app`, `/app/capture`, Today Plan, 1차 O/X saved retry, 2차 Rewrite/CASIO, and learner-nav boundary checks in a live browser.
- Confirm no screenshots or browser artifacts include test account data if the manual run captures evidence.
