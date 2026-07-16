# S232F.6 Session and First OX source-read truth

## Scope

This slice closes the remaining requested-source read gap in Session and First
OX without changing schema, auth, billing, provider, ranking, or learner-data
contracts.

- Access resolution remains ahead of every requested source read.
- Session confirms a saved Capture only after the exact current-account detail
  is readable, Capture-originated, and in the active exam mode.
- First OX uses the existing authenticated item-detail GET route and classifies
  strict success, missing-or-denied, and retryable unavailable outcomes.
- Missing and denied intentionally share one enumeration-safe surface.
- Requested missing or unavailable states never mount sample O/X practice.
- Query-free `/app/first/ox` remains the only automatic sample entry.
- First OX write failure remains memory-only. No statement, attempt, signal, or
  account scope is written to browser storage.
- A success message requires the exact `{ ok: true, saved: true }` receipt, and
  per-attempt state prevents an older response from changing the current item.

## Source verification

The focused contract covers:

- frozen `ready`, `missing`, and retryable `unavailable` outcomes;
- metadata-only unavailable logging;
- 200 ready/null, 401, 403, 404, malformed 200, 429, 500, and 503 response
  classification;
- access-before-read ordering and nullable email support;
- Session single-read reuse and separation of saved-confirmation from queue
  detail;
- requested First OX no-sample behavior, empty-ID handling, stale navigation
  invalidation, strict ownership/type checks, and no content-bearing storage;
- repository ownership scoping by both current user and requested item.

## Exact-head Preview acceptance

The dedicated workflow resolves the protected Vercel Preview for the exact PR
head and fails closed on any SHA mismatch. Its authenticated browser run checks:

- a controlled browser-only 503 source read, keyboard retry, and strict ready
  recovery through the production client loader;
- a genuine current-account missing lookup through the real Preview API;
- Session missing detail without success-shaped confirmation;
- a synthetic alternate-owner response rejected before content or practice is
  rendered;
- two isolated real invited-account sessions where account B receives the
  exact owner-scoped `200 { ok: true, detail: null }` response for an existing
  account A item, bounded by successful account A owner-detail reads before
  and after, followed by missing-only Session and First OX UI;
- 390, 768, and 1440 widths plus the 720px desktop-at-200%-width equivalent;
- horizontal overflow, keyboard reachability, computed focus visibility,
  labelled failure region, polite live announcement, and Axe serious/critical
  zero;
- zero product-origin main-flow post-login browser mutation requests, an unchanged final
  digest for the first 100 visible wrong-answer IDs, an unchanged final browser
  storage digest, and context-wide zero storage/analytics mutations after login;
- zero unexpected console, page, or same-origin request failures across the
  main flow and both real-account contexts.

The seven-day artifact is one flat scalar JSON object. It contains no
credentials, account identifiers, item identifiers, URLs, learner content,
synthetic payload, request/response body, DOM, screenshot, trace, or video.

## Evidence limits

- CI prefers dedicated account A and B secrets and may reuse the existing
  E2E/TEST credential namespaces as A/B only when both are provisioned. It
  fails closed when either account is unavailable, both credentials resolve to
  one identity, or account A has no existing read-only item fixture. The run
  creates no learner record.
- Browser mutation instrumentation fails closed when its context binding,
  barrier, or origin validation is unavailable; browser-local and Node-side
  instrumentation error counts must both remain zero.
- The protected Preview may inject its own `vercel.live` toolbar. Its bounded
  cross-origin POST is aborted before transmission, counted separately, and
  never treated as an application mutation. Every other non-read request,
  including unknown cross-origin traffic, remains fail-closed.
- The controlled 503 and strict recovery payload exist only in Playwright route
  interception. There is no production query, cookie, header, environment
  branch, or fault-injection backdoor.
- `ensureAccess` may refresh profile metadata, and Session focus reads may have
  existing server-side materialization effects outside the requested missing
  branch. Evidence therefore proves the bounded browser and owner-scoped read
  invariants above, not database-wide immutability. The first-100 visible ID
  digest is a final-state backstop, not a complete record-set mutation proof.
- No official grading, model-answer authority, score, or pass claim is added.

## Rollback

Revert the slice. There are no migrations or stored-data transforms. Previously
written unscoped First OX fallback entries are no longer read or created by this
flow; this slice does not delete unknown browser data.
