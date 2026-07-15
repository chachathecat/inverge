# S232F.4b — remaining authenticated read states

## Scope

This bounded slice closes the two source-proven false-empty gaps left after S232F.4a: the authenticated Study Ledger/Agenda route and the Weekly plan route. The S232F.2 access decision still runs before account reads. Session and first-O/X mutation-oriented flows are intentionally outside this slice because their source did not demonstrate the same core-route false-empty contract.

## Agenda truth table

- `agenda_items`, `agenda_review_queue`, and `agenda_usage_events` are record-bearing essential reads.
- If any essential read is unavailable, Agenda renders the shared retryable F0 Error state with `safety: unknown`; it never constructs an empty timeline from fallback arrays.
- The browser-local note read starts as F0 Loading and uses the strict status-bearing parser introduced in S232F.4a.
- Empty is possible only after every essential read succeeds, the merged account event count is zero, and the browser-local read succeeds with zero valid notes.
- Malformed or unavailable browser-local storage renders an explicit degraded notice. Verified account events remain visible when present; when no account events are present the route does not fake Empty.

## Weekly truth table

- `weekly_plan` is the authoritative essential read. Its failure renders the shared retryable F0 Error state.
- Learning-signal summary, learning-signal events, and Today focus support only the secondary weakness diagnostic. They are optional typed reads; failure preserves verified plan tasks and renders one bounded degraded notice.
- Empty is rendered only after the essential weekly plan succeeds with zero tasks. Weekly does not treat browser-local notes as plan tasks, so its Empty shell explicitly skips that unrelated local-record check.
- Agenda and Weekly both have route F0 Loading boundaries. Existing route-specific Capture continuation, task ordering, three-task cap, timeline semantics, and accessible 44px-minimum controls remain in place.

## Safety and verification boundary

Read failures emit only source name and essential/optional criticality. No raw learner content, thrown error, stack, credentials, or provider payload is logged or stored as evidence. There is no production fault injection and no schema, API, auth, environment, provider, ranking, or data-semantics change.

Source tests cover access-before-read ordering, essential/optional classification, Empty proof ordering, strict browser-local unavailable handling, F0 mapping, accessibility hooks, metadata-only logging, and runner registration. Typecheck, changed-file lint, the full node suite, and production build remain the implementation gates. App-wide runtime and screen-reader acceptance remain S232G work.
