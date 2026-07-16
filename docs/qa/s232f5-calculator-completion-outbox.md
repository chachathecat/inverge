# S232F.5 calculator completion outbox

## Evidence boundary

This slice backs the calculator completion `Offline` state with a real browser-local outbox. The queue stores only the existing strict calculator completion metadata signal. It never stores calculator entries, learner answer or problem text, OCR text, credentials, request or response bodies, DOM, screenshots, traces, or videos.

The Figma V3 Utilities/States contract defines the Offline semantic state but does not provide a product-frame pixel reference for every calculator placement. This slice claims semantic/component parity only, not pixel parity.

## State and receipt contract

`FailureAwareState` may show queue-backed Offline only after all of the following are true:

1. the completion signal is canonical, complete, second-round appraisal-practice metadata;
2. the outbox entry has a UUID queue ID, canonical queue timestamp, and an opaque SHA-256 account scope derived from the server session;
3. mount, online, and storage-event auto-sync listeners are registered;
4. `localStorage.setItem` succeeds; and
5. a read-back of the stored value proves the exact queue ID is present.

If validation, queue-ID creation, storage, or read-back fails, the UI reports failure and never claims Offline or automatic synchronization. Login expiry (`401`) and validation/authorization responses (`400`, `402`, `403`, `404`, `422`) do not create a new queue claim. Network uncertainty, response loss, malformed success acknowledgement, and retryable HTTP failure may create a verified local queue record so a later retry converges through the server's existing idempotent completion path. F0 Offline is reserved for `navigator.onLine === false`; online delivery uncertainty uses a truthful pending-queue status.

An entry leaves the outbox only after a `2xx` JSON acknowledgement proves `ok: true`, `learningRecordSaved: true`, a UUID learning-record ID, and a mutually consistent `saved` or `deduped` status. A boolean, an arbitrary successful HTTP response, an invalid record ID, a mismatched dedupe flag, `401`, or a validation response cannot remove it. Terminal entries remain present without blocking later eligible entries.

## Queue integrity and liveness

- The outbox is capped at 16 canonical entries and deduplicates the same account scope and server-equivalent completion fingerprint fields. A full queue rejects a new claim without evicting an unacknowledged entry. A valid over-capacity set fails closed without truncation; invalid, duplicate, or content-bearing members are still removed while every canonical unacknowledged entry is preserved.
- Unknown fields, invalid IDs/timestamps, incomplete step sets, malformed JSON, duplicate queue IDs, and content-bearing/raw-field shapes are discarded and rewritten out of local storage.
- The account scope is never placed in the completion request. Before any queued send, the client re-derives the current opaque scope from `/api/auth/session`; a mismatch is retained but not transmitted. A mismatch, an unavailable session read, loss of foreground focus/visibility, or any cross-tab storage change invalidates the cached scope. Offline enqueue additionally requires the same visible focused page epoch, so a cookie-backed account switch in another active window cannot reuse stale account authority. The completion endpoint still derives the only remote owner from its authenticated request.
- Sync is serialized within the page and across tabs with the browser Web Locks API. Browsers without that atomic cross-tab primitive fail closed instead of using a non-atomic localStorage lease.
- Mount, browser `online`, visibility, bounded exponential retry, and same-origin cross-tab `storage` events request a flush. A queued request that still lacks a durable receipt remains queued; the UI never promises that automatic retry will succeed.
- The existing server endpoint, auth boundary, metadata parser, deterministic learning-event identity, and durable dedupe remain authoritative.

## Verification

Source tests cover canonical enqueue/read-back evidence, account-scoped fingerprint dedupe on enqueue and read, auto-sync registration, offline-only F0 mapping, queue bounds without eviction, mixed-overflow raw/corrupt purge, valid-overflow fail-closed preservation, storage denial, exact durable receipt removal, consumer wiring, and serialized retry paths. The authenticated exact-head workflow must additionally prove offline completion after an observable session-scope readiness boundary, exact browser queue shape, reload identity persistence, a live-page and reload synthetic alternate authenticated-session denial, exact queue-identity preservation after `401` and malformed receipt, two-live-tab Web Lock exclusion through a bounded held/pending poll, pending-state convergence after cross-tab durable removal, an intercepted synthetic deduped receipt, queue removal, 390/768/1440 responsive behavior, a 1440px-at-200%-width reflow equivalent, keyboard Tab reachability, ARIA live-region contract, Axe serious/critical zero, zero unexpected console or page errors after excluding only the controlled Offline and `401` browser messages, and zero real completion mutations. Its artifact is flat metadata-only JSON and does not contain the account scope, queue ID, record ID, learner content, request/response body, or credentials. The alternate identity is supplied through the session-response contract because the workflow has one dedicated credential; it does not claim a two-real-account end-to-end login.

## Boundaries and rollback

There is no schema, API, auth, billing, provider, ranking, production fault-injection, or learner-data contract change. Capture remains outside this queue contract. Calculator completion remains learning support, not official grading, a confirmed answer, a device-accuracy claim, or verified fx-9860GIII keystroke guidance.

Rollback is one revert of this slice. Existing durable records are unchanged. Browser outbox data can remain inert under the versioned storage key; no migration or server cleanup is required.
