# S232F.1 Capture/Write persistence truth

## Scope

`/app/capture` and `/app/write` share `WrongAnswerCaptureForm`, so this slice fixes their save-state truth at one controller boundary. It does not change the capture stages, second-write stage order, learner fields, save destination, authentication, entitlement, analytics, or downstream queue behavior.

The previous `save_failed` branch reused the same success-shaped panel as durable and browser-local saves. It rendered “오늘 계획에 반영할 준비가 되었습니다”, plan/review candidates, and a cognitive-learning card even when both the account request and browser-local fallback had failed. This was a false-success state.

## Persistence states

- **Saving:** the submitted snapshot remains in React memory. The interface says that no save receipt has been confirmed yet.
- **Durable saved:** the existing API response must contain a durable item record whose stored `user_confirmed_fields` echoes the exact controller operation ID and work-revision ID. Only then may the F.0 `Completed` state render with `durable_record` evidence.
- **Browser-local summary saved:** the existing local-note write may preserve only the derived gap and next-action summary. It is not bound to the current operation and work revision, so it never creates a receipt and never renders the F.0 `Completed` state. The original learner input remains in the form, one account-save retry action is shown, and no automatic synchronization is claimed.
- **Save failed:** both account persistence and browser-local persistence failed. The F.0 `Error` state reports `memory_only`, never `queued_for_sync`, and exposes one action: return to the retained learner input and save again.

The controller assigns two UUIDs to each account-save snapshot and places them inside the already-supported metadata record. The server route and database schema are unchanged. A success-shaped response that does not echo the current binding (for example, an older deduplicated record) is treated as unconfirmed: it does not clear the draft, emit the existing saved event, or render any success subtree. This fails closed rather than borrowing an unrelated receipt.

The pending operation binding remains only in component memory and is reused while the submitted work fingerprint is unchanged. If the server accepted a request but its response was lost, the next retry can therefore validate the deduplicated record that carries the original binding. Editing any captured field or page produces a different fingerprint and a new work-revision binding. A confirmed durable response settles and removes the pending binding.

If a deduplicated durable record belongs to a genuinely older binding, retrying cannot make that record echo the current revision. The controller therefore builds typed F.0 `Conflict` evidence from the current learner snapshot and the real persisted record. The UI does not advertise another save retry; it keeps the current input and offers one identifier-free link to find the existing record in Learning Notes. Missing or malformed conflict evidence fails closed to the ordinary memory-only error state.

Operation, revision, and record IDs are controller evidence only. `FailureAwareState` consumes them but does not render them. They are forbidden from the runtime artifact and from the learner-facing state DOM.

## Failure boundary

The `save_failed` branch returns before every success-only subtree. It renders none of the following:

- today-plan or review candidates;
- saved-location links;
- the cognitive-learning action card;
- a success title, stable-status panel, or `data-v3-system-state="completed"`;
- an automatic retry or synchronization claim.

The original form state is not cleared. Choosing “입력 확인 후 다시 저장하기” returns to the correct quick-capture or confirmation stage with the learner input still present.

While a request is in flight, the editable work surface and global footer are contained in one disabled fieldset. The loading state remains visible, but text, subject, file, stage, reset, defer, and footer controls cannot mutate the snapshot that is waiting for a receipt. Secondary footer actions are also suppressed while submitting. The surface becomes editable again on failure, so an older bound response cannot clear a newer in-flight learner edit.

Entering the saved-result stage does not also move focus to the outer stage heading. Its local F.0 state (or local-summary live region) provides the single state announcement, reducing duplicate screen-reader narration; the normal stage-heading focus behavior remains for editable workflow transitions.

The browser-local summary branch follows the same retention rule. It identifies the exact limited fields saved locally, explicitly states that account persistence is unconfirmed and automatic synchronization is not registered, and exposes one account-save retry action. It contains no plan/review candidates, cognitive-learning card, or Completed primitive.

## Automated source gate

`tests/s232f1-capture-persistence-truth.test.mjs` verifies the durable account-success receipt path, accepted-response-lost dedupe convergence, edited-work binding rotation, stale-dedupe conflict recovery, browser-local summary round-trip without a synthesized receipt, draft retention, the full in-flight editing/footer lock, memory-only failure semantics, success-subtree exclusion, no queue-backed auto-sync claim, shared Capture/Write adoption, and privacy-safe runtime wiring.

Run locally:

```bash
npm test -- --test-concurrency=1 tests/s232f1-capture-persistence-truth.test.mjs tests/s232f0-failure-aware-state-contract.test.mjs tests/s232e1-capture-outer-flow.test.mjs tests/s232e2-second-write-clarity.test.mjs
npm run typecheck
npx eslint components/review-os/capture-form.tsx lib/review-os/browser-storage.ts lib/review-os/capture-persistence-controller.ts tests/e2e/s232f1-capture-persistence-truth.spec.ts
```

## Exact-head runtime gate

The PR body must include:

```html
<!-- run-s232f1-auth-e2e -->
```

`.github/workflows/s232f1-runtime.yml` discovers a successful Vercel Preview for the exact PR head, verifies `/api/runtime/version`, and runs the authenticated Capture scenario at 390px and 1440px in the same document.

The test blocks browser storage writes and fulfills the Capture POST with an explicit synthetic negative acknowledgement (`HTTP 200`, `ok: false`) before it reaches the server. This exercises the same no-receipt fallback without creating a browser-generated resource error. It proves:

- the in-flight state says input is memory-only and a save receipt is not yet confirmed;
- the editable work surface is locked until that request resolves and is re-enabled for recovery;
- the resulting F.0 state is `error` plus `memory_only`, with no auto-sync claim;
- there is exactly one keyboard-focusable recovery action;
- no plan/review candidate, success subtree, or Completed state exists;
- using the recovery action restores the exact in-memory input;
- the intercepted save request never reaches the server;
- browser storage and analytics remain unchanged, while blocked storage write attempts are observed only as a count;
- responsive overflow is absent and serious/critical Axe findings are zero;
- console errors, page errors, and same-origin request failures are zero; the one intercepted synthetic negative acknowledgement is counted separately.

The test does not claim global database immutability because unrelated external activity is outside browser-local evidence.

## Privacy boundary

The artifact is a flat scalar object. It contains counts, booleans, and exact runner/deployment SHAs only. It never contains credentials, learner input, reference or answer text, subject, email, URL, DOM, screenshots, traces, videos, operation IDs, work-revision IDs, record IDs, storage keys, storage values, or request bodies.

## Change boundary and rollback

There are no schema, API, auth, entitlement, or analytics changes. The local-note shape, timestamp-based ID behavior, storage key, and read path remain unchanged. A local record is deliberately not adapted into persistence evidence because it cannot prove the current account-save operation and work revision.

One revert removes the controller adapter, shared Capture/Write adoption, source/runtime tests, documentation, and workflow. No data migration or environment change is required.
