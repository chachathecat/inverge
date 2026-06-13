# Closed Beta First Cohort Operating Report Template v1

## Purpose

This template defines the operating reports for Inverge's first limited invited-user closed beta cohort. It is designed for a **Conditional Go, not full production readiness** beta with **3 to 5 trusted invited users**.

Use this template to run daily, weekly, support, feedback, stop-rule, and first-cohort decision records without raw learner content, raw official content, external analytics providers, or runtime product behavior changes.

## Cohort Setup

- Beta status: **Conditional Go, not full production readiness**
- Cohort size: **3 to 5 trusted invited users**
- Tester profile: trusted appraiser-exam learners who can provide detailed feedback and understand Inverge is not official grading, not a model-answer product, not score/pass/fail prediction, and not a public archive
- Account mode: invited beta account / local auth-disabled demo / not_applicable
- Persistence mode: `durable_saved` / `local_fallback_saved` / `save_failed` / `not_applicable`
- Support channel:
- Report owner:
- Review cadence: daily note plus weekly report

Known partials:

- durable invited-account persistence remains partial until approved credentials and non-production durable target are available
- full image OCR execution remains partial until provider-disabled synthetic image smoke is completed
- account-backed Review completion remains partial until durable queue item evidence is available

## Day 0 Setup Checklist

- [ ] Invited account prepared
- [ ] Non-production durable target confirmed or marked unavailable
- [ ] Support/bug channel ready
- [ ] Safety boundary reviewed
- [ ] Stop rules reviewed
- [ ] Synthetic/learner-owned input guidance sent
- [ ] No Q-Net/raw official material guidance sent
- [ ] Persistence state wording reviewed
- [ ] OCR/PDF draft limitation explained
- [ ] Review completion partial evidence explained

## Daily Beta Note Template

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
- `durable_loop_closed`:
- `save_failed`:
- Support issues:
- Boundary safety incidents:
- Qualitative notes:
- Decision: continue / pause / stop
- Follow-up owner:
- Notes without raw learner text:

Daily note rules:

- Use counts, booleans, route names, persistence states, and short summaries only.
- Do not paste raw learner OCR text, answer text, problem text, or private long-form notes.
- Do not paste raw official text or official source material.
- If a stop rule is suspected, create a stop-rule incident record the same day.

## Weekly Beta Report Template

- Week:
- Active invited users:
- Users with 2+ capture days:
- Note-to-plan conversion:
- Review queue reflection:
- Review completion evidence:
- OCR correction friction:
- Persistence evidence:
- Top 3 user feedback themes:
- Top 3 blockers:
- Stop-rule incidents:
- Next PRs:
- Decision: continue / pause / stop
- Expansion recommendation:
- Notes without raw learner text:

Weekly report rules:

- Keep durable evidence separate from browser-local fallback evidence.
- Keep Review completion evidence honest while account-backed Review completion remains partial.
- Do not recommend expansion if stop-rule incidents are unresolved.
- Do not proceed to paid beta until retention/review/recovered-concept signals exist.

## User Feedback Intake Template

- user alias:
- exam mode:
- moment of friction:
- what they expected:
- what happened:
- whether they understood next action:
- whether they trusted OCR/AI draft:
- whether they would use again tomorrow:
- quote summary only, no raw learner answer/problem text:
- persistence state:
- follow-up needed:

Feedback intake rules:

- Summarize quotes; do not paste raw learner answer/problem text.
- Use synthetic or learner-owned summary language only.
- Do not include raw OCR text, screenshots, raw uploads, or official material excerpts.

## Bug / Support Intake Template

- issue id:
- route:
- severity: blocker / high / medium / low
- reproduction summary:
- persistence status: `durable_saved` / `local_fallback_saved` / `save_failed` / `not_applicable`
- telemetry status:
- Raw data included: must be no
- boundary risk: yes / no
- owner:
- next action:
- follow-up PR:

Bug/support rules:

- Raw data included must be no.
- Use metadata-only reproduction summaries.
- Record whether the user could continue.
- Escalate if persistence copy overclaims durable save or `save_failed` appears as ready Review Queue evidence.

## Stop-rule Incident Template

- incident id:
- date:
- stop rule triggered:
- affected route:
- evidence summary:
- Raw official or raw learner text included: must be no
- immediate action:
- beta status: continue / pause / stop
- follow-up PR:
- owner:

Stop-rule examples:

- official grading/model-answer/score/pass-fail appears to learners
- instructor console appears to learners
- raw official materials or local official paths are exposed
- telemetry or reports include raw learner text or forbidden fields
- core Capture -> Note -> Today Plan -> Review Queue -> Notes loop breaks for most testers
- payment, public archive UI, analytics provider calls, or AI provider calls appear outside approved behavior

## Final First-cohort Decision Template

- Cohort dates:
- Number of invited users:
- Number of active users:
- Text-first loop result:
- OCR/PDF result:
- Persistence result:
- Review completion result:
- Boundary safety result:
- Support burden:
- Retention/review/recovered-concept signal:
- Final decision: continue limited beta / pause and fix blockers / stop beta / expand only after blockers cleared
- Do not proceed to paid beta until retention/review/recovered-concept signals exist:
- Required next PRs:

Decision guidance:

- Continue limited beta only when core text-first loop evidence remains stable and safety incidents are zero.
- Pause and fix blockers when repeated save failures, OCR/PDF confusion, or review completion ambiguity blocks user understanding.
- Stop beta when a stop rule is triggered.
- Expand only after blockers are cleared and the known partials have explicit follow-up evidence.
- Do not proceed to paid beta until retention/review/recovered-concept signals exist.

## Safety Boundaries

Every report must preserve:

- no local_official_materials
- no qnet_manifest.json
- no raw Q-Net
- no raw official text
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console learner exposure
- no payment
- no analytics provider calls
- no AI provider calls
- no raw learner text in reports
- no raw learner OCR/answer/problem text in reports
- no screenshots or raw uploads committed
- no OCR full text committed
- no instructor grading behavior changes

## Raw-data Exclusion Rule

Reports are metadata-only. They may include:

- route names
- counts
- booleans
- persistence states
- telemetry event names
- short issue summaries
- user aliases
- follow-up PR labels

Reports must not include:

- raw learner text
- raw learner OCR text
- raw learner answer text
- raw learner problem text
- raw official text
- official answer text
- copied problem text
- copied answer text
- screenshots
- raw uploads
- raw files
- OCR full text
- local official paths
- Q-Net raw material paths

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
