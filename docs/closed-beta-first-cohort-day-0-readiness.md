# Closed Beta First Cohort Day 0 Readiness v1

## Launch Decision

- status: **Conditional Go, not full production readiness**
- allowed cohort: **3 to 5 trusted invited users only**
- not public beta
- not paid beta
- not production launch
- not official grading or score prediction

Use this Day 0 gate before inviting the first cohort. Passing this checklist permits only a constrained trusted closed beta, not public launch, paid beta, or production readiness.

## Required Approvals

- founder/product owner approval:
- engineering owner approval:
- safety/data-boundary approval:
- support owner approval:
- stop-rule owner assigned:

All approvals must be recorded as metadata-only status notes. Do not include credentials, secrets, raw learner text, raw official text, screenshots, uploads, or local paths.

## Cohort Readiness

- [ ] 3 to 5 trusted invited users identified
- [ ] users understand beta limitations
- [ ] users understand no official grading/model-answer/score/pass-fail
- [ ] users instructed to use learner-owned notes only
- [ ] users instructed not to upload Q-Net/raw official materials for QA
- [ ] user aliases prepared for reports
- [ ] support channel shared
- [ ] users understand this is not public beta, not paid beta, and not production launch

## Account And Durable Target Readiness

- [ ] non-production durable target ready or explicitly marked partial
- [ ] learner-only invited accounts ready or explicitly marked partial
- [ ] no instructor/admin privileges for learner accounts
- [ ] account isolation plan ready
- [ ] reset/cleanup plan ready
- [ ] secret handling checked
- [ ] no credentials or secrets in repo
- [ ] production database settings unchanged

If durable invited-account persistence remains unavailable, keep Day 0 status as Conditional Go and mark the launch impact as continue only for the smallest trusted cohort.

## Capture/OCR Readiness

- [ ] text-first capture baseline ready
- [ ] PDF fallback behavior ready
- [ ] image upload control readiness
- [ ] provider-disabled synthetic image OCR smoke ready or explicitly marked partial
- [ ] OCR draft/editable-before-save copy confirmed
- [ ] no OCR provider call required for Day 0 unless explicitly approved
- [ ] no screenshots, raw uploads, or OCR full text committed
- [ ] safe learner-created inputs only

OCR/PDF capture remains learner-owned. OCR output must be draft, editable before save, and not official grading or a model answer.

## Learner Loop Readiness

- [ ] Capture -> learner-owned note
- [ ] biggest gap
- [ ] next action
- [ ] Today Plan max 3
- [ ] Review Queue reflection
- [ ] Notes reflection
- [ ] provider-free telemetry evidence
- [ ] local fallback evidence
- [ ] save_failed recovery rule

The Day 0 core loop is Capture -> Note -> Today Plan -> Review Queue -> Notes. If this loop breaks for most testers, pause or stop according to the stop rules.

## Review Completion Readiness

- [ ] local Review route proof ready
- [ ] provider-free review_completed telemetry ready
- [ ] account-backed Review completion proof ready or explicitly marked partial
- [ ] save_failed excluded from ready queue evidence
- [ ] completion copy does not imply score/pass/fail
- [ ] completed item does not behave like the same unstarted primary action

If account-backed Review completion remains partial, keep the beta as Conditional Go and do not expand the cohort based on local-only completion evidence.

## Metrics/Reporting Readiness

- [ ] daily beta note template ready
- [ ] weekly beta report template ready
- [ ] user feedback intake ready
- [ ] bug/support intake ready
- [ ] stop-rule incident template ready
- [ ] first-cohort final decision template ready
- [ ] daily owner assigned
- [ ] weekly owner assigned

Reports must remain metadata-only and use aliases, counts, route names, persistence states, telemetry event names, and short summaries.

## Known Partials

These partials must remain visible on Day 0:

- durable invited-account persistence may remain partial until approved durable target and learner accounts are available
- full image OCR execution may remain partial until provider-disabled synthetic image smoke is executed
- account-backed Review completion may remain partial until durable queue item proof is executed

Known partials from #380/#381/#382/#385/#386/#387 do not block the smallest trusted cohort if the core text-first learner loop and safety boundaries pass, but they do block paid beta, public beta, production launch, and cohort expansion.

## Stop Rules

Launch must pause or stop if:

- official grading/model-answer/score/pass-fail appears to learners
- instructor/admin console appears to learners
- raw Q-Net/raw official materials are exposed
- local_official_materials or qnet_manifest appears
- credentials/secrets are exposed
- account isolation fails
- telemetry stores raw learner text or forbidden fields
- persistence copy overclaims durable save
- save_failed appears as ready Review Queue evidence
- core Capture -> Note -> Today Plan -> Review Queue -> Notes loop breaks for most testers

If any stop rule fires, record a metadata-only stop-rule incident and do not expand the cohort until the blocker is fixed.

## Day 0 Checklist Table

| item | status: pass / partial / blocked / not_applicable | owner | evidence summary | follow-up PR | launch impact: continue / pause / stop |
| --- | --- | --- | --- | --- | --- |
| launch decision |  |  |  |  |  |
| required approvals |  |  |  |  |  |
| cohort readiness |  |  |  |  |  |
| account and durable target readiness |  |  |  |  |  |
| capture/OCR readiness |  |  |  |  |  |
| learner loop readiness |  |  |  |  |  |
| review completion readiness |  |  |  |  |  |
| metrics/reporting readiness |  |  |  |  |  |
| safety boundaries |  |  |  |  |  |
| stop-rule owner |  |  |  |  |  |

## Final Day 0 Decision Template

- launch 3 to 5 trusted invited users under Conditional Go:
- pause until blockers fixed:
- stop beta:
- do not expand:
- do not paid-beta:
- do not public-beta:
- decision owner:
- decision date:
- blocker summary:
- required follow-up PRs:

Decision guidance:

- Choose "launch 3 to 5 trusted invited users under Conditional Go" only when safety boundaries pass and the core learner loop is demonstrable.
- Choose "pause until blockers fixed" when a required owner, support path, account setup, or proof path is not ready.
- Choose "stop beta" when a stop rule fires and cannot be immediately contained.
- Keep "do not expand", "do not paid-beta", and "do not public-beta" active while any known partial remains unresolved.

## Safety Boundaries

Every Day 0 launch note and report must preserve:

- no credentials committed
- no secrets committed
- no `.env` committed
- no local_official_materials
- no qnet_manifest.json
- no raw Q-Net
- no raw official text
- no raw learner text
- no OCR full text
- no screenshots committed
- no raw uploads committed
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console learner exposure
- no payment
- no analytics provider calls
- no AI provider calls
- no runtime behavior changes
- no production database setting changes
- no instructor grading behavior changes

## Validation

Before opening or updating the PR, run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
npm.cmd run check:closed-beta-readiness
npm.cmd run verify:learner-loop:ci
npm.cmd run build
```
