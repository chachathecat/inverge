# Closed Beta Staging QA Checklist

This checklist validates the real learner app shell and key learner routes before inviting closed-beta users. Keep the staging run invite-only, learner-facing, and limited to 감정평가사 1차 / 감정평가사 2차.

## A. Access/auth

- [ ] Invited account can enter `/app`.
- [ ] Non-invited account is blocked safely without exposing learner data.
- [ ] No instructor routes are exposed to a learner from navigation, task cards, redirects, or empty states.
- [ ] Logout/login loop works and returns the learner to the intended app route safely.

## B. First learner loop

- [ ] Open `/app/onboarding`.
- [ ] Generate the first Today Plan with the primary onboarding action.
- [ ] Confirm the Today Plan shows a maximum of 3 tasks.
- [ ] Click the first task.
- [ ] Confirm the task route preserves mode (`first` or `second`) and the intended task context.
- [ ] Mark the execution result.
- [ ] Confirm a derived learning signal is created from metadata only.
- [ ] Confirm a review queue candidate appears or is derivable from the signal.
- [ ] Confirm Today Plan can be regenerated from review items.

## C. Capture loop

- [ ] `/app/capture` opens.
- [ ] No official grading claims appear in capture copy, result copy, or empty states.
- [ ] No public archive behavior appears in capture or follow-up routes.
- [ ] Raw OCR warning copy remains user-owned/service-layer only and does not imply shared/reference-data reuse.

## D. 1차 loop

- [ ] O/X task works.
- [ ] Cloze/concept recall route is safe and stays in the 1차 learner scope.
- [ ] Accounting template routes to `/app/calculator` with `mode=first` and `context=accounting` before execution.

## E. 2차 loop

- [ ] Rewrite routes to `/app/write`.
- [ ] CASIO routes to `/app/calculator` with `mode=second` and `context=practice`.
- [ ] Issue spotting routes to the 2차 write/issue flow.
- [ ] No 2차 rewrite copy incorrectly says O/X.

## F. Morning brief

- [ ] Morning brief shows a maximum of 3 tasks.
- [ ] 30-minute fallback remains available and produces a small plan.
- [ ] No push/email/SMS/Kakao sending occurs from the morning brief.
- [ ] No shame, fear, casino, ranking-pressure, or streak copy appears.

## G. Data boundary

- [ ] No raw user answer/OCR/problem text is stored in reference data.
- [ ] No copyrighted problem text examples are stored in learner-facing fixtures or reference data.
- [ ] No global training claims appear in learner routes, capture copy, or data-boundary copy.

## H. Decision after QA

- [ ] **PASS:** invite 5-10 beta users.
- [ ] **HOLD:** fix broken route/auth/persistence before inviting users.
- [ ] **BLOCKER:** stop the staging beta for data leakage, instructor exposure, official grading claim, or payment leak.
