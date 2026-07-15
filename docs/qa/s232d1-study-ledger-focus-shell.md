# S232D.1 Study Ledger Focus Shell

## Evidence boundary

This slice uses only directly observed Figma V3 product screens:

- mobile Study Ledger `56:2`, chrome `56:3`
- desktop Study Ledger `59:62`, chrome `59:63`

Figma V3 contains no Today home, Notes list, Review queue, or global five-tab shell screen. This PR therefore claims exact chrome parity only for the authenticated Study Ledger detail. Other routes retain the existing operating shell.

## Route contract

Canonical second-round `/app/items/[itemId]?mode=second` routes select `data-learner-shell-mode="focus"` from the live client pathname and query. The focus shell retains the first-focus skip link and exactly one `main#learner-main`, while omitting the overview header and learner navigation. The skip link targets `#study-ledger-content`, so it bypasses the focus chrome rather than landing before it. `/app`, non-detail routes, and first-round compatibility routes retain `data-learner-shell-mode="default"` and the five-item navigation. Detail requests with a missing or stale mode are redirected to the persisted record's canonical mode.

The focus chrome is shared by success, loading, error, and not-found states for `mode=second` so route transitions do not lose navigation context. Acceptance clicks a real Notes detail link and the chrome back/home links; it does not infer client-navigation correctness from full page loads.

## Mobile and tablet

Below 1024px the chrome follows `56:3`:

- 56px high
- native back link with a 44×44 target
- visible `학습 노트` title
- honest route status; successful detail uses `저장됨`
- `viewport-fit=cover` safe-area padding without changing the 56px browser geometry when the inset is zero

The body stays one column. This also respects the V3 768px rule that forbids a split workspace. The post-detail feedback area retains horizontal spacing and enough bottom clearance to scroll above the fixed action dock.

## Desktop

At 1024px and above the chrome follows `59:63`:

- 72px high
- 64px horizontal padding and 24px gaps
- `답안길 by Inverge` home link
- truncated `학습 노트 / {title}` breadcrumb
- `저장됨 · {persisted date}` using real record metadata

The Figma sample's `2분 전` is not fabricated. The existing Ledger body remains unchanged in this slice; its 680px reading-column and 288px evidence-rail ownership are deferred to S232D.2.

## Safety boundary

- No schema, API, auth, RLS, storage, persistence, ranking, completion, analytics, or learner-data change.
- Existing StateChip, TrustEvidenceBar, BiggestGap, EvidenceExcerpt, StickyAction, and conservative evidence inference remain unchanged.
- No official evidence, confirmed score, recovery history, relative time, or device verification is invented.
- Runtime evidence is scalar metadata only. It captures no learner content, email, credential, DOM, screenshot, trace, or video.

## Acceptance

- source contract and focused regressions pass
- TypeScript and targeted ESLint pass
- production build passes
- exact PR head equals protected Preview deployment SHA before and after browser acceptance
- 390/768/1440 runtime: chrome geometry, 768 one-column/1440 existing 680+288 track geometry, desktop 64px inset/24px gap, one detail, one main, real client-navigation round trip, default-shell preservation, 44px target, skip target, keyboard/focus, overflow at most 1px
- source contract: persisted-mode canonicalization and first-round compatibility shell preservation
- Axe serious/critical, console, page, and unexpected same-origin errors: 0
