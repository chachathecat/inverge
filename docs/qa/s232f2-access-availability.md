# S232F.2 Review OS access-check availability

## Goal

The authenticated Review OS shell now distinguishes three internal outcomes:

- `allowed`: the access lookup completed and the invite state permits entry.
- `denied`: the access lookup completed and the real invite state does not permit entry.
- `unavailable`: the persistence-backed access lookup could not complete, so neither allowed nor denied may be inferred.

The unavailable branch renders the shared Figma V3 `FailureAwareState` error contract. It is retryable, its safety is `unknown`, and `preservationKnown` is false. The page explicitly says that the screen is not an invite-denial result.

## Failure and data boundary

`reviewOsRepository.ensureAccess` may update or insert profile metadata before a later operation fails. The unavailable result therefore does not claim that input or data is unchanged, saved, offline, locally retained, or queued. It does not expose the persistence error, email, user id, or learner content. Logging records only the metadata-only reason category.

Only the access lookup is translated into the unavailable result. Unexpected errors are rethrown. Profile and usage work happens only after an allowed result and is outside the access classifier, so unrelated failures cannot become invite denial.

The access lookup is request-memoized inside one server render. The persistent App Router layout protects the initial shell, and every data-bearing `/app` page has its own route-level early guard before redirects, profile fallbacks, entitlement calculations, or service calls. This is required because an upper template does not remount for deeper-segment or search-parameter-only navigation. A page therefore cannot inherit an earlier allowed shell and silently render through a later unavailable or denied result. Usage summary work reuses that exact allowed result and does not perform a second access lookup that could escape the classifier.

## Retry and accessibility

The unavailable page keeps one visible `h1`, then explains what happened through `FailureAwareState`. Its only action calls `window.location.reload()`, which reloads the exact current URL rather than redirecting the learner elsewhere. The initial error does not move focus and does not introduce a production-only test switch.

## Runtime decision

Authenticated runtime fault injection was not added. Safely forcing the persistence operation failure would require either a real outage or a production backdoor. Source and unit tests instead exhaust the three result variants, both recognized unavailable reasons, unknown safety, retry semantics, persistent-layout and route-level page gates, explicit redirect/delegation exceptions, request memoization, single access lookup before usage, error isolation, nested-main avoidance, and forbidden success/offline/queue claims.

## Change boundary

There are no schema, API, auth, or environment changes. Existing unauthenticated login redirect behavior and real invite denial copy remain in place. No raw learner content or secret is added to UI, logs, tests, or evidence.

## Rollback

Revert the S232F.2 commit. No migration, stored data transformation, flag cleanup, or environment rollback is required.
