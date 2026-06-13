# Closed Beta Metrics Monitoring Contract v1

## Purpose

This contract defines how Inverge monitors the first limited invited-user closed beta cohort. It is provider-free, metadata-only, and intended for the first 3 to 5 trusted invited users.

The current beta status is **Conditional Go, not full production readiness**. This contract does not add runtime product behavior, external analytics providers, AI provider calls, payment, public archive UI, or learner-facing instructor-console exposure.

Inverge remains a learner-owned appraiser-exam study operating OS. Metrics must evaluate whether the learner loop is working, not whether Inverge can grade, score, judge, archive, or replace official sources.

## Beta Status

- Status: **Conditional Go, not full production readiness**.
- First cohort size: **3 to 5 trusted invited users**.
- Cohort profile: appraiser-exam learners who understand the beta is not official grading, not a model-answer service, not score/pass/fail prediction, and not a public archive.
- Data posture: provider-free and metadata-only.

Known partials remain visible:

- Durable invited-account persistence remains partial until approved credentials and a non-production durable target are available.
- Full image OCR execution remains partial until provider-disabled synthetic image smoke is completed.
- Account-backed Review completion remains partial until durable queue item evidence is available.

Plain-text known partials:

- durable invited-account persistence remains partial
- full image OCR execution remains partial
- account-backed Review completion remains partial

## North-star Beta Question

Does Inverge help a learner turn today's study trace into the next safe action and come back to review it?

## Daily Monitoring Checklist

Record the following metadata-only signals each beta day:

- `first_capture_completed`
- `capture_note_created`
- `biggest_gap_identified`
- `next_action_created`
- `today_plan_task_selected`
- `review_queue_item_created`
- `notes_reflected`
- `loop_closed`
- `local_fallback_loop`
- `save_failed`
- `support_issue_opened`
- `boundary_safety_issue`

Daily interpretation:

- A healthy day has at least one capture-to-note path for active testers and no boundary safety issue.
- `save_failed` must be rare, recoverable, and excluded from ready Review Queue evidence.
- `local_fallback_loop` is useful local beta evidence, but it is not durable closed-loop evidence.
- Any `boundary_safety_issue` requires same-day triage.

## Weekly Monitoring Checklist

Review the following before expanding or continuing the cohort:

- active invited users
- users with 2+ capture days
- note-to-plan conversion
- review queue reflection rate
- review completion evidence
- OCR correction friction
- local fallback vs durable evidence
- qualitative feedback themes
- top 3 blockers
- stop-rule incidents

Weekly interpretation:

- The core loop should remain explainable and usable for text-first Capture.
- OCR/PDF friction should be understandable to learners and should not create false confidence.
- Durable evidence should be separated from browser-local fallback evidence.
- Review completion evidence should be tracked honestly until account-backed completion proof passes.

## Provider-free Telemetry Events

Use the safe metadata-only event names from the provider-free learner-loop telemetry contract:

- `capture_note_created`
- `biggest_gap_identified`
- `next_action_created`
- `today_plan_task_selected`
- `review_queue_item_created`
- `notes_reflected`
- `review_completed`
- `loop_closed`

Telemetry requirements:

- `metadataOnly: true`
- `learnerOwned: true`
- `safeUse: closed_beta_learner_loop_telemetry`
- no external analytics provider calls
- no AI provider calls
- no raw learner text, raw OCR text, raw problem text, raw answer text, official answer text, copied problem text, or copied answer text

## Safety Metrics

Track these zero-tolerance events:

- official grading/model-answer/score/pass-fail copy exposure
- instructor-console learner exposure
- raw Q-Net exposure
- local_official_materials exposure
- qnet_manifest.json exposure
- raw official text exposure
- analytics provider call
- AI provider call outside approved capture behavior
- raw learner text in telemetry

Any zero-tolerance event must be recorded as `boundary_safety_issue: true` and escalated through the stop-rule incident template.

## Decision Rules

### Continue Beta

Continue beta when all are true:

- core text-first loop works for invited users
- boundary safety incidents are zero
- `save_failed` is rare and recoverable
- users understand OCR/PDF and persistence limitations
- support burden is manageable
- metrics remain provider-free and metadata-only

### Pause Beta

Pause beta when any are true:

- repeated `save_failed` blocks loop closure
- persistence copy overclaims durable save
- OCR/PDF causes repeated confusion
- review completion cannot be explained to users
- support burden becomes too high
- local fallback and durable evidence become unclear in reporting

### No-Go / Stop Beta

Stop beta or mark No-Go when any are true:

- official grading/model-answer/score/pass-fail appears to learners
- instructor console appears to learners
- raw official materials or local official paths are exposed
- telemetry stores raw learner text or forbidden fields
- core Capture -> Note -> Today Plan -> Review Queue -> Notes loop breaks for most testers
- public archive UI or payment flow appears in the learner beta path
- analytics provider calls appear in the beta metrics path
- AI provider calls appear outside approved capture behavior

## Report Templates

### Daily Beta Note Template

- Date:
- Active invited users:
- `first_capture_completed`:
- `capture_note_created`:
- `biggest_gap_identified`:
- `next_action_created`:
- `today_plan_task_selected`:
- `review_queue_item_created`:
- `notes_reflected`:
- `loop_closed`:
- `local_fallback_loop`:
- `save_failed`:
- `support_issue_opened`:
- `boundary_safety_issue`:
- Continue / Pause / No-Go:
- Notes without raw learner text:

### Weekly Beta Metrics Report Template

- Week:
- Active invited users:
- Users with 2+ capture days:
- Note-to-plan conversion:
- Review queue reflection rate:
- Review completion evidence:
- OCR correction friction:
- Local fallback vs durable evidence:
- Qualitative feedback themes:
- Top 3 blockers:
- Stop-rule incidents:
- Decision: Continue / Pause / No-Go:

### User Feedback Intake Template

- Date:
- Account mode:
- Exam mode:
- Subject:
- Route:
- Persistence state: `durable_saved` / `local_fallback_saved` / `save_failed` / `not_applicable`
- What the user tried:
- What felt unclear:
- Suggested next action:
- Boundary concern: yes / no
- Raw/private content included: no

### Bug / Support Intake Template

- Date:
- Reporter:
- Route:
- Browser/device:
- Account mode:
- Persistence state:
- Expected behavior:
- Actual behavior:
- Recovery action shown:
- User could continue: yes / no
- Stop-rule concern: yes / no
- Boundary concern: yes / no
- Raw/private content included: no

### Stop-rule Incident Template

- Date:
- Incident type:
- Route:
- Account mode:
- Persistence state:
- Zero-tolerance event:
- Impacted users:
- Immediate action taken:
- Beta decision: Pause / No-Go:
- Follow-up owner:
- Follow-up PR:
- Raw/private content included: no

## Data Boundary

Metrics must be metadata-only.

Do not include:

- no raw learner text
- no raw OCR text
- no raw problem text
- no raw answer text
- no official answer text
- no copied problem text
- no copied answer text
- no screenshots
- no raw files
- no committed uploads
- no OCR full text
- no local_official_materials
- no qnet_manifest.json
- no raw Q-Net
- no raw official text
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console learner exposure
- no analytics provider calls
- no AI provider calls

Reports should use short summaries, counts, booleans, route names, persistence states, event names, and follow-up labels. They must not paste private learner content or official material content.

## Validation

Required validation commands:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
npm.cmd run check:closed-beta-readiness
npm.cmd run verify:learner-loop:ci
npm.cmd run build
```
