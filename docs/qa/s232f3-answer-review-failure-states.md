# S232F.3 Answer Review evidence-bound states

## Evidence boundary

The connected Figma V3 file contains no Answer Review loading, error, or persistence-failure frame. S232F.3 therefore makes **no pixel-parity claim**. It applies the established F0 FailureAwareState contract to the existing Answer Review controller without inventing a successful analysis, saved learning record, automatic retry, official grade, confirmed score, or grading authority.

While a structure request is in flight, Answer Review renders F0 Loading with memory-only (`memory_only`) safety. The current answer remains in React memory and the entry fieldset is locked until that request settles. This prevents an in-flight result from being presented against an answer that was edited after the request began. It does not claim local, queued, durable, or server persistence.

A failed structure request clears the previous draft, learning-signal status, reference grounding, biggest-gap result, rewrite entry, rewrite stage, copied-feedback acknowledgement, and result diagnostics. Returning to entry for learner edits invalidates the same result and provenance state before any input can change, so an earlier completion cannot label a new input revision as reviewed. Transient request, response, and normalization failures render retryable F0 Error with the same `memory_only` safety and preserve the current learner answer for editing or retry. Trial, core-limit, and billing acknowledgements render stable local copy and a non-retryable F0 Error with a login or `이용 범위 확인` action instead of repeating a contradictory server retry message. `INSUFFICIENT_INPUT` is also non-retryable until the learner adds answer, problem, or reference material, so its recovery action returns to `입력 보강하기`. Both non-retryable early returns and thrown failures clear stale result evidence. The step controller also refuses to enter rewrite without a current successful draft.

Successful analysis and learning-signal persistence are separate outcomes. When analysis succeeds but `learningSignalStatus` is `failed`, the biggest-gap result and rewrite action remain available because the analysis response succeeded. A visible status says that persistence could not be confirmed, rather than claiming the record definitely was not saved, and that weakness, review, and Today-plan reflection are unconfirmed. There is no unsupported “save again” action.

## Exact-head runtime boundary

The branch-scoped runtime gate authenticates with the dedicated test account, verifies the exact PR-head Preview SHA, and opens one Answer Review document at 390px, 768px, and 1440px. It locally fulfills only three exact `POST` fetches to `/api/answer-review/structure` at the runtime origin:

1. a successful synthetic analysis whose learning-signal acknowledgement is `failed`
2. an **HTTP 200 negative acknowledgement** that is held briefly so Loading can be observed, then released as `{ ok: false }`
3. an **HTTP 200 core-limit acknowledgement** with deliberately contradictory payload text, proving that the UI uses stable non-retryable copy and pricing recovery instead of offering retry

The request body is never inspected, recorded, uploaded, or sent to the application server. Every other non-read request after the baseline is blocked and fails the run. HTTP 200 is deliberate: the test exercises the application-level negative acknowledgement without manufacturing a browser request failure or hiding a console error exception.

Before the first fill and click, and again after the entry controls remount, the browser waits for the native controls to expose their React `onChange` and `onClick` handlers. This bounded hydration proof prevents an SSR-visible but not yet interactive control from losing the synthetic input or click.

The runtime verifies that:

- Loading is F0 `loading` + `memory_only`, the answer fieldset is locked, and the learner answer remains present
- a successful analysis with failed learning-signal persistence keeps one result and one rewrite entry while exposing the persistence warning
- the negative acknowledgement becomes retryable F0 `error` + `memory_only`
- the core-limit acknowledgement becomes non-retryable F0 `error` + `memory_only`, exposes no retry control, uses stable local copy, and provides a keyboard-reachable recovery link
- the previous biggest-gap result, rewrite entry, status disclosures, rewrite stage, and full diagnostics remain absent after failure
- the learner answer is unchanged after failure and can be edited or retried
- responsive overflow, Axe serious/critical violations, console errors, page errors, same-origin request failures, browser-storage changes, analytics-array changes, and unexpected server mutations remain zero

The runtime does not call the production structure service, model, entitlement counter, learning-signal repository, or database. Authentication can perform normal session access before the read-only baseline, so it **does not claim total database immutability**. There is **no production backdoor**: all synthetic success/failure behavior lives only in Playwright network interception and the branch-scoped workflow.

## Artifact privacy

The only uploaded artifact is one flat scalar JSON document containing exact SHAs, bounded counts, and booleans. It excludes credentials, email, learner content, synthetic fixture values, request/response bodies, subject, URL, DOM, screenshots, traces, video, storage keys, and storage values. Browser storage is compared only through an in-memory one-way digest.

## Rollback

One revert removes the F0 integration, stale-result guards, learning-signal warning, source/unit contract, runtime gate, and this document. No schema, API, environment, or data rollback is required.
