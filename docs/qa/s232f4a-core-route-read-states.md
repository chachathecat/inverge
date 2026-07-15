# S232F.4a — Core route read states

Parent: S232 App-wide Figma V3 parity (`#574`)

Scope: source-level failure-aware state integration for Today, Review, and Notes/items. This slice does not claim pixel parity or authenticated runtime acceptance.

## Outcome contract

Every route read is classified before it reaches learner-facing UI:

- an **essential** read returns `ready(value)` or a retryable `unavailable` result;
- an **optional** read returns `ready(value)` or an explicit bounded `degraded(fallback)` result;
- an unavailable essential read renders the shared F0 Error state with `safety: unknown` and a reload action;
- an unavailable optional read may keep verified core records visible, but the route must show the bounded partial-data notice;
- Empty is rendered only after all essential reads succeed and every route-specific record signal is zero.

No rejected read is converted directly to `[]`, `null`, a fabricated Today focus, or a default daily-activity object. Read diagnostics log only a fixed source identifier and criticality; errors and learner content are not copied into logs or UI.

## Route classification

| Route | Essential reads | Optional reads | Empty proof |
| --- | --- | --- | --- |
| Today | focus, wrong-answer items, learning-signal events, daily activity, applicable recent study log, learner plan tasks | weekly summary, learning-signal summary, question-reference hints | no filtered items, queue entries, events, recent log, tasks, focus source IDs, saved-today signal, or completed-today signal |
| Review | review queue and applicable calculator-routine candidates | capture-detail reference enrichment | both queue items and calculator candidates are zero |
| Notes/items | wrong-answer items and learning-signal events | none in this slice | both item and learning-signal collections are zero |

The S232F.2 access result remains the early gate. Learner data reads do not start until `access.status === "allowed"` and a session identity is present.

## Local records and truthful Empty

Account-backed zero records are not enough to assert Empty because the closed beta can also have browser-local notes. The shared empty shell performs a status-bearing local browser read:

Local browser records therefore prevent fake Empty presentation:

- local records present: render those records and do not render F0 Empty;
- confirmed zero local records: render F0 Empty with a Capture continuation;
- local read unavailable: render a bounded degraded-local-read state and never fake Empty;
- local check pending: render F0 Loading.

Legacy local-note cards suppress their own empty message inside these routes, so one route cannot present two contradictory empty explanations.

When account-backed core records are non-empty, the same status-bearing local read still applies. An unavailable browser-local read renders one metadata-only degraded-local-read notice while the verified core records remain visible; it is never silently converted to a ready empty local list. Inside the shared Empty shell, the child local component suppresses its copy of that notice so the parent notice appears exactly once. Malformed JSON, non-array payloads, invalid note objects, unknown mode/source enums, non-fixed safety flags, and unexpected fields are classified as unavailable without logging raw local content.

## F0 state mapping

- Loading: `safety: not_applicable`, supplied by route `loading.tsx` boundaries.
- Empty: `safety: not_applicable`, only after essential and local zero-record proof.
- Error: `retryable: true`, `safety: unknown`, `preservationKnown: false`.

The Error copy does not claim that writes were unchanged, persisted, queued, or safe to synchronize. A read can overlap provider or persistence uncertainty, so preservation remains unknown.

## Verification boundary

This slice adds deterministic loader and source-contract tests plus the standard type, lint, full-suite, and production-build gates. It adds no production fault injection. Exact authenticated failure/degradation runtime scenarios remain part of S232G; this slice does not manufacture a production-only query parameter, cookie, environment flag, or test endpoint.

There is no schema, API, auth, environment, or learner-data migration. Existing saved records, access behavior, route names, and Figma V3 content hierarchy remain in place.

## Rollback

Revert the S232F.4a commit. No data rollback is required because this slice does not write or migrate learner records.
