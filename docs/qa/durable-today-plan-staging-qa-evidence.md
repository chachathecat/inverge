# Durable Today Plan Staging QA Evidence

## Scope

- PR range covered: #331, #332, #333, #334, #335, with PR #336 as final staging sign-off documentation/static guardrail only.
- Tested preview: https://inverge-mppzi8wwq-chachathecats-projects.vercel.app/
- QA date: 2026-06-05 UTC.
- Environment: Vercel Preview / closed-beta staging.
- Auth status: safe invited learner account.

## Expected preview flags

The tested preview is expected to use the staging-only durable read flags:

```bash
PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=1
```

Production flags remain off or unset:

```bash
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0
```

Production durable Today Plan reads are still blocked until separate approval.


## Final sign-off reference

- Final staging sign-off: `docs/qa/closed-beta-staging-final-signoff.md`.
- PR #336 is final closed-beta staging sign-off for limited invited-user QA on Preview/Staging only.
- PR #336 is not production approval; production durable Today Plan flags remain off/unset until separate approval.

## Routes tested

- `/`
- `/app?mode=first`
- `/app?mode=second`
- `/app/capture?mode=first`
- `/app/capture?mode=second`
- `/app/review?mode=first`
- `/app/session?mode=first`
- `/app/calculator?mode=first&context=accounting&focus=accounting_template`
- `/app/write?mode=second`
- `/app/calculator?mode=second&context=practice&focus=casio`
- `/instructor/second-grading`
- `/admin`
- `/studio`

## Result

**PASS WITH WARNINGS**

## Passed checks

- Root page loaded.
- Authenticated learner access worked.
- First-mode learner home loaded.
- Second-mode learner home loaded.
- Capture, review, session, write, and calculator learner routes loaded.
- Restricted instructor/admin/studio routes were blocked for a normal learner.
- Durable Today Plan appeared to work with metadata-only, action-oriented cards.
- Durable Today Plan did not expose raw rows.
- No raw OCR/problem/user answer/source/copyright text was visible.
- No official grading, official model answer, score prediction, or pass/fail judgment claims were visible.
- No instructor/admin/payment/archive/native-app learner exposure was visible.
- Capture OCR result remained draft/editable copy and required learner confirmation before saving.

## Warning

The engine-level Today Plan max-3 guardrail passed, but the visible learner-facing surface could still appear to exceed the max-3 rule because input cards and supporting CTAs were close to the Today Plan area:

- First mode showed four input/action cards around the Today area.
- Second mode showed multiple CTA-like buttons and supporting sections.

## Visible action cap decision

Staging can continue after visible action cap UX cleanup. The cleanup must keep Today Plan primary task cards capped at three while moving input options and secondary routes under clearly labeled, progressive-disclosure surfaces such as “오늘 입력할 수 있는 것,” “입력 방식,” or “다른 작업.”

Production rollout remains blocked until separate approval. Do not enable production durable read flags from this evidence.

## Visual QA note

Engine-level max-3 is necessary but not sufficient. The learner-facing screen must also avoid perceived task overload: one screen should communicate one main job, with at most three Today Plan primary task cards and all secondary actions visually/semantically separated as input methods or other work.
