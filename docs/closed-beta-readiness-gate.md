# Closed Beta Readiness Gate

PR #363 adds a deterministic local readiness gate for the learner closed-beta baseline accepted after PR #359, PR #360, PR #361, and PR #362.

Golden flow protected by this gate:

Capture -> Save -> Notes -> Review -> Today -> refresh durability

## Extended Golden Flow after PR #417

The historical baseline above remains in force. After PR #417, closed-beta acceptance also tracks this extended learner operating loop:

Capture -> Study Note -> Concept Candidate -> Today Plan -> Review Queue -> Retrieval Review -> Calculator Routine -> Learning Record -> Personal Concept State -> Recovery

## M418 Mobile Reminder Gate

M418 extends the gate with mobile PWA and Web Push reminder source checks:

- PWA manifest and service worker exist.
- service worker only handles push and notification clicks, without broad offline caching.
- notification click destinations are restricted to `/app` and `/app/review`.
- notification settings, subscribe, unsubscribe, test, and protected cron routes exist.
- push payloads use an exact metadata-only allowlist.
- notification persistence tables use RLS and do not add raw learner-content columns.
- cron delivery uses a unique delivery key for dedupe.
- focused M418 tests run through `npm.cmd run check:mobile-pwa-web-push-reminder`.

Passing the local gate does not verify real mobile OS delivery or scheduler activation. Android/iPhone runtime acceptance is deferred to M419 after M418 is deployed with HTTPS, matching VAPID keys, Supabase migration history, an approved scheduler for the Vercel plan, and device-level evidence.

| Step | Durable path | Local fallback | Feature-flagged | Auth required | Metadata-only boundary | Draft / verification status |
| --- | --- | --- | --- | --- | --- | --- |
| Capture | Existing account-backed save when available | Browser-local closed-beta note fallback | No new flag | Required for account save | Shared capture signals are metadata-only; learner note may hold user-owned raw text | OCR/AI output remains an editable draft |
| Study Note | Account note/detail records when available | Browser-local note reflection | No new flag | Required for account records | Derived summaries and reflection metadata only | Learner-owned note, not official evaluation |
| Concept Candidate | Derived helper output | Rebuilt from safe local note metadata | No new flag | Inherits source flow | Yes | Candidate only |
| Today Plan | Existing Review Queue/learning-signal sources; optional graph read source | Existing non-durable/default plan | Durable graph reads require existing flags | Required for account Today state | Yes; max 3 primary tasks | Recommendation only |
| Review Queue | Existing account queue where available | Local reflection evidence only | No new flag | Required for queue completion | Completion metadata only | Ends in retry/rewrite/scheduled review |
| Retrieval Review | Existing review completion route | No durable completion claim for local-only reflections | No new flag | Required | Recall sentence/outcome metadata only | Recall before reveal; outcome required |
| Calculator Routine | Server Learning Record through existing completion API | Session/local completion history | No new flag for routine; graph write optional | Required for server Learning Record | Completion signal metadata-only; raw entries session-only | AI/generated guidance remains draft and official-verification-required |
| Learning Record | Existing `learning_signal_events` path | `local_only` sync state when unauthenticated | No new flag | Required for server save | Yes | Identical retry dedupes; changed completion creates a new revision |
| Personal Concept State | Optional Supabase graph write through M420 atomic RPC | Default path skips repository | `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase` and `PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES=1` | Required when enabled | Yes | Disabled by default; runtime Supabase smoke required before rollout |
| Recovery | Review candidate / Today recovery CTA reopens original routine | Local recovery status remains honest | Durable graph read/write optional | Required for account candidate persistence | Yes | Clean same-routine completion closes candidate; does not certify numerical correctness |

## Scope

This gate is docs/scripts/tests only. It does not change runtime learner behavior, persistence logic, instructor grading, Supabase requirements, or Q-Net/local official material handling.

The gate protects:

- canonical learner routes: `/app`, `/app/capture`, `/app/input`, `/app/entry`, `/app/notes`, `/app/review`
- `/app/input` and `/app/entry` aliases redirecting to `/app/capture` while preserving `mode` and `subject`
- primary closed-beta capture copy such as `오늘 한 것 올리기`
- local beta browser fallback disclosure on Notes, Review, and Today
- metadata-safe local beta note storage with `metadataOnly: true` and `safeUse: "closed_beta_local_note"`
- persistence status separation for `durable_saved`, `local_fallback_saved`, and `save_failed`
- learner runtime copy guardrails
- tracked-file boundary checks for unsafe raw official/Q-Net/local material patterns

## Prohibited Learner Copy

The readiness gate scans learner runtime sources, not docs/tests, for prohibited learner-facing claims or surfaces:

- official grading/model-answer/score/pass-fail copy
- payment copy
- public archive or problem-bank positioning
- instructor-console exposure

These terms may appear in documentation and tests as guardrails, but they must not appear in learner runtime surfaces.

## Local Beta Persistence

Closed beta browser fallback is a safety net for local/no-Supabase QA. It may show browser-local reflection records in Notes, Review, and Today, but it must not imply durable account persistence.

Durable server save and browser-local fallback save must stay visibly distinct:

- `durable_saved`: account/durable save succeeded
- `local_fallback_saved`: server save was unavailable, but this browser has a temporary closed-beta record
- `save_failed`: neither path completed and the learner should retry

## Official Material Boundary

The gate must not ingest, commit, or validate against raw official materials. It checks tracked file paths for high-risk local/Q-Net/raw material patterns such as `qnet_manifest.json`, local official material directories, raw OCR/answer dumps, and official binary material extensions in likely unsafe paths.

Metadata-only reference code and tests remain separate from learner-facing runtime copy.

## Running The Gate

Run the full local gate before marking a closed-beta readiness PR ready:

```powershell
npm.cmd run check:closed-beta-readiness
```

This command first runs direct static checks, then delegates to the existing official-source verification, learner-loop verification, route/source checks, data-boundary tests, question-reference tests, and build.

PR #363 validation additionally runs:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
node scripts/check-staging-learner-routes.mjs
npm.cmd run check:closed-beta-readiness
npm.cmd run verify:learner-loop:ci
npm.cmd run build
```

## Release Interpretation

Passing this gate means the local closed-beta learner golden flow remains metadata-safe, route-stable, copy-safe, and consistent with the owner QA evidence from PR #359.

It is not a replacement for manual browser QA when runtime product behavior changes.
