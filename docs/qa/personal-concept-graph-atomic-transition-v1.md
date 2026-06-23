# Personal Concept Graph Atomic Transition RPC v1

## Scope

M420 adds the durable-write foundation for Personal Concept Graph state transitions. It does not enable production writes by default and does not apply migrations to a linked Supabase project.

The affected path is:

```text
calculator completion
-> learning_signal_events create/dedupe
-> maybeUpdateCalculatorRoutineConceptState
-> maybeWriteExecutionSignalToConceptGraph
-> repository.transitionPersonalConceptNode
-> Supabase RPC transition_personal_concept_node_v1
```

## Current Race Fixed

Before M420, the durable write helper could read a node in application code, compare `updatedAt`, derive the next counters/state, and then upsert. Across two server instances, both writes could observe the same previous row. If the newer event wrote first and an older delayed event wrote second, the older event could overwrite the newer state.

M420 moves the transition decision into one database transaction. The RPC locks the event identity and concept identity, reads the current concept row with `FOR UPDATE`, computes the next metadata state from that locked row, and records event idempotency in the same transaction.

## Migration

Migration file:

```text
supabase/migrations/20260623_personal_concept_graph_atomic_transition.sql
```

It adds:

- `public.personal_concept_transition_events`
- RPC `public.transition_personal_concept_node_v1`
- unique event dedupe on `(user_id, event_id)`
- own-row select RLS for transition event audit rows
- authenticated-only execute grant for the RPC

The migration is forward-only. It depends on the existing `public.personal_concept_nodes` table from the 20260605 migration.

## Transition Identity

The transition identity is:

```text
authenticated user + exam_mode + subject_id + unit_id
```

The client does not pass `user_id` into the RPC. The RPC derives ownership from `auth.uid()`.

The idempotency identity is:

```text
authenticated user + event_id
```

## Status Contract

| Status | Meaning |
| --- | --- |
| `applied` | The event was accepted and the node was inserted or updated from the locked database row. |
| `already_applied` | The same event was previously recorded for the authenticated user; counters are not incremented again. |
| `stale_signal` | The event was unique but older than the stored node `updated_at`; current node state is returned. |
| `rejected` | The request is malformed, unsupported, unauthenticated, or has the same timestamp as a different event. |

Same timestamp behavior is deterministic: the same event returns `already_applied`; a different event with the same timestamp returns `rejected` with `same_timestamp_different_event`.

## Metadata Boundary

The RPC accepts only derived metadata:

- event id
- exam mode
- subject id
- unit id
- task type
- result
- confidence band
- due bucket
- recent miss count
- occurrence timestamp

It must never receive raw OCR, problem text, answer text, formulas, numbers, CASIO input, display values, official answers, model answers, score predictions, instructor comments, secrets, or provider tokens.

## Repository Contract

When these flags are both enabled, durable writes use the atomic transition path:

```text
PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase
PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES=1
```

The Supabase repository calls `transition_personal_concept_node_v1` through `client.rpc(...)`. It no longer authorizes by client-controlled `userId` in the RPC parameters. Existing read/list/delete helpers remain available for their current feature-flagged paths.

Default behavior remains unchanged when flags are missing: memory/local behavior is used and no Supabase durable write is attempted.

## Smoke Script

Static and focused test coverage is wired through:

```powershell
npm.cmd run check:personal-concept-graph-atomic-transition
```

The live smoke script is:

```powershell
npm.cmd run check:personal-concept-graph-atomic-transition-smoke
```

It fails closed unless `PERSONAL_CONCEPT_GRAPH_ATOMIC_TRANSITION_SMOKE=1` is intentionally set. It prints aggregate status classifications only and must not print endpoints, push keys, private keys, access tokens, service-role credentials, or row payloads.

Do not use `npx.cmd supabase db push --linked --include-all` for this work. Apply the forward migration only through an approved owner workflow.

## Validation Plan

Required local validation:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run check:personal-concept-graph-atomic-transition
npm.cmd run test -- --workers=1
npm.cmd run verify:learner-loop:ci
npm.cmd run check:closed-beta-readiness
npm.cmd run build
git diff --check
git status --short
```

Live Supabase smoke is not part of default local validation and must be run only with intentionally supplied non-production auth context.

## Rollback

Runtime rollback is flag-only:

```text
PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES=0
```

or unset `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase`.

Schema rollback, if ever required, must be a separate reviewed migration after callers stop using the RPC. Existing rows should not be deleted as part of routine rollback.

## Residual Risks

- Live Supabase behavior still requires applying the migration in an approved environment and running the gated smoke script.
- Export/delete lifecycle for `personal_concept_transition_events` remains a later lifecycle PR.
- Production durable-write enablement remains blocked until owner-approved runtime evidence exists and flags are intentionally configured.
