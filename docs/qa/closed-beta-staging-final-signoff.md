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
