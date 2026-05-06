# Inverge Closed Beta Final Review

## A. Launch decision
- Target: closed beta only.
- Launch threshold: 9.0/10.
- Current readiness estimate after PR #188: 8.9/10.
- Decision: launch only after this final gate passes and Vercel preview succeeds.

## B. Current readiness scoring
1. Learner core loop: learner home → 오늘 한 것 올리기 → structured note → one biggest gap → one next action is connected with learner-visible proof.
2. Capture-to-note: OCR/text capture remains editable before save and framed as a review-required draft.
3. Review Queue connection: saved capture creates derived learning signals and immediate review queue follow-up.
4. Today Plan connection: saved capture updates Today Plan with one primary action based on 오늘 기록 기반 signals.
5. Mobile usability: core learner screens keep low-noise single-primary-action flow without obvious horizontal overflow.
6. Empty/error states: empty learner state and capture error state point directly to the next executable action.
7. Data safety: raw learner/OCR text is bounded and not copied into shared learning signal/reference data.
8. Instructor/learner separation: learner surfaces do not expose instructor tools or links.
9. Technical reliability: smoke + bridge + boundary checks and npm run build must pass in installed environment.
10. Closed beta QA: manual script and rubric checks gate release decision.

## C. Must-pass checklist
- Learner home shows one clear next action.
- /app/capture exists and is learner-facing.
- OCR/text field is editable before save.
- OCR copy says it is a draft and user must review.
- Save creates safe derived learning signal.
- Save feeds Review Queue.
- Save feeds Today Plan.
- Saved state shows:
  - 오늘 기록이 저장되었습니다.
  - 복습 큐에 들어갔습니다.
  - 오늘 계획에 반영되었습니다.
  - 가장 큰 간극:
  - 다음 행동:
- Review Queue empty state points back to capture.
- Today Plan empty state points back to capture.
- Mobile core pages do not have obvious horizontal overflow.
- Instructor routes are protected and not linked from learner pages.
- No official grading/pass-fail/model-answer claims appear.
- Raw user/OCR text is not copied into shared learning signals or reference DB.
- Core smoke tests pass.
- Beta readiness rubric test passes.
- npm run build passes in installed environment.
- Vercel preview is success.

## D. Do-not-launch blockers
1. Vercel preview fails.
2. Build fails.
3. Capture save fails.
4. Saved capture does not show next action.
5. Saved capture does not create Review Queue item.
6. Saved capture does not influence Today Plan.
7. Learner sees instructor/admin links.
8. Official grading/pass-fail language appears.
9. Raw user text appears in shared/reference data.
10. Mobile capture flow is unusable.
11. Empty user cannot understand what to do within 5 seconds.

Additional hard-stop statements:
- launch should not proceed if Vercel preview fails.
- launch should not proceed if build fails.
- launch should not proceed if capture save fails.

## E. Non-goals for closed beta
- Full 20-year past-exam archive as main surface.
- Real official grading.
- Final pass/fail prediction.
- Full derivation verifier.
- Broad exam expansion.
- CPA/tax/TOEFL/SAT/universal tracks.
- Live payment.
- Public source archive.
- Learner-facing instructor tools.

## F. Manual beta script
1. New empty learner
   - Sign in as a new learner and verify home shows one calm primary action (오늘 한 것 올리기/기록 추가하기).
2. Appraiser 1st-stage capture
   - Go to /app/capture, input 감정평가사 1차 practice text, confirm OCR 결과는 초안입니다 + 저장 전 직접 확인해 주세요, save.
3. Appraiser 2nd-stage capture
   - Repeat for 감정평가사 2차 answer-style text and verify one biggest gap + next action output.
4. Review Queue after save
   - Open review queue and verify new queue item exists and reflects capture-origin context.
5. Today Plan after save
   - Return to learner home and verify Today Plan now includes 오늘 기록 기반 task.
6. Mobile viewport check
   - Verify /app, /app/capture, /app/review on mobile viewport; no obvious horizontal overflow; primary CTA remains visible.
7. Unauthorized instructor access
   - Confirm learner navigation has no instructor links and unauthorized instructor routes remain protected.
8. Safety copy check
   - Validate learner-facing copy has no official grading/pass-fail/model-answer claims.
9. Vercel preview check
   - Confirm PR preview deployment is green and matches must-pass learner flow.

## G. Score definitions
- 7.0 = internal prototype
- 8.0 = usable alpha
- 8.5 = strong closed-alpha
- 9.0 = closed beta ready
- 9.5 = paid beta ready

Inverge remains a premium learning operations system for exam preparation, not an official grading service and not a pass/fail judge.
