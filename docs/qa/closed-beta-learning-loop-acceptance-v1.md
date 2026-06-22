# Closed Beta Learning Loop Acceptance v1

## Decision

**CLOSED BETA ACCEPTED WITH BLOCKED FEATURES**

Closed-beta acceptance is not production rollout approval. This document accepts the default/local learner loop for closed-beta dogfood only, while keeping optional durable Personal Concept Graph rollout paths blocked or not verified where runtime evidence is missing.

## Run Metadata

| Item | Value |
| --- | --- |
| Audit date | 2026-06-22 KST |
| Branch | `codex/closed-beta-learning-loop-acceptance-v1` |
| Base merge commit | `008c5ac7bd580809ba5bab4d0393741c396d7cd6` |
| Tested commit | `53c8bb15b61df8578de613f765def8053431245d` |
| Environment | Windows PowerShell, local Codex, Node with `NODE_OPTIONS=--max-old-space-size=8192` |
| Browser/device widths | 360 x 800, 390 x 844, 1280 x 800 required; authenticated browser smoke not verified in this local environment unless noted below |

## Acceptance Scope

Validated loop:

```text
Capture / Answer Review
-> learner-owned study note
-> concept candidate
-> one biggest gap
-> one next action
-> Today Plan max 3
-> Review Queue
-> Retrieval Review
-> Calculator Routine
-> Learning Record
-> Personal Concept State
-> recovery completion
```

No new learner feature, route, database migration, table, environment variable, dependency, Q-Net ingestion, payment flow, instructor surface, dashboard, or redesign was added.

## Automated Evidence

| Area | Evidence | Result |
| --- | --- | --- |
| Core route/component contract | `tests/closed-beta-learning-loop-acceptance-v1.test.mjs` | PASS |
| Capture-to-concept | Deterministic synthetic capture creates one gap, one action, and metadata-only concept candidate | PASS |
| Today Plan | Max 3, executable primary actions, review queue priority, no duplicate calculator task | PASS |
| Retrieval Review | Recall precedes reveal; completion disabled until outcome metadata exists | PASS |
| Calculator Routine | Nine steps, explicit verification, explicit mistake type, metadata-only completion | PASS |
| Learning Record | Existing completion API, idempotent retry identity, changed fingerprint revision | PASS |
| Personal Concept State | Wrong/stuck/clean transitions, disabled-write no repository touch | PASS |
| #417 concurrency audit | Barrier/mock repository documents non-atomic cross-instance read-compare-upsert limitation | PASS |
| Data boundary | Sentinels and forbidden fields rejected or absent from metadata | PASS |
| Copy/product boundary | Runtime learner sources scanned for forbidden official/score/pass/payment/instructor/archive claims | PASS |

## Command Evidence

Commands to run for this PR:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"

npm.cmd run typecheck
npm.cmd run lint
npm.cmd run check:closed-beta-learning-loop-acceptance

node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/calculator-routine-trainer-v1.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/calculator-routine-learning-signal-bridge-v1.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/calculator-routine-concept-state-v1.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/execution-to-concept-graph-durable-write.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/today-plan-source-union.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/closed-beta-e2e-learner-journey.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/closed-beta-golden-flow-routes.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/closed-beta-learning-loop-guardrails.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/data-boundary-hardening.test.mjs

npm.cmd run test -- --workers=1
npm.cmd run verify:learner-loop:ci
npm.cmd run check:closed-beta-readiness
npm.cmd run build
git diff --check
```

Latest local results:

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS, 0 errors, 8 existing warnings |
| `npm.cmd run check:closed-beta-learning-loop-acceptance` | PASS, 10/10 subtests |
| `node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/calculator-routine-trainer-v1.test.mjs` | PASS, 15/15 subtests |
| `node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/calculator-routine-learning-signal-bridge-v1.test.mjs` | PASS, 12/12 subtests |
| `node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/calculator-routine-concept-state-v1.test.mjs` | PASS, 8/8 subtests |
| `node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/execution-to-concept-graph-durable-write.test.mjs` | PASS, 12/12 subtests |
| `node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/today-plan-source-union.test.mjs` | PASS, 11/11 subtests |
| `node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/closed-beta-e2e-learner-journey.test.mjs` | PASS, 5/5 subtests |
| `node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/closed-beta-golden-flow-routes.test.mjs` | PASS, 17/17 subtests |
| `node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/closed-beta-learning-loop-guardrails.test.mjs` | PASS, 11/11 subtests |
| `node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/data-boundary-hardening.test.mjs` | PASS, 12/12 subtests |
| `npm.cmd run test -- --workers=1` | PASS, 333/333 subtests |
| `npm.cmd run verify:learner-loop:ci` | PASS, 670/670 learner-loop subtests plus quality eval, taxonomy, build, and explanation-quality eval |
| `npm.cmd run check:closed-beta-readiness` | PASS, static gate, official-source verification, learner-loop verification, route/source checks, data-boundary checks, question-reference tests, staging route source checks, and build |
| `npm.cmd run build` | PASS |
| `npm.cmd run check:e2e-env` | PASS as environment report; all required e2e variables were missing |

Expected non-blocking warnings observed:

- 8 existing ESLint warnings, 0 errors.
- Existing Node experimental loader and module-type warnings.
- Existing Turbopack NFT warning from `next.config.ts`.

Runtime-only commands not run because the configured Supabase/e2e environment was unavailable:

- `npm.cmd run check:personal-concept-graph-rls`
- `npm.cmd run check:personal-concept-graph-durable-read`
- `npm.cmd run check:durable-today-plan-rollout`
- `npm.cmd run test:e2e:staging`

## Manual Smoke Results

Synthetic, non-copyrighted inputs only. No real production learner account was used.

| Journey | Widths | Result | Evidence / limitation |
| --- | ---: | --- | --- |
| First exam: Capture -> save -> Notes -> Today Plan -> Review -> recall attempt -> completion | 360 x 800, 390 x 844, 1280 x 800 | NOT VERIFIED | Authenticated local/dev-smoke browser environment was not available at document creation time. Source and Node acceptance tests cover the contract. |
| Second answer: Capture/Answer Review -> concept candidate -> paragraph rewrite task -> completion | 360 x 800, 390 x 844, 1280 x 800 | NOT VERIFIED | Requires authenticated runtime smoke. Covered by deterministic source/helper tests until credentials are available. |
| Calculator: Problem Snap/Answer Review -> Routine -> explicit mistake -> Learning Record -> Review candidate -> recovery CTA -> clean completion | 360 x 800, 390 x 844, 1280 x 800 | NOT VERIFIED | UI/browser interaction requires authenticated runtime. Deterministic tests cover routine lifecycle and recovery closure. |
| Failure honesty: localStorage unavailable, unauthenticated completion, endpoint failure, retry, deduped response | 360 x 800, 390 x 844, 1280 x 800 | PARTIAL SOURCE/HELPER PASS | Local storage failure and sync states are covered by existing #415/#416 tests and this acceptance test. Runtime browser simulation remains not verified. |
| Refresh durability: Today, Review, Notes; local vs durable labels | 360 x 800, 390 x 844, 1280 x 800 | NOT VERIFIED | Durable invited-account runtime is not available. Browser-local and durable statuses remain distinct in source/tests. |

HTTP 200 or source inspection alone is not counted as full e2e browser evidence.

## Feature-Flag Matrix

| Mode | Flags | Status | Acceptance interpretation |
| --- | --- | --- | --- |
| Default/local | Repository memory/default; durable writes off; durable reads off unless explicitly configured | PASS for source/helper default loop when validation passes | Learning Record, Review, Today, and calculator recovery can operate without claiming durable graph persistence. |
| Configured staging | `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase`, `PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES=1`, `PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1`, `PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=1` | NOT VERIFIED unless runtime credentials/env are available | Do not claim configured staging pass without runtime RLS/read/write smoke evidence. |
| Production | Actual production flags not changed by this PR | BLOCKED / NOT RELEASED | No Vercel or production configuration was modified. Durable graph writes remain blocked by the cross-instance atomicity limitation. |

## Extended Golden Flow Evidence

| Step | Durable? | Local fallback? | Auth required? | Metadata-only? | Notes |
| --- | --- | --- | --- | --- | --- |
| Capture | Account-backed save when available | Browser-local closed-beta fallback | Auth for durable account save | Shared signals metadata-only; learner note may hold learner-owned raw text | `save_failed` must not close the loop. |
| Study Note | Durable when saved through account path | Browser-local note reflection | Auth for account path | Note metadata summaries are safe; raw values remain user-owned | Local fallback must remain labeled local. |
| Concept Candidate | No separate durable claim | Derived from capture/answer review | No extra auth beyond source flow | Yes | Raw capture text is excluded. |
| Today Plan | Uses existing safe sources; durable graph reads optional | Existing non-durable/default path | Auth for account Today state | Yes | Max 3 primary tasks. |
| Review Queue | Durable account queue where available | Local reflection evidence only | Auth for account queue completion | Completion metadata is derived | Recall outcome required before completion. |
| Retrieval Review | Queue completion persists through existing route | No durable completion claim for local reflection-only items | Yes | Recall sentence/outcome metadata only | Rereading-only completion is not accepted. |
| Calculator Routine | Learning Record persisted through existing completion API when authenticated | Browser/session routine draft and local completion history | Auth for server Learning Record | Completion signal is metadata-only | Clean completion does not certify numerical correctness. |
| Learning Record | Existing `learning_signal_events` path | Local-only sync status when unauthenticated | Yes for server save | Yes | Identical retry dedupes; changed completion fingerprints a new revision. |
| Personal Concept State | Feature-flagged durable graph write only | Default path skips repository | Auth and flags required | Yes | Disabled by default; sequential monotonic only. |
| Recovery | Review candidate and Today recovery point back to original logical routine | Local recovery status remains honest | Auth for account candidate persistence | Yes | Same-routine clean recovery closes the candidate. |

## #417 Post-Merge Audit

Audit findings:

- Clean calculator completion is treated as a recovery/learning signal, not numerical correctness certification.
- `calculator_routine` remains the task type for calculator recovery.
- Learning Record persistence is attempted before optional graph state update.
- Deduped Learning Record retries still attempt graph repair.
- Graph writes remain behind existing flags and are skipped by default.
- Supabase write payloads omit non-UUID helper ids on first write and keep metadata-only fields.
- Raw routine entries, formulas, numbers/units, CASIO input, display value, answer value, verification memo, and mistake memo are not persisted in Learning Record metadata, telemetry, graph signals, or graph payloads.

Concurrency limitation:

The current durable write helper is sequentially monotonic, not atomically monotonic across separate server instances. It reads the previous node, compares timestamps in application code, builds a new node, then upserts. Two concurrent revisions can both read the same previous node; if the newer write lands first and the older write lands second, the older write can overwrite the newer state. This does not affect default closed-beta behavior because durable writes are disabled unless feature flags are explicitly enabled.

Rollout impact:

- Durable graph writes remain a blocked optional path for production rollout.
- An atomic database/RPC update or equivalent compare-and-write persistence PR is required before enabling production durable graph writes.
- This PR does not add an in-process lock, DB migration, or new API route.

## Data Boundary Result

Q-Net/local official materials were not read or committed.

The acceptance test uses synthetic sentinel values and checks that the following do not enter shared metadata layers:

- raw OCR
- raw problem text
- raw answer text
- learner formula text
- learner numbers/units
- CASIO input
- display value
- answer value
- verification memo
- official answer
- score prediction
- instructor comment

No raw learner routine values are persisted in metadata. Raw learner-owned values remain session-only or user-owned service data where the existing product path requires them.

## Unresolved Limitations

| Limitation | Status | Closed-beta impact |
| --- | --- | --- |
| Authenticated browser smoke not available in this local environment | NOT VERIFIED | Does not block source/helper acceptance, but must be run before broader cohort expansion. |
| Configured Supabase durable graph write/read runtime not verified here | BLOCKED OPTIONAL PATH | Default closed-beta loop does not rely on it. |
| Cross-instance durable graph write atomicity is not guaranteed | BLOCKED OPTIONAL PATH | Keep durable writes disabled for rollout until a separate persistence PR adds atomic compare-and-write behavior. |
| Production deployment flags were not inspected or changed | NOT VERIFIED | This PR is not production rollout approval. |

## Rollback

Default/local rollback is code rollback of this docs/tests/package-script PR only.

For optional durable graph rollout paths, rollback remains flag-only:

```text
PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES=0
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0
```

or unset the flags. No schema rollback is introduced by this PR.

## Post-Beta Backlog

1. Run authenticated browser smoke at 360 x 800, 390 x 844, and 1280 x 800 with synthetic learner data.
2. Add atomic durable graph compare-and-write behavior in a separately reviewed persistence PR.
3. Record configured staging Supabase durable read/write evidence with approved non-production credentials.
4. Add export/delete lifecycle evidence for Personal Concept Graph metadata.
5. Re-run manual dogfood after the first closed-beta cohort creates real local and durable learner records.
