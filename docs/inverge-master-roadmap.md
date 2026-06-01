# Inverge Master Roadmap

## Inverge definition

Inverge is a **감정평가사 합격 운영 시스템** for 감정평가사 1차 and 감정평가사 2차 learners. It is a premium AI-based exam-prep operations system that converts learner inputs into diagnosis, tracking, prediction, recommendation, execution, and retry/rewrite. Inverge is not an AI final-judgment product, generic dashboard SaaS, motivation app, or broad multi-exam platform.

The learner-facing product scope is fixed to:

- 감정평가사 1차
- 감정평가사 2차

No other exam track should be surfaced in landing, onboarding, navigation, curriculum, schedule, or learner product copy.

## Core learner loop

The source-of-truth operating loop is: input → diagnosis → tracking → prediction → recommendation → execution → retry/rewrite.


1. **Input**: capture a question, answer, note, O/X result, concept uncertainty, accounting template result, 2차 rewrite, or CASIO-related calculation weakness.
2. **Diagnosis**: identify the single biggest gap: concept, trap, formula, accounting template, issue spotting, legal requirement, application, structure, or calculation process.
3. **Tracking**: store safe metadata and derived learning signals only; avoid raw OCR, raw answer, and copyrighted problem text in reference data.
4. **Prediction**: estimate risk from due review, confidence, wrong/unknown status, 과락 risk, exam date, and recent missed tasks.
5. **Recommendation**: choose one calm next action, with a maximum of three visible Today Plan tasks.
6. **Execution**: run retrieval or production first: O/X, cloze, accounting template, rewrite, CASIO drill, or issue spotting.
7. **Retry/rewrite**: every feedback state ends in retry, rewrite, or scheduled review, never score-only closure.

## 1차 OS vision

The 1차 operating system turns broad objective-test coverage into controlled retrieval loops.

- Capture uncertain or wrong items without storing copyrighted problem text.
- Convert capture signals into O/X, cloze, and concept-card work.
- Prioritize subjects where wrong/unknown items imply 과락 risk.
- Keep each screen to one primary task.
- Make spaced review opt-out, not opt-in.
- Explain after retrieval whenever possible.

1차 success is not “read more”; it is repeated retrieval against the right concept node until confidence and accuracy stabilize.

## 2차 OS vision

The 2차 operating system turns answer-writing practice into structured diagnosis and rewrite loops.

- Capture answers, issue maps, and weakness metadata with strict data boundaries.
- Diagnose missing issues, weak requirements, poor subsumption, abstract conclusions, formula/calculation process gaps, and structure errors.
- Route the learner to rewrite, CASIO, issue spotting, or reference-answer draft comparison.
- Preserve learner agency and avoid AI final judgment language.
- Use feedback as a drafting aid that requires learner execution.

2차 success is not “receive a score”; it is repeated issue recognition, structured writing, calculation traceability, and rewrite quality improvement.

## Beginner → advanced user journey

### Beginner

- Starts with Capture and Today Plan.
- Learns the product rhythm: capture uncertainty, attempt retrieval, read one explanation ladder, then retry.
- Receives only a small number of next actions.
- Defaults to due review and concept stabilization before broad exploration.

### Intermediate

- Builds subject-level coverage across 1차 and/or 2차.
- Uses weak concept nodes, O/X history, rewrite history, and accounting/CASIO templates.
- Learns why mistakes repeat and which task type fixes each gap.
- Sees 과락 risk and exam-date pressure translated into calm Today Plan ordering.

### Advanced

- Uses Inverge as an execution OS rather than a content library.
- Runs high-yield reviews, mixed weak-node drills, timed rewrite blocks, and final risk checks.
- Receives fewer explanations and more production tasks.
- Uses schedule adaptation to protect due review while sharpening exam-specific output.

## Capture → Diagnose → Explain → Practice → Schedule → Notify → Adapt loop

1. **Capture**: learner records uncertainty, wrong answer, answer draft, OCR image, or calculation weakness.
2. **Diagnose**: system extracts safe metadata: exam mode, subject, unit, concept node, confidence, task type, and biggest gap.
3. **Explain**: explanation ladder is selected only after retrieval/production where possible.
4. **Practice**: learner performs O/X, cloze, accounting template, rewrite, CASIO, or issue spotting.
5. **Schedule**: review is automatically placed according to confidence, wrong/unknown status, 과락 risk, exam date, and recent misses.
6. **Notify**: future notification behavior should be limited to ethical reminders such as morning brief, due review, recovery nudge, and capture reminder. This roadmap documents notification logic only; it does not send notifications.
7. **Adapt**: next tasks and intervals adjust after each retry/rewrite result.

## Next PR roadmap

1. **Curriculum verification PR**: verify all subject/unit names against Q-Net and the current official public notice before production use.
2. **Reference-data loader PR**: add typed loaders for metadata-only curriculum, study tracks, and explanation ladder data.
3. **Schedule engine PR**: implement 30/60/90/120-day 1차 tracks and 90/180/365-day 2차 tracks behind tests.
4. **Explanation ladder integration PR**: connect four explanation labels to O/X, concept-card, rewrite, CASIO, and issue-spotting flows.
5. **Today Plan prioritization PR**: enforce max three visible primary tasks from due review, confidence, wrong/unknown, 과락 risk, exam date, and recent missed tasks.
6. **Morning brief PR**: add a learner-controlled brief surface without push notifications, shame copy, or urgency dark patterns.
7. **Production readiness PR**: audit data boundaries, source verification, lint, build, and smoke coverage before enabling any production behavior.

