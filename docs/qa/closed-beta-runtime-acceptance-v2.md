# M421 Closed Beta Runtime Acceptance v2

## Decision

**M421 NON-PUSH RUNTIME ACCEPTANCE PENDING OWNER E2E**

This document replaces source/helper-only closed-beta acceptance with an owner-runnable authenticated browser acceptance harness for the non-Push learner loop. It does not approve production launch, paid launch, Web Push delivery, scheduler activation, or production Personal Concept Graph feature flags.

The acceptance scope remains:

```text
Capture
-> Study Note
-> Concept Candidate
-> one biggest gap
-> one next action
-> Today Plan max 3
-> Review Queue
-> Retrieval Review
-> Calculator Routine
-> Learning Record
-> Personal Concept State
-> Recovery
```

## Existing Runtime PASS Evidence

Owner-supplied non-production runtime evidence already recorded by merged M420/M421A work:

| Evidence | Result |
| --- | --- |
| atomic Personal Concept transition runtime | PASS |
| event retry idempotency | PASS |
| stale event rejection | PASS |
| concurrent newer-wins | PASS |
| RPC-only write boundary | PASS |
| direct authenticated INSERT/UPDATE denial | PASS |
| account A/B node RLS | PASS |
| account A/B transition-event RLS | PASS |
| durable graph read smoke | PASS |
| Today Plan max-three durable read | PASS |
| production graph flags remain off | PASS |

This repository records only aggregate evidence. No secrets, account identifiers, raw learner data, or row bodies are included.

## Non-Push Runtime Harness

The owner-run browser harness is:

```powershell
$env:M421_RUNTIME_ACCEPTANCE="1"
$env:E2E_BASE_URL="<non-production preview URL>"
$env:E2E_USER_EMAIL="<owner-provided runtime account>"
$env:E2E_USER_PASSWORD="<owner-provided password>"
$env:E2E_USER_A_EMAIL="<owner-provided account A>"
$env:E2E_USER_A_PASSWORD="<owner-provided password>"
$env:E2E_USER_B_EMAIL="<owner-provided account B>"
$env:E2E_USER_B_PASSWORD="<owner-provided password>"

npm.cmd run test:e2e:m421-runtime-acceptance
```

The suite is intentionally fail-closed:

- without `M421_RUNTIME_ACCEPTANCE=1`, it skips with an explicit reason;
- with the gate set, missing required environment variable names fail the run;
- obvious production base URLs are rejected unless `M421_RUNTIME_ACCEPTANCE_ALLOW_PRODUCTION=1` is explicitly supplied;
- the test data is synthetic and non-copyrighted;
- screenshots and traces are retained only on failure through the existing Playwright config.

Do not paste runtime credentials, cookies, storage state, account IDs, provider responses, or screenshots containing private data into this document or PR comments.

## Journeys Covered By The Harness

| Journey | Owner-run target | Status before owner run |
| --- | --- | --- |
| First-exam golden journey | authenticated browser at 360 x 800, 390 x 844, and 1280 x 800 | PENDING |
| Capture -> Study Note -> one gap -> one action | save confirmation and immediate retrieval setup | PENDING |
| Today Plan max 3 | visible primary actions stay capped and reachable | PENDING |
| Retrieval Review | recall/production before completion and no dead end after completion | PENDING |
| Second-exam rewrite journey | issue recall, outline, answer, one gap, paragraph rewrite, completion summary | PENDING |
| Calculator Routine recovery | routine open, required routine placeholders, verification, mistake type, recovery retry | PENDING |
| Refresh and two-context durability | durable state appears where durability is claimed; local-only remains honest where not durable | PENDING |
| Account A/B isolation | Account B cannot see Account A synthetic learner record through normal routes | PENDING |
| Failure honesty | save/provider failures do not show false success, raw errors, endpoints, or secrets | PENDING |
| Responsive widths | primary CTA reachable, required controls visible, no blocking horizontal scroll | PENDING |

HTTP 200, source inspection, or local helper tests alone do not count as the owner-run browser evidence for this milestone.

## Web Push Parallel Hold

| Check | Result |
| --- | --- |
| Web Push | BLOCKED — VAPID CONFIGURATION ERROR |
| Web Push provider delivery | NOT REACHED |
| OS notification receipt | NOT VERIFIED |
| click routing | NOT VERIFIED |
| scheduler | BLOCKED BY VERCEL HOBBY PLAN |
| PR #423 | remains Draft |

M421 may accept the non-Push learner loop only while keeping Web Push explicitly blocked. Do not test Push in this PR. Do not rotate VAPID keys. Do not change Vercel environment variables. Do not add scheduler configuration. Do not claim live notification delivery.

## Data Boundary

The harness must use only synthetic learner content. It must not commit or print:

- secrets, tokens, cookies, storage state, provider bodies, or service credentials;
- account identifiers, email values, database row bodies, or Push subscription details;
- raw learner/private content from real accounts;
- raw official/Q-Net materials;
- actual formulas, problem numeric values, unit values, calculator keystrokes, or display readings;
- official grading, score, pass/fail, model-answer, or AI final-judgment claims.

Calculator Routine evidence is metadata-oriented. It proves recovery behavior and Learning Record connection, not numerical correctness certification.

## Non-Goals

This PR does not add a learner feature, route, migration, Supabase privilege change, Vercel setting, Web Push implementation change, payment/billing behavior, official corpus ingestion, instructor surface, redesign, Figma asset, or production feature-flag enablement.

Production graph flags remain off:

```text
PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES=0
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0
```

Unset values are also acceptable. Production flag inspection or modification is outside this PR.

## Automated Validation

Local validation for this PR:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"

npm.cmd run typecheck
npm.cmd run lint
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/closed-beta-runtime-acceptance-v2.test.mjs
npx.cmd playwright test tests/e2e/closed-beta-runtime-acceptance-v2.spec.ts --list
npm.cmd run test -- --workers=1
npm.cmd run verify:learner-loop:ci
npm.cmd run check:closed-beta-readiness
npm.cmd run build
git diff --check
git status --short
```

The authenticated live E2E is not run by Codex unless the owner intentionally supplies the runtime environment.

## Final Acceptance Rule

M421 remains pending until the owner runs the gated browser suite against an approved non-production Preview with the required accounts and records aggregate evidence here or in the PR without secrets, account identifiers, raw learner content, provider bodies, or row payloads.

Passing M421 non-Push runtime acceptance still leaves Web Push on hold and does not approve production rollout.
