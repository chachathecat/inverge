# Inverge Study Schedule System

## Purpose

The study schedule system defines how Inverge should translate curriculum metadata and learner signals into calm daily execution. This document is a roadmap/reference standard only and does not implement notifications or new product behavior.

## 1차 tracks

### 30-day 1차 track

- Purpose: final compression and 과락 risk protection.
- Daily focus: due review, weakest subject, high-frequency concept nodes, O/X trap repair.
- Best for: learners with prior coverage who need execution discipline.

### 60-day 1차 track

- Purpose: fast rebuild with coverage plus review.
- Daily focus: two subject blocks, O/X retrieval, cloze recall, accounting template repetition.
- Best for: learners with partial coverage and repeated wrong/unknown items.

### 90-day 1차 track

- Purpose: balanced curriculum coverage and spaced review.
- Daily focus: concept node study, retrieval, review queue, and periodic mixed checks.
- Best for: learners starting with moderate time.

### 120-day 1차 track

- Purpose: full operating-system rhythm from foundation to final review.
- Daily focus: foundation nodes, low-pressure retrieval, cumulative review, and 과락 monitoring.
- Best for: beginners or learners rebuilding from low confidence.

## 2차 tracks

### 90-day 2차 track

- Purpose: output-focused rewrite and issue spotting.
- Daily focus: issue spotting, short rewrite, CASIO drill, and one structured feedback loop.
- Best for: learners close to exam day with existing theory exposure.

### 180-day 2차 track

- Purpose: balanced theory, law, and practice answer-writing build.
- Daily focus: rotating subject blocks, answer skeletons, calculation traceability, and rewrite history.
- Best for: learners needing both coverage and production.

### 365-day 2차 track

- Purpose: long-term mastery through spaced writing and cumulative review.
- Daily focus: concept foundation, short production, weekly full answers, and measured ramp-up.
- Best for: beginners and repeat learners rebuilding fundamentals.

## Daily schedule templates

### 30 min

1. Due review: 10 min
2. One retrieval or production task: 15 min
3. Retry/rewrite or scheduled review decision: 5 min

### 60 min

1. Due review: 15 min
2. Primary weak-node task: 25 min
3. Explanation ladder and retry: 10 min
4. Next scheduled review setup: 10 min

### 90 min

1. Due review: 20 min
2. Main task block: 40 min
3. Secondary repair task: 20 min
4. Summary, retry/rewrite, and schedule: 10 min

### 180 min

1. Due review: 30 min
2. Deep work block 1: 55 min
3. Deep work block 2: 55 min
4. Mixed retrieval/rewrite: 25 min
5. Recovery and schedule adaptation: 15 min

## Prioritization rules

Today Plan ordering should consider:

1. **Due review**: due items come first unless there is severe imminent 과락 risk.
2. **Confidence**: low-confidence items rise in priority.
3. **Wrong/unknown**: wrong and unknown items outrank merely slow items.
4. **과락 위험**: subjects or units creating fail-line risk are protected.
5. **Exam date**: nearer exam date compresses breadth and raises high-yield repair tasks.
6. **Recent missed tasks**: missed review or rewrite tasks re-enter with recovery language, not shame.

## Today Plan max 3 rule

Today Plan must show **max 3** primary tasks. If more than three tasks compete, the system should collapse them into the best default next action plus at most two supporting actions. The learner must have easy override options.

## Morning brief logic

A morning brief should be a calm planning surface, not a pressure notification. It should include:

- one sentence about today’s study risk or opportunity;
- up to three Today Plan tasks;
- due review count without shame language;
- one recovery option if yesterday was missed;
- one capture reminder only when recent captures are stale;
- an explicit override such as “오늘은 30분만 하기”.

Morning brief behavior must avoid fake urgency, ranking pressure, casino-style gamification, and addictive streak mechanics.

## Verification policy

Schedule labels and subject assumptions must be connected to curriculum metadata that has Q-Net/current official notice verification before production use.

## Study schedule kernel v1 addendum

Inverge is not a question archive. Study tracks convert curriculum metadata and learner signals into a calm Today Plan max 3 operating contract.

- Capture-to-Note is the front door; schedule decisions should start from captured learner traces and derived metadata.
- 20-year past papers are reference metadata, not the product front door.
- Curriculum nodes are the basis for Today Plan, Review Queue, O/X, cloze, calculation, and rewrite.
- The schedule kernel ranks due review, recent wrong, confidence gap, pass risk, exam urgency, missed recently, and weak structure.
- Raw user OCR/problem/answer text must remain user-owned service data. Derived metadata/signals may drive product behavior after sanitization.
- Official syllabus, exam calendar, and current public notices require Q-Net/current official notice verification before production use.

## PR #339 curriculum-anchored capture candidates

PR #339 adds helper-level curriculum-derived Today Plan and Review Queue candidates from Capture-to-Note signals.

- Capture-derived candidates are ranked with existing study schedule ranking before display, and Today Plan remains capped at max 3 primary tasks.
- Due review and recent wrong/unknown work outrank generic new study. Low confidence or confident-wrong metadata raises priority without shame language.
- In 2차, weak structure, missing issue, or paragraph weakness raises rewrite priority; 실무 calculation/CASIO priority is used only for calculation-like captures.
- Visible Today Plan titles are derived action summaries from subject, curriculum topic, gap label, next action, and estimated minutes, not raw problem/question text.
- This remains metadata-only and does not enable durable production rollout, live notification, payment, public archive, or new exam behavior.

## PR #340 learning state priority addendum

PR #340 extends schedule and Today Plan priority with curriculum-anchored personal learning state metadata.

- State update candidates are metadata-only and contain no raw learner text. They record concept node, prior/next status, reason, priority delta, confidence delta, source event type, and a next review candidate.
- Learning state is not official grading, scoring, pass/fail prediction, official model-answer comparison, or 합격 보장. It is a deterministic operations signal for selecting the next task.
- The learner owns raw capture/rewrite/answer text. The schedule layer may consume sanitized state metadata, but raw text must not enter Today Plan candidates, Review Queue candidates, or reference corpus storage.
- Priority order now accounts for concept state risk: `confident_wrong` > `wrong` > `confused`; due `recovering` review beats generic new study; `stable` is lower priority unless a scheduled review is due.
- OCR-pending captures must surface OCR confirmation before concept practice. Pending OCR cannot improve a concept to `stable`.
- The max-three visible Today Plan rule remains non-negotiable, and durable Today Plan rollout remains gated/off by default.

## PR #342 adaptive study planner v1 addendum

PR #342 adds the adaptive study planner layer that turns personal learning state metadata into a live Today Plan and weekly study preview.

- The planner uses durable personal learning state metadata when available, or in-memory/source-union candidates when durable reads are unavailable.
- Inputs remain metadata-only: personal concept state, curriculum node importance/risk, due review signals, capture-confirmation candidates, learner availability, and missed-day count.
- Today Plan remains capped at **max 3** visible primary tasks. When `dailyAvailableMinutes` is small, the planner shrinks task minutes instead of adding more tasks.
- Ordering prefers due review over new study, `confident_wrong` over `wrong`, `wrong` over `confused`, and due `recovering` review over stable new study.
- High-risk and high-importance curriculum nodes raise planning priority without making official grading, score, pass/fail, model-answer, or guarantee claims.
- Missed-day recovery uses calm recovery copy: missed work is treated as a scheduling signal, not shame or fear pressure.
- Weekly plan preview is helper-level metadata only: max 3 focus lines, target concepts, recovery items, and estimated total minutes.
- The planner does **not** send push notifications and does not add native app behavior.
- Production durable rollout remains gated/off by default.
