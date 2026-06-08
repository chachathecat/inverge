# Closed Beta Staging Final QA Sign-off

## A. Sign-off status

**Status: STAGING CLOSED-BETA READY WITH PRODUCTION BLOCKED**

This sign-off is documentation/static-guardrail approval for limited invited-user QA on Vercel Preview/Staging only.

- This is not production rollout approval.
- This approves limited invited-user QA on Vercel Preview/Staging only.
- Production durable Today Plan flags remain off/unset.
- No product behavior, learner flow, payment, public archive, instructor grading, notifications, native app behavior, dashboard/control-room UI, or exam scope expansion is approved by this sign-off.

## B. PRs covered

- #331 Gated Today Plan Durable Graph Integration
- #332 Durable Today Plan Rollout QA
- #333 Taxonomy candidate deserialization fix
- #334 Windows-safe learner-loop verification
- #335 Staging QA evidence + visible action cap

## C. Required commands and latest result

Required command set before relying on this sign-off:

```bash
npm run build
npm run verify:learner-loop:ci
npm run check:closed-beta-readiness
npm run check:taxonomy
npm run lint
npm run check:durable-today-plan-rollout
```

Expected result:

- `npm run build` passes.
- `npm run verify:learner-loop:ci` passes.
- `npm run check:closed-beta-readiness` passes.
- `npm run check:taxonomy` passes.
- `npm run lint` has no errors.
- `npm run check:durable-today-plan-rollout` passes.

Latest local evidence:

- Learner loop: 521 tests / 521 pass / 0 fail.
- Durable rollout readiness: `passed_durable_today_plan_rollout_readiness`.

## D. Staging flags

For Vercel Preview/Staging only:

```bash
PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=1
```

Production must remain:

```bash
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0
```

or unset.

Production rollout remains not approved. Do not enable production durable reads and do not set production rollout flags from this sign-off.

## E. Manual QA checklist

Run manual QA with an invited learner account on Preview/Staging only.

### Public/auth

- `/`
- `/login`
- `/exams`

### Learner home

- `/app?mode=first`
- `/app?mode=second`

### Capture

- `/app/capture?mode=first`
- `/app/capture?mode=second`

### Execution

- `/app/session?mode=first`
- `/app/review?mode=first`
- `/app/first/ox`
- `/app/write?mode=second`

### Calculators

- `/app/calculator?mode=first&context=accounting&focus=accounting_template`
- `/app/calculator?mode=second&context=practice&focus=casio`

### Restricted

- `/instructor/second-grading`
- `/admin`
- `/studio`

### Expected manual QA result

- Learner routes load.
- Today Plan visible primary tasks must be max 3.
- Secondary actions are collapsed or labeled as “다른 작업” / “입력 방식”.
- Capture OCR result remains draft/editable.
- First/second mode routing remains safe.
- Restricted routes must be blocked for normal learner.
- No raw text leak.
- No raw OCR/problem/answer/source/copyright/official/model/score/instructor fields are exposed.
- No official grading/score/pass-fail/model-answer claims are visible.
- No instructor/admin/payment/archive/native-app exposure is visible to learners.

## F. Data boundary

- Raw OCR/problem/user answer/source text remains user-owned service data.
- Today Plan uses metadata-only derived signals.
- Durable graph rows are metadata-only.
- No raw DB rows are exposed.
- No service role key is used for learner runtime QA.

## G. Rollback

Rollback is flag-only:

```bash
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0
```

and/or:

```bash
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0
```

Then redeploy Preview/Staging.

No schema rollback is required for this staging rollback.

## H. Decision

Allowed:

- Continue closed-beta QA with invited learner accounts on Preview/Staging.
- Collect UX issues, route issues, and data-boundary issues.

Not allowed:

- Production rollout.
- Public beta.
- Payment launch.
- Public archive launch.
- New exam expansion.
- Instructor grading changes.

## PR #337 QA follow-up note — mode-aware capture quality and Today Plan semantics

Date: 2026-06-06

Latest closed-beta staging observation from the current Vercel deployment:

- 1차 capture now works end-to-end: text input → AI draft → confirmation → save → Today Plan/session reflection.
- 2차 capture now works end-to-end: text input → AI draft → issue recall → outline → paragraph rewrite → save → Today Plan/session reflection.
- The earlier blocker where 2차 capture could not progress past Step 1 is mostly resolved in the latest deployment.

Remaining PR #337 quality gates before broader invited-user QA:

- Route query mode must be authoritative for `/app`, `/app/capture`, and `/app/session`; stale client/session mode must not override `mode=first` or `mode=second`.
- 1차 capture gap ranking must prefer learner-provided mistake reason and answer mismatch over time metadata. A note such as “무효와 취소를 구분하지 못함 / 소요시간 5분” should produce a concept-confusion action, not “시간 부족”.
- 2차 법규 capture must use legal issue/rewrite skeletons such as 법적 성질, 처분성, 권리구제, 요건/포섭, and 사안 해결. It must not default to calculation skeletons unless the subject is 실무 or calculation is explicit.
- Today Plan visible primary cards should show derived action summaries from subject, topic candidate, gap label, next action, and estimated minutes. Raw OCR/problem/user-answer/source text belongs only in details or user-owned note surfaces.
- Keep Today Plan primary task cap at max 3 and keep durable production rollout gates disabled.

Guardrails retained:

- No production durable reads enabled.
- No service-role learner route usage added.
- No instructor/admin/payment/archive/native app surfaces added.
- No official grading, score prediction, pass/fail, or model-answer claim added.

## PR #339 QA note — curriculum-anchored Capture-to-Plan helper integration

Date: 2026-06-07

PR #339 wires the PR #338 appraiser curriculum kernel into the learner Capture → Note → Explanation → Review Queue → Today Plan loop at helper level.

Guardrails retained:

- No production durable reads/writes are enabled.
- The integration remains metadata-only for shared outputs.
- Raw learner OCR/problem/answer/source/copyright text remains in user-owned surfaces only and is not emitted in curriculum Today Plan or Review Queue candidates.
- Today Plan remains capped at max 3 primary tasks.
- No payment, public archive UI, new exams, instructor grading changes, live notifications, native app behavior, official grading, score, pass/fail, official model answer, or 합격 보장 claims are introduced.

Staging verification focus:

- 1차 민법 captures such as 무효와 취소 map to 1차 민법 curriculum candidates, not time metadata.
- 2차 법규 captures such as 사업인정 map to legal issue/rewrite candidates, not 실무 calculation skeletons.
- 2차 실무 calculation-like captures may map to calculation/CASIO candidates only when calculation cues are present.
- 2차 이론 keyword-like captures map to keyword/logic candidates.
- Visible Today Plan titles remain derived action summaries rather than raw problem/question text.

## PR #340 QA note — Curriculum-Anchored Personal Learning State v1

Date: 2026-06-08

PR #340 adds a metadata-only personal learning state engine for curriculum-anchored capture/review/session signals.

Guardrails retained:

- No production durable rollout is enabled by default.
- State transitions are deterministic learning operations metadata, not official grading, score prediction, pass/fail judgment, official model-answer comparison, or 합격 보장.
- Raw learner OCR/problem/answer/source/copyright text remains learner-owned service data and is not emitted in state update candidates, Today Plan candidates, Review Queue candidates, or reference corpus storage.
- Unsupported exam modes and unmatched curriculum nodes fail safely with fallback metadata.
- OCR pending schedules OCR confirmation first and cannot improve a concept to stable.
- Today Plan remains max 3 visible primary tasks.

Staging verification focus:

- High-confidence wrong answer produces `confident_wrong`.
- Low-confidence wrong/captured concepts remain `wrong` or `confused`, not `stable`.
- Correct after wrong produces `recovering`; repeated correct evidence can produce `stable`.
- 2차 paragraph rewrite after weak structure can move the concept toward `recovering`.
- Today Plan and Review Queue candidates carry concept node/status target metadata without raw text.
- Priority places `confident_wrong` above generic new study and due `recovering` review above generic new study.

## PR #342 QA note — Adaptive Study Schedule Live Plan v1

Date: 2026-06-08

PR #342 adds the adaptive study planner after durable personal learning state repository/RLS smoke coverage.

Guardrails retained:

- No production durable rollout is enabled by default; durable reads remain optional/gated.
- Existing Review Queue and Capture candidates continue to work when durable state is unavailable.
- Adaptive Today Plan outputs are metadata-only and visible tasks remain capped at max 3.
- Weekly plan preview is metadata-only and sends no notifications.
- Missed-day recovery copy is calm and treats missed reviews as rescheduling signals, not shame/fear pressure.
- Raw learner OCR/problem/answer/source/copyright text is not emitted.
- No payment, public archive UI, new exams, instructor grading changes, push notifications, native app behavior, official grading, score prediction, pass/fail judgment, official model answer, or 합격 보장 claims are introduced.

Staging verification focus:

- Due review outranks new study.
- `confident_wrong` outranks `wrong`, and `wrong` outranks `confused`.
- High-risk/high-importance curriculum nodes raise priority.
- 30-minute availability compresses tasks rather than exceeding the Today Plan max 3 cap.
- OCR pending confirmation remains ahead of curriculum practice.
- Durable state unavailable falls back to in-memory/source-union candidates safely.
