# Inverge Closed Beta Readiness Rubric

Beta launch threshold:
- Closed beta can begin only when the product reaches 9.0/10 readiness.

Current estimated score:
- 7.2/10 after OCR provider invocation boundary and disabled-mode guard.

Scoring categories:

1. Learner Core Loop — 20 points  
Must include:
- Learner can start from /app or learner home.
- Learner can capture today's study through text/photo/PDF entry point.
- OCR/text result is editable before save.
- Saved note shows one biggest gap.
- Saved note shows one next action.
- Saved note can feed Review Queue.
- Saved note can feed Today Plan.

2. Exam Fit — 15 points  
Must include:
- Appraiser 1st-stage flow focuses on objective mistakes, concepts, repeated error patterns, and review scheduling.
- Appraiser 2nd-stage flow focuses on issue spotting, answer structure, missing points, rewrite instruction, and answer records.
- Actuary tracks remain sample/internal unless explicitly enabled.
- No expansion to CPA, tax, TOEFL, SAT, or universal exam tracks before beta.

3. UX Quality — 15 points  
Must include:
- One screen, one primary action.
- Calm premium minimal UI.
- Korean learner-facing copy.
- Mobile-friendly layout.
- Useful empty states.
- Useful error states.
- No cluttered dashboard feel.
- No score-first UX.

4. Data Safety & Trust — 15 points  
Must include:
- Raw user answer/photo/OCR text is private service data.
- Derived tags/signals may be used for product learning.
- Raw third-party problem text must not be used as global training corpus.
- No official grading claims.
- No pass/fail judgment claims.
- No official model-answer claims.
- Instructor/admin surfaces are separated from learner surfaces.

5. Technical Reliability — 15 points  
Must include:
- Core tests pass.
- Build passes in a properly installed environment.
- No public unauthenticated admin mutations.
- No accidental provider calls without explicit provider_ready gate.
- OCR disabled mode never reports extraction success.
- OCR outputs remain reference_only and needs_review unless reviewed.

6. Product Coherence — 10 points  
Must include:
- Main route, exam selection, learner home, capture, review queue, and today plan feel connected.
- User always knows what to do next.
- Product copy positions Inverge as a learning operations system, not a grader.

7. Closed Beta QA — 10 points  
Must include:
- Happy-path smoke test exists.
- Unauthorized-access test exists.
- Empty-state check exists.
- Mobile core-flow check exists.
- Closed beta manual QA checklist exists.

Do-not-launch blockers:
1. Learner capture loop is incomplete.
2. Saved notes do not feed Review Queue or Today Plan.
3. Instructor routes leak into learner navigation.
4. Build cannot pass in a real installed environment.
5. OCR/provider mode can falsely imply successful extraction.
6. Official grading/pass-fail language appears.
7. Raw user text is treated as shared/global training data.
8. Mobile core flow is broken.
9. Empty/error states feel developer-like.
10. User cannot understand the next action within 5 seconds.

Non-goals before closed beta:
- Full 20-year past-exam archive as the main product surface.
- Real official grading.
- Final pass/fail prediction.
- Full derivation verifier.
- Broad exam expansion.
- Live payment.
- Public source archive.
- Learner-facing instructor tools.
