# S232D.5 Today Primary Information Architecture

## Evidence boundary

The connected Figma V3 Product Screens page contains Study Ledger detail and Calculator runner frames, but no directly observed Today product frame. This slice therefore makes **no pixel-parity claim** for `/app` or `/app/today`. It applies the established V3 typography and information-hierarchy language to the existing Today mission without inventing a missing Figma screen.

The slice is limited to:

- the authenticated `/app` primary mission markup
- reason, estimated duration, continuation, and dominant-action hierarchy
- stable non-content-bearing selectors for authenticated acceptance
- existing Today-task and secondary-disclosure ownership markers
- exact-head runtime acceptance at 390px, 768px, and 1440px

Capture, Review, Notes, Study Ledger detail, Today ranking, scheduling, persistence, analytics, subject selection, feedback, and learning behavior remain outside this presentation slice. `/app/today` remains a redirect-only compatibility route.

## Canonical Today hierarchy

The existing dynamic mission remains the only primary Today surface. Its semantic order is:

1. `오늘 할 일 · 오늘의 1개`
2. the existing dynamic mission title as the page's single `h1`
3. `왜 이걸 하나요`
4. `예상 시간`
5. `끝나면 이어질 것`
6. the existing dominant CTA

The three context values are expressed as one definition list. Their values, the mission title, CTA label, and CTA destination are unchanged. Rendered Today tasks keep their existing source-union order and remain capped at zero to three observed tasks. Secondary work remains closed by default.

## V3 and authority boundary

The mission heading uses the established `v3-type-screen` role and the eyebrow uses the V3 caption role. There is no claim that the resulting Today layout matches an unobserved Figma frame.

Today data does not establish the evidence contracts required for `StateChip`, `BiggestGap`, `EvidenceExcerpt`, `Official`, or `Confirmed`. This slice introduces none of those components or authority labels and does not add score, pass, or due-today claims.

## Runtime truth boundary

Rendering `/app` is not globally read-only in the existing product. Server-side read paths can refresh access/profile timestamps, create Today focus action seeds, log view telemetry, and materialize a missing weekly summary. S232D.5 does not change those existing behaviors, and its runtime evidence **does not claim total database immutability**.

The authenticated acceptance instead proves the narrower action-safety claim required for this IA slice:

- the initial authenticated Today render happens once at 390px
- the same document is resized to 768px and 1440px without reload or route navigation
- the test never activates a Today CTA or learner-navigation link
- every same-origin post-render `POST`, `PUT`, `PATCH`, or `DELETE` request is blocked before delivery and fails the run
- the observed learner-action mutation request count remains zero
- browser `localStorage` and `sessionStorage` are compared in-browser by digest and remain unchanged
- the in-memory `dataLayer` and `invergeDataLayer` lengths remain unchanged

Opening and closing the marked native `details` element is the only local interaction beyond keyboard focus. It is immediately reversed and has no persistence path.

## Acceptance

- exactly one `h1` and one primary mission region labelled by that heading
- canonical Today eyebrow and the V3 screen typography role
- semantic definition-list order: reason → duration → continuation → dominant CTA
- exactly one dominant CTA
- current Today learner-navigation semantics without activating navigation
- rendered Today tasks observed in the range 0..3, with no fixture creation
- all secondary diagnostics closed by default
- the skip link, main landmark, dominant CTA, and secondary summary are reached through real Tab/Enter keyboard input
- focused controls match `:focus-visible` and expose a computed outline, shadow, border-color, or background-color delta
- horizontal overflow is at most 1px at 390px, 768px, and 1440px
- Axe serious/critical, console, page, and unexpected same-origin errors are zero
- the protected Preview deployment SHA matches the exact PR head before and after acceptance

## Evidence privacy

The workflow validates and uploads exactly one flat scalar JSON file. It contains only exact-SHA equality, bounded counts, booleans, and error totals. It contains no learner text, question text, task title, subject, URL, email, credential, DOM, screenshot, trace, or video. Browser-storage contents and analytics entries are never exported; only equality and zero-delta results enter the artifact.

Playwright screenshot, trace, and video capture are disabled. A workflow allowlist rejects nested or additional evidence fields before upload.

## Rollback

One revert restores the previous Today markup and removes the S232D.5 selectors, source contract, and authenticated runtime gate. No schema or learner-data rollback is required.
