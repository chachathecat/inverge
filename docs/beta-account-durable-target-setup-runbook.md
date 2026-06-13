# Beta Account & Durable Target Setup Runbook v1

## Purpose

This runbook defines the safe setup path required to unblock durable invited-account persistence proof for Inverge's first limited closed beta cohort.

Purpose: Unblock durable invited-account persistence proof.

Use it only for the first **3 to 5 trusted invited users**. The beta remains **Conditional Go until durable proof is executed** against an approved non-production durable target.

This is an operating runbook, not a runtime implementation plan. It must not add credentials, secrets, production database access, runtime product behavior, or persistence architecture changes.

## Non-production Durable Target Requirements

The durable target must:

- be non-production
- be clearly labeled as beta, staging, or non-production
- contain no real user data
- contain no Q-Net raw official materials
- contain no local official materials
- support safe reset after beta
- allow account-level save, refresh, Today Plan, Review Queue, and Notes proof
- allow a learner-owned note to produce `durable_saved` evidence without exposing raw learner text in reports
- keep browser-local fallback evidence separate from durable account evidence

Do not use a production target for this proof. If production data is accidentally connected, pause beta and treat the incident as a stop-rule event.

## Invited Beta Account Requirements

The first cohort account setup must follow these rules:

- Create **3 to 5 trusted invited users only**.
- Use test or beta learner accounts, not production admin accounts.
- Use learner role only.
- Do not grant instructor or admin privileges.
- Do not commit shared credentials.
- Do not write credentials in docs.
- Do not write credentials in the PR body.
- Do not include credentials in screenshots.
- Assign each account a user alias for reports.
- Do not store real personal data in the repo.
- Confirm each invited account can access learner routes without instructor/admin route exposure.

Each account must be scoped so learner-owned notes stay isolated by account. Account A must not see Account B learner notes.

## Secret Handling

Store secrets only in an approved local or hosting secret manager.

Never commit:

- credentials
- secrets
- `.env`
- `.env.local`
- session dumps
- cookies
- auth tokens
- database URLs
- service role keys
- Supabase keys
- passwords

Do not paste secrets into docs, tests, PR bodies, screenshots, issue comments, support reports, or telemetry samples.

If secret exposure occurs:

- rotate the exposed secret immediately
- mark beta paused
- record a metadata-only stop-rule incident
- confirm the exposed value is not present in git history or attached artifacts before resuming

Redact accidental logs before documenting. Reports may say "secret-like value redacted"; they must not include the value.

## Setup Checklist

- [ ] Create or confirm the non-production durable target.
- [ ] Confirm the target is labeled beta, staging, or non-production.
- [ ] Confirm the target contains no real user data.
- [ ] Confirm the target contains no Q-Net raw official materials.
- [ ] Confirm the target contains no local official materials.
- [ ] Create 3 to 5 learner-only invited accounts.
- [ ] Confirm no account uses production admin or instructor privileges.
- [ ] Confirm auth mode.
- [ ] Confirm persistence mode can produce `durable_saved`.
- [ ] Confirm browser-local fallback still produces `local_fallback_saved`.
- [ ] Confirm save failure simulation or recovery path.
- [ ] Confirm `save_failed` does not appear as ready Review Queue evidence.
- [ ] Confirm no instructor/admin route exposure to learners.
- [ ] Confirm no Q-Net/raw official materials are required for proof.
- [ ] Confirm reports use aliases and metadata-only summaries.

## Durable Proof Scenarios To Run After Setup

| ID | Scenario | Expected evidence |
| --- | --- | --- |
| A | invited learner sign-in | learner-only account session is identified without exposing credentials |
| B | capture note save | safe learner-owned text can be saved under the invited account |
| C | refresh preserves note | saved note remains visible after refresh when durable account persistence is available |
| D | Today Plan reflects saved note | Today Plan shows metadata-safe reflection from the saved note |
| E | Review Queue reflects saved note | Review Queue shows a learner-owned review item or candidate |
| F | Notes reflects saved note | Notes shows the saved note or metadata-safe reflection |
| G | provider-free telemetry records durable_saved loop evidence | telemetry evidence distinguishes `durable_saved` without external provider calls |
| H | local fallback remains clearly labeled | browser-local fallback remains labeled as local fallback, not durable account save |
| I | save_failed remains excluded from ready queue evidence | failed saves do not appear as ready Review Queue evidence |
| J | sign-out / different account isolation check | a different invited account cannot see the first account's learner notes |

Use only short synthetic or learner-owned study notes. Do not use Q-Net official materials, local official materials, raw official text, raw learner OCR text, answer text, problem text, screenshots, uploads, or OCR full text as evidence in the repo.

## Account Isolation Checks

Run these checks before expanding the cohort:

- Account A creates a safe learner-owned capture note.
- Account A confirms save, refresh, Today Plan, Review Queue, and Notes reflection.
- Account A signs out.
- Account B signs in.
- Account B must not see Account A learner notes.
- Account B must not see instructor/admin console.
- Account B creates a separate safe learner-owned capture note.
- Account A signs back in and must not see Account B learner notes.
- Local fallback records must not be mislabeled as durable account saves.

If account isolation fails, pause beta and do not add users until the cause is fixed and verified.

## Reset And Cleanup

After proof or cohort closeout:

- Reset beta data only in the non-production durable target.
- Remove invited accounts after beta unless they are explicitly retained for a follow-up proof run.
- Preserve only metadata-only reports in the repo.
- Keep report aliases instead of real personal data.
- Confirm no raw learner text, raw learner OCR text, answer text, problem text, OCR full text, screenshots, uploads, raw official text, Q-Net raw materials, or local official materials are committed.
- Confirm no credentials, secrets, `.env`, `.env.local`, session dumps, cookies, auth tokens, database URLs, service role keys, Supabase keys, or passwords are committed.
- Record cleanup status in the evidence report template.

Do not reset or modify production database settings as part of this runbook.

## Stop Rules

Pause beta if:

- durable target uses production data accidentally
- credentials or secrets are committed or exposed
- learner sees instructor/admin route
- account isolation fails
- persistence copy overclaims durable save
- raw official material is exposed in telemetry or reports
- raw learner text is exposed in telemetry or reports
- `save_failed` appears as ready Review Queue evidence
- Q-Net raw official materials or local official materials are required to complete the proof

Escalate to No-Go if a stop rule cannot be fixed quickly without changing production data or weakening learner/instructor boundaries.

## Evidence Report Template

- date:
- tester:
- target label:
- account alias:
- auth mode:
- persistence mode: `durable_saved` / `local_fallback_saved` / `save_failed` / `not_applicable`
- durable_saved evidence:
- local_fallback_saved evidence:
- save_failed evidence:
- account isolation result:
- boundary safety result:
- cleanup status:
- follow-up PR:
- final status: pass / partial / blocked

Evidence report rules:

- Use account aliases, route names, persistence states, booleans, and short summaries.
- Do not include credentials, secrets, screenshots, raw uploads, OCR full text, raw learner OCR text, raw learner answer/problem text, raw official text, or official answer text.
- If durable proof cannot be executed, mark final status as partial or blocked and preserve Conditional Go.

## Safety Boundaries

Every setup run and report must preserve:

- no credentials committed
- no secrets committed
- no `.env` committed
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
- no screenshots or raw uploads committed
- no runtime behavior changes
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
