# Closed Beta First Cohort Day 0 Readiness Evidence v1

## Run Metadata

- date: 2026-06-14
- tester: Codex local documentation QA
- commit SHA: 4d22e80025ffae337f4dfdec7f023eb222547f9b
- target label: latest main after PR #388 merge, docs/tests-only Day 0 evidence branch
- account mode: not_applicable for this evidence PR; no invited-account credentials were used
- persistence mode: mixed documented evidence; durable invited-account runtime remains partial
- cohort size decision: 3 to 5 trusted invited users only
- final decision: **pause until blockers fixed**

This report records what is actually prepared, tested, blocked, or still partial for Day 0. It does not claim that invited-user launch approvals, real cohort setup, durable account credentials, full image OCR execution, or account-backed Review completion were completed during this PR.

## Decision Framing

- Conditional Go, not full production readiness
- 3 to 5 trusted invited users only
- not public beta
- not paid beta
- not production launch
- not official grading/model-answer/score/pass-fail

The Day 0 gate remains constrained to a small trusted cohort after blockers are cleared. Until required approvals, cohort setup, and account target evidence are recorded by owners, the operational decision is pause.

## Day 0 Checklist Evidence Table

| item | status: pass / partial / blocked / not_applicable | owner | evidence summary | follow-up PR | launch impact: continue / pause / stop |
| --- | --- | --- | --- | --- | --- |
| launch decision | blocked | founder/product owner | Conditional Go framing exists, but this evidence run has no recorded owner launch approval. | required owner signoff | pause |
| required approvals | blocked | founder/product, engineering, safety/data-boundary, support | Approval fields are defined by #388, but no approval record was supplied in this PR. | required owner signoff | pause |
| cohort readiness | partial | support owner | Cohort size rule is documented as 3 to 5 trusted invited users; real invited users and aliases were not supplied here. | first cohort operations update | pause |
| account and durable target readiness | partial | engineering owner | Non-production durable target and learner-only account setup remain dependent on approved credentials and target access. | follow-up durable-account evidence | pause |
| capture/OCR readiness | partial | engineering owner | Text-first evidence exists from prior checks; full image OCR execution remains partial; provider-disabled synthetic smoke remains the safe next proof. | follow-up OCR smoke evidence | continue only after approval |
| learner loop readiness | pass | engineering owner | Docs/tests preserve Capture -> Note -> Today Plan -> Review Queue -> Notes evidence and max-3 Today Plan guardrails. | none for docs evidence | continue after blockers |
| review completion readiness | partial | engineering owner | Local Review proof and telemetry contract exist; account-backed completion remains partial. | follow-up review completion evidence | pause |
| metrics/reporting readiness | pass | support owner | Daily/weekly/reporting templates and telemetry names exist in prior docs and tests. | first real daily report | continue after blockers |
| safety boundaries | pass | safety/data-boundary owner | This PR adds docs/tests only and commits no credentials, raw materials, screenshots, uploads, provider calls, or runtime behavior. | none | continue after blockers |
| stop-rule owner | blocked | founder/product owner | Stop rules exist; named stop-rule owner was not supplied in this PR. | required owner signoff | pause |

## Required Approval Evidence

- founder/product owner approval status: blocked; no approval record supplied in this PR
- engineering owner approval status: blocked; no approval record supplied in this PR
- safety/data-boundary approval status: blocked; no approval record supplied in this PR
- support owner approval status: blocked; no approval record supplied in this PR
- stop-rule owner assigned status: blocked; no named stop-rule owner supplied in this PR

Approval evidence must remain metadata-only. Do not record credentials, secrets, raw learner text, raw official text, screenshots, uploads, cookies, sessions, or local paths.

## Cohort Evidence

- invited user count: partial; target is 3 to 5 trusted invited users, but no real invited-user list was supplied in this PR
- user aliases only, no real personal data: partial; alias format is required, but aliases were not supplied here
- support channel prepared: partial; support channel requirement is documented, but channel confirmation was not supplied here
- beta limitations sent: partial; limitation copy exists in runbooks, but no send confirmation was supplied here
- no official grading/model-answer/score/pass-fail expectation: pass as documented boundary
- no Q-Net/raw official material instruction sent: partial; instruction exists in docs, but no send confirmation was supplied here

Users should use synthetic or learner-owned study notes only. No real personal data is included in this report.

## Account And Durable Target Evidence

- non-production durable target status: partial; not verified during this PR
- learner-only invited accounts status: partial; not verified during this PR
- no instructor/admin privileges status: partial; required by docs, but not verified against live accounts during this PR
- account isolation status: partial; setup plan exists, but live isolation proof was not executed here
- reset/cleanup plan status: partial; plan exists, but no Day 0 execution evidence supplied here
- secret handling status: pass for repository boundary; no credentials or secrets were committed
- durable_saved proof status: partial; prior docs preserve this known partial where approved credentials and target are unavailable
- local_fallback_saved proof status: pass as documented local beta evidence
- save_failed proof status: pass as documented exclusion and recovery rule

The report does not overclaim durable account persistence. Browser-local fallback evidence is not counted as durable closed-loop evidence.

## Capture/OCR Evidence

- text-first capture baseline: pass from prior local/manual and automated learner-loop evidence
- PDF fallback: partial; fallback expectations are documented, but no new runtime file upload was executed in this PR
- image upload control: partial; control readiness is documented, but no new runtime image upload was executed in this PR
- provider-disabled synthetic image OCR smoke: partial; runbook exists, but no new provider-disabled smoke execution evidence was supplied here
- OCR draft/editable-before-save copy: pass as documented and test-covered copy requirement
- provider request count if tested: 0 for this PR; no provider request was executed or added
- no screenshots, raw uploads, or OCR full text committed: pass

OCR/PDF output remains draft, editable before save, learner-owned, and not official grading or a model answer.

## Learner Loop Evidence

- Capture -> learner-owned note: pass as documented golden-loop evidence
- biggest gap: pass as documented one-gap contract
- next action: pass as documented one-action contract
- Today Plan max 3: pass as documented and test-covered guardrail
- Review Queue reflection: pass as documented route evidence
- Notes reflection: pass as documented route evidence
- provider-free telemetry: pass as documented runtime telemetry contract
- local fallback: pass as documented browser-local beta evidence
- save_failed recovery: pass as documented recovery and exclusion rule

The core evidence remains metadata-only and does not include raw learner OCR, answer, or problem text.

## Review Completion Evidence

- local Review route proof: pass as documented local runtime proof
- review_completed telemetry: pass as documented provider-free telemetry event
- account-backed Review completion proof: partial; remains dependent on approved durable target and invited account setup
- refresh completion state: partial; local evidence exists, but account-backed refresh proof remains partial
- save_failed excluded from ready queue evidence: pass as documented rule

Review completion must remain learner-owned and must not imply scoring, grading, pass/fail, or official judgment.

## Metrics/Reporting Readiness

- daily beta note template ready: pass
- weekly beta report template ready: pass
- feedback intake ready: pass
- bug/support intake ready: pass
- stop-rule incident template ready: pass
- daily owner assigned: blocked; no named owner supplied in this PR
- weekly owner assigned: blocked; no named owner supplied in this PR

First real cohort reporting should use aliases, counts, routes, persistence states, telemetry event names, and short summaries only.

## Stop-rule Review

| stop rule | triggered: yes / no / not_tested | evidence summary |
| --- | --- | --- |
| official grading/model-answer/score/pass-fail appeared | no | This PR adds no runtime copy and the docs preserve the prohibition. |
| instructor/admin console appeared | no | This PR adds no learner UI or route behavior. |
| raw Q-Net/raw official material exposed | no | This PR reads and commits no Q-Net or official raw material. |
| local_official_materials or qnet_manifest appeared | no | Terms appear only as safety boundaries; no files or paths are committed. |
| credentials/secrets exposed | no | This PR commits no credentials, secrets, cookies, sessions, database URLs, or keys. |
| account isolation failed | not_tested | Live invited accounts were not exercised in this PR. |
| telemetry stored raw learner text or forbidden fields | no | This PR adds no telemetry runtime change and preserves metadata-only telemetry evidence. |
| persistence copy overclaimed durable save | no | This PR adds no persistence copy and preserves no-overclaiming language. |
| save_failed appeared as ready Review Queue evidence | no | This PR adds no runtime behavior and preserves the exclusion rule. |
| core loop broke for most testers | not_tested | No new live tester run was executed in this PR. Prior golden-loop evidence remains documented. |

No stop rule is documented as triggered by this docs/tests evidence PR. The missing live account, cohort, and approval evidence still requires pause until blockers are fixed.

## Final Decision

- launch 3 to 5 trusted invited users under Conditional Go: not approved in this evidence run
- pause until blockers fixed: **selected**
- stop beta: not selected
- do not expand: active
- do not paid-beta: active
- do not public-beta: active

Reason: safety boundaries and docs/tests evidence are in place, but required approvals, named owners, real cohort setup, non-production durable target proof, full image OCR execution proof, and account-backed Review completion proof were not executed or supplied in this PR.

## Known Partials

Keep these visible until resolved:

- durable invited-account persistence partial
- full image OCR execution partial
- account-backed Review completion partial

These partials block paid beta, public beta, production launch, and cohort expansion. They also keep the first cohort paused until the required Day 0 owners decide that the remaining evidence is sufficient for the smallest trusted cohort.

## Safety Boundaries

This evidence report preserves:

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

Validation results for this PR on 2026-06-14:

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass with existing warnings only
- `npm.cmd run test -- --workers=1`: pass
- `npm.cmd run check:closed-beta-readiness`: pass
- `npm.cmd run verify:learner-loop:ci`: pass
- `npm.cmd run build`: pass with existing Turbopack NFT warning

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
npm.cmd run check:closed-beta-readiness
npm.cmd run verify:learner-loop:ci
npm.cmd run build
```
