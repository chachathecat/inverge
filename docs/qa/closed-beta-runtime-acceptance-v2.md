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
# For protected Vercel Preview deployments only:
$env:VERCEL_AUTOMATION_BYPASS_SECRET="<local-only automation bypass secret>"

npm.cmd run test:e2e:m421-runtime-acceptance
```

The suite is intentionally fail-closed:

- without `M421_RUNTIME_ACCEPTANCE=1`, it skips with an explicit reason;
- with the gate set, missing required environment variable names fail the run;
- when `E2E_BASE_URL` targets a `*.vercel.app` Preview, `VERCEL_AUTOMATION_BYPASS_SECRET` is required so isolated Playwright contexts can reach the Inverge app behind Vercel Deployment Protection;
- obvious production base URLs are rejected unless `M421_RUNTIME_ACCEPTANCE_ALLOW_PRODUCTION=1` is explicitly supplied;
- the test data is synthetic and non-copyrighted;
- default Playwright contexts and manually created browser contexts send the same Vercel Protection Bypass for Automation headers when the local bypass secret is set;
- protected-runtime traces are disabled when `VERCEL_AUTOMATION_BYPASS_SECRET` is present to prevent credential capture in Playwright trace artifacts;
- failure screenshots remain `only-on-failure`.

Do not paste runtime credentials, Vercel bypass values, cookies, storage state, account IDs, provider responses, headers, or screenshots containing private data into this document or PR comments. Do not put the bypass secret in a URL or commit a storage-state file.

## 2026-06-24 Protected Preview Harness Follow-Up

The first owner-run attempt of the M421 suite failed 8/8 before reaching the Inverge app login form. The common observation was that an email input was visible, but the app password input was never found; each test timed out in `login()`.

This was blocked before application authentication by Vercel Deployment Protection on the approved Preview. A normal owner Chrome session could access the Preview, but isolated Playwright contexts did not carry the Deployment Protection bypass. This is an E2E environment/harness defect, not learner-loop runtime evidence.

Follow-up harness behavior:

- `VERCEL_AUTOMATION_BYPASS_SECRET` is supported as a local-only environment variable;
- default Playwright contexts send `x-vercel-protection-bypass` and `x-vercel-set-bypass-cookie` when that local secret is set;
- manual contexts created for two-context durability and Account A/B isolation receive the same protection headers;
- `*.vercel.app` M421 runtime runs fail immediately with a bounded missing-env message if the bypass secret is absent;
- login preflight requires the app `이메일` and `비밀번호` fields to become visible within 10 seconds;
- if the app login form is absent, the suite fails with `m421_app_login_surface_unavailable_possible_deployment_protection`;
- protected-runtime traces are disabled, and only safe failure screenshots are retained through Playwright's failure screenshot mode.

The owner rerun remains required. The 8/8 blocked attempt does not count as failed learner-loop runtime evidence.

## 2026-06-24 Auth Classification Follow-Up

The Vercel Protection Bypass for Automation reached the real Inverge application login surface: PASS.

The next owner one-test rerun reached the app login form, showed both `이메일` and `비밀번호`, filled the owner-provided credentials, and clicked the login button. It then failed while waiting for the post-login app route. That result is no longer deployment-protection login-surface evidence.

The harness now classifies the `/api/auth/sign-in` POST result using bounded fields only:

- HTTP status;
- `ok`;
- `error`;
- `redirectTo` presence/path category.

It must not print or record email, password, cookies, request headers, Vercel bypass values, full response bodies, HTML, tokens, or user identifiers.

Bounded classifications:

- `m421_auth_credentials_rejected` for HTTP 400 or `error=auth-failed`;
- `m421_preview_supabase_auth_unavailable` for HTTP 503 or `error=supabase-not-configured`;
- `m421_auth_endpoint_unavailable_possible_deployment_protection` for non-JSON or protected HTML responses;
- `m421_auth_session_redirect_failed` for HTTP 200 and `ok=true` when the browser does not reach `/app` or onboarding;
- `m421_app_login_surface_unavailable_possible_deployment_protection` remains reserved for the pre-submit login-form-missing case.

Exact auth/session classification remains pending owner rerun. The post-submit blocked run is not learner-loop journey failure evidence.

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
- Vercel Protection Bypass for Automation secret values or request headers;
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
