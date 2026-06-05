# Durable Today Plan Staging Rollout Checklist

## A. Purpose

- This checklist is for staging/closed-beta enablement only.
- Production durable Today Plan reads remain OFF.
- The goal is to verify that durable Personal Concept Graph metadata can safely contribute to Today Plan max-3 actions without changing default behavior.

## B. Prerequisites

- PR #329 merged.
- PR #330 merged.
- PR #331 merged.
- Supabase migration for `personal_concept_nodes` applied locally/remotely.
- Runtime RLS smoke passed.
- Durable read runtime smoke passed.
- Test user A/B tokens are fresh.
- Test users are safe disposable users.
- No secrets pasted into GitHub/Codex/ChatGPT/screenshots.
- Do not use service role keys for learner runtime smoke; use disposable learner user tokens only.

## C. Required staging env flags

For staging only:

```bash
PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=1
```

## D. Production env rule

Production must remain:

```bash
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0
```

or unset.

## E. Flag matrix / expected behavior

| Repository                       | Durable Reads                                    | Today Plan Rollout        | Expected behavior                                                                                       |
| -------------------------------- | -----------------------------------------------: | ------------------------: | ------------------------------------------------------------------------------------------------------- |
| memory/unset                     | off                                              | off                       | Existing Today Plan only. No Supabase read.                                                             |
| supabase                         | off                                              | off                       | Existing Today Plan only. No durable read.                                                              |
| supabase                         | on                                               | off                       | Existing Today Plan only. Durable helper not called from route.                                         |
| supabase                         | off                                              | on                        | Existing Today Plan only. Durable helper not called from route.                                         |
| supabase                         | on                                               | on                        | Staging-only gated durable read may contribute metadata-only Today Plan candidates. Final output max 3. |
| any                              | any                                              | any + missing userId      | Existing Today Plan only.                                                                               |
| any                              | any                                              | any + unsupported examMode | Existing Today Plan only.                                                                              |
| supabase/on/on + durable failure | Existing Today Plan fallback. No user-facing error. |                           |                                                                                                         |

## F. Manual staging QA steps

- Pull latest main.
- Run static checks.
- Run runtime RLS smoke.
- Run durable read runtime smoke.
- Confirm `/app?mode=first` loads with flags off.
- Confirm `/app?mode=second` loads with flags off.
- Enable staging flags only.
- Confirm `/app?mode=first` still renders max 3 Today Plan actions.
- Confirm `/app?mode=second` still renders max 3 Today Plan actions.
- Confirm durable graph candidate can appear only as metadata-derived task.
- Confirm no raw OCR/problem/answer/source text appears.
- Confirm no raw OCR/problem/answer/source/copyright/official/model/score/instructor fields appear.
- Confirm no official grading/score/model-answer copy appears.
- Confirm no instructor/admin/payment/archive/native-app links appear.
- Disable rollout flag and confirm fallback to existing Today Plan.

## G. Rollback

Rollback is flag-only:

```bash
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0
# and/or
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0
```

No schema rollback required.

## H. Decision gate

Staging rollout may proceed only if:

- learner-loop CI passes;
- closed-beta readiness passes;
- taxonomy check passes;
- build passes;
- lint has no new errors;
- runtime RLS smoke passes;
- durable read runtime smoke passes;
- route smoke passes;
- no raw text leak is observed;
- production flags remain off.

## I. Visible action cap QA

- Today Plan primary task cards must be max 3.
- The screen should not visually imply more than 3 “오늘 할 일.”
- Input options must be clearly separated from Today Plan tasks.
- Secondary routes must be inside collapsed details or under a “다른 작업”/“입력 방식” label.
- The primary CTA should remain one clear next action where possible.
- Supporting actions may exist but should not compete visually with Today Plan cards.
- If there are zero due tasks, the empty/recovery state should still show one primary next action.
- Engine-level max-3 is not enough by itself; the learner-facing screen must also preserve “one screen, one main job” through progressive disclosure.
