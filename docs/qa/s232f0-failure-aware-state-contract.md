# S232F.0 failure-aware state contract

## Evidence boundary

The connected Figma V3 Utilities/States page (`61:80`) establishes the semantic inventory for system feedback. It does not provide authenticated product frames for every loading, empty, error, offline, conflict, or completed route. S232F.0 therefore makes **no pixel-parity claim**. It introduces a reusable contract and V3-role presentation primitive before any feature screen adopts it.

This slice **does not modify existing feature screens**. Route-by-route adoption, exact-head authenticated runtime evidence, and replacement of the legacy `LearnerLoadingState`, `LearnerEmptyState`, and `LearnerErrorState` call sites belong to later S232F slices.

## Six-state contract

Every state renders three explicit answers:

1. what happened;
2. whether the learner's input or existing data is safe;
3. what the learner can do next.

The public selector is `data-v3-system-state=loading|empty|error|offline|conflict|completed`. The component is a labelled region with a real heading, description relationships, loading busy semantics, and an optional polite announcement. It never focuses the heading on first mount. Transition focus is opt-in, runs only after a genuine state change, and moves focus only when the active element is already inside that exact component instance. It therefore cannot steal focus from another form or another state component. Programmatic transition focus does not scroll the learner away from their current position.

The six states are deliberately evidence-bound:

- Loading reports an in-progress read without claiming a save.
- Empty reports that no displayable learning record exists without treating absence as an error.
- Error distinguishes retryable from non-retryable failures and always reports preservation status.
- Offline reports that automatic retry is registered only when the caller supplies a queue record with an **actual opaque queue ID**, canonical timestamp, and explicit retry registration. It never promises that retry or synchronization will succeed. A local draft, in-memory value, or unknown state never becomes an auto-retry claim.
- Conflict requires **at least two distinct typed source records** plus typed **comparator mismatch** evidence. The mismatch record names two different source IDs, a supported comparator, the current operation ID, an observation timestamp, and `mismatchObserved: true`. Both IDs must exist in the source set and the comparison operation must equal the current conflict operation. Display labels derive from the supported kinds; callers cannot pass free-form source or learner text. Two IDs or prose containing “conflict” cannot create the state.
- Completed requires a persistence receipt bound to the current **operation and work revision**. The state intent and receipt must carry the same operation ID and work-revision ID, plus a durable or device-local record ID and timestamp. An old receipt, an unrelated revision, or a boolean such as `completed: true` is rejected.

All nested evidence uses exact runtime keys and plain objects. Identifiers must be UUID or ULID shaped; UUIDs normalize to lowercase and ULIDs to uppercase before binding or uniqueness checks. Case variants therefore cannot become two sources or bypass operation/revision matching. Learner-like labels such as `draft-1` or raw-answer fragments are rejected. Times must be a round-trippable canonical UTC ISO timestamp with milliseconds. Offset timestamps, loose dates, and normalized invalid calendar dates fail closed. The generated Korean copy never derives official grading, confirmed score, pass probability, model-answer authority, or device verification. Synthetic fixtures live only in tests and are not exported from production code.

## Safety evidence

The safety vocabulary is `not_applicable`, `unchanged`, `memory_only`, `local_draft`, `queued_for_sync`, `persisted`, and `unknown`. These are not interchangeable:

- in-memory input is explicitly “not saved”;
- a local draft is explicitly scoped to the current device;
- queue-backed input is explicitly scoped to the device transfer queue and says only that retry is registered;
- persisted data says whether the evidence is a durable record or a device-local record and carries its operation/revision binding;
- unknown preservation remains unknown.

The component does not expose record IDs, queue IDs, timestamps, or learner content. Those values are consumed only to prove which state copy may be shown.

## Accessibility and presentation

`FailureAwareState` uses established V3 typography roles, semantic color tokens, panel/control radii, 44px-minimum optional actions, visible focus styles, a definition list for the three answers, and an accessibility-tree-visible state heading. It avoids `role="alert"` for recoverable learner flows and uses a polite `role="status"`. A route may opt into guarded transition focus, but first render never moves focus.

## Adoption boundary

S232F.0 has no schema, API, repository, storage, analytics, auth, entitlement, or learner-data mutation. Adopters must map real controller evidence into the strict union. They must not infer `Completed` from a success-colored UI, reuse a receipt from another operation/revision, infer `Conflict` from source presence or prose, or infer an offline retry registration from browser connectivity alone.

## Rollback

One revert removes the new contract, component, barrel exports, documentation, source tests, and test-runner registration. Because no feature screen uses the primitive in this slice, rollback requires no data migration or route repair.
