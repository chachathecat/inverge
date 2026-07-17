# S232G final aggregate Figma V3 parity

## Scope and claim boundary

S232G is the final exact-head acceptance slice for the authenticated learner
application. It does not change schema, API, auth, billing, provider, ranking,
or learner-data contracts. It validates the merged S232 aggregate on a protected
non-production Preview with two dedicated invited test accounts and fixed
synthetic content.

The runtime may claim only what its evidence proves:

- Study Ledger detail has direct product-frame comparison against mobile nodes
  `56:2`, `56:3`, `56:8`, `56:47` and desktop nodes `59:62`, `59:63`,
  `59:68`, `59:100`, `59:104`.
- Calculator has direct component-contract comparison against `57:34`, `57:57`,
  and `53:129`. The authenticated product route renders the real
  `CalculatorStep`, proves its KeyInput/Display/Transfer transitions and computed
  component geometry, including the 350px mobile shell and 302px inner regions,
  and performs no completion POST. It has no direct product page frame and
  therefore makes no page-level pixel parity claim.
- All other canonical routes are checked against the shared V3 foundation and
  semantic-component boundary: mapped color/type/spacing/radius/control tokens,
  route heading and focus behavior, state vocabulary, and known shared-component
  identities. They explicitly do not claim page-level pixel parity or a direct
  product-frame match where no such Figma frame exists.
- Shared component references are `47:28`, `48:75`, `50:59`, `51:44`, and
  `52:42`. Foundation references are `43:2`, `44:9`, `45:2`, and semantic F0
  `61:80`.

## Complete learner-page ownership

| Page path | S232G disposition | Runtime coverage |
| --- | --- | --- |
| `/app` | canonical Today | 390/768/1440, 720 width-equivalent, keyboard, Axe |
| `/app/capture` | canonical Capture | same, plus durable save/live-region proxy |
| `/app/write` | canonical second-write | same |
| `/answer-review` | canonical Answer Review | same |
| `/app/notes` | canonical Notes | same, plus exact synthetic round-trip and account-B absence |
| `/app/items` | canonical item list | same |
| `/app/items/[itemId]` | canonical Study Ledger detail | same, plus rewrite/reload/A-B proof; artifact uses `:synthetic` only |
| `/app/review` | canonical Review | same, plus account-B absence |
| `/app/agenda` | canonical Agenda | same |
| `/app/weekly` | canonical Weekly | same |
| `/app/session` | canonical first-mode Session | same; second mode remains write-authoritative |
| `/app/calculator` | canonical Calculator | same; direct component claim only |
| `/app/first/ox` | canonical First OX | same |
| `/app/today` | alias | second mode redirects to Today |
| `/app/input` | alias | second mode redirects to Capture |
| `/app/entry` | alias | second mode redirects to Capture |
| `/app/study-log` | conditional legacy alias | second mode redirects to Agenda; first-mode durable study-log remains intact |
| `/app/acceptance/trust-provenance/[state]` | excluded | non-product acceptance fixture |
| `/app/mode-migration` | excluded | separately owned migration flow |
| `/app/onboarding` | excluded | pre-learner onboarding flow |
| `/app/sets` | excluded | separately owned first-round set flow |
| `/app/settings` | excluded | account settings, not the S232 learning loop |
| `/app/settings/notifications` | excluded | notification settings, not the S232 learning loop |

Legacy exam, admin, instructor, academy/commercial, and Problem Snap surfaces are
outside this authenticated learner-page registry and receive no S232G parity
claim.

## Exact-head automated acceptance

The dedicated workflow fails closed unless runner SHA, PR head SHA, target SHA,
deployment object SHA, and both observed `/api/runtime/version` SHAs are equal.
It then runs one serial Chromium test with retries disabled and screenshot,
trace, and video capture disabled.

The test proves:

- the 13 canonical routes at 390, 768, and 1440 CSS pixels;
- an additional 720 CSS-pixel desktop-width-equivalent reflow proxy;
- one visible route `h1`, no document horizontal overflow, no clipped heading or
  keyboard target, and no nested two-dimensional core-content scroller;
- Axe serious/critical count zero on every canonical route at all four widths;
- bounded Tab traversal to a real route control, logical non-repeating order
  before the target, no keyboard trap, `:focus-visible`, a computed visual focus
  delta, and focused-control viewport visibility; each route also proves that its
  learner skip link is the first Tab stop and Enter lands on the exact main target;
- the real `Capture → Review → Rewrite → Queue → Today` loop: a unique source is
  entered and saved through the Capture UI, both `saving` and receipt-bound
  `completed` live states are observed, Review receives the source, the rewrite
  is bound to that exact source, and the rewritten record is present in the
  bounded Review and Today inputs;
- an exact durable Study Ledger rewrite receipt, exact previous/rewrite cells,
  source/rewrite API binding, reload survival, Notes round-trip, and a fresh
  account-A context read;
- account-A owner-positive detail before and after account-B checks, distinct
  real identities, account-B exact `200 { ok: true, detail: null }` for both the
  source and rewrite, streamed `200` or non-streamed `404` enumeration-safe
  detail denial with an exact `robots=noindex` marker and no protected content,
  and absence from account-B's bounded Notes, Review, and Today views;
- the real authenticated CalculatorStep integration at 390/768/1440 and 720
  width-equivalent, including component tokens, geometry, passive-tabstop zero,
  and Current→Complete transitions without calling the server completion API;
- zero unexpected product console errors, page errors, request failures, and
  same-origin HTTP errors. Exact causally bound Preview-toolbar blocks are
  isolated as counters and are not application errors. After exactly one
  accepted sign-in response, one combined `net::ERR_ABORTED` budget is allowed
  per isolated context: either the exact `/login` or `/app` document navigation,
  or the same pre-acceptance root route-tree RSC prefetch identified by its
  fixed Next request shape. Every other abort is an unexpected request failure.
  No `networkidle` wait is used as a substitute for that causal request binding.

Review and Today collection APIs are intentionally bounded and ranked. Exact
item-detail owner/denial checks are definitive; the collection checks prove
that the new source/rewrite entered the bounded handoff inputs, not that S232G
changed or overrode the existing primary-task ranking.

Each workflow attempt preflights capacity and uses a unique fixed-format run
nonce in non-sensitive synthetic text. A successful attempt creates exactly one
Capture source and one bound rewrite (two `/api/os/items` POSTs and a usage delta
of exactly two). Dedupe/conflict, local fallback, or unknown receipt states fail
closed. No delete endpoint or broad cleanup claim is made.

## Metadata-only artifact

The seven-day artifact is produced only after validation and contains exactly:

- `s232g-matrix.ndjson`, whose every row has only `commitSha`, `deploymentSha`,
  `viewport`, `route`, `scenario`, `result`, and `remainingLimitation`;
- `s232g-summary.json`, one flat exact-key scalar object of counts, booleans, and
  exact SHAs.

Every non-SHA string is a fixed registry enum. The validator rejects missing,
duplicate, unknown, nested, non-pass, or SHA-mismatched rows and rejects email,
URL, and UUID-like leakage. The artifact and logs contain no credentials,
bypass secret, protected Preview URL, private account identity, item ID, learner
content, request or response body, storage value, DOM, screenshot, trace, or
video. Network stderr and dynamic runner output are discarded before fixed error
codes are emitted. Playwright uses a metadata-only reporter that never reads or
prints errors, locations, stdout, stderr, attachments, or dynamic test values.
Validated artifacts are rewritten from parsed exact-key values instead of
copying attacker-controlled source bytes.

## Mandatory manual exact-SHA gate

Automation does **not** certify actual browser zoom or a real screen reader.
The 720px run is labelled only `width-equivalent-reflow-proxy`; Axe and ARIA
checks are labelled only accessibility-tree/state-announcement proxies.

Before #621 can merge, a human must test the unchanged final PR head and provide
a content-free pass/fail matrix naming that exact 40-character SHA for:

- Chrome at actual 200% zoom;
- Edge at actual 200% zoom;
- NVDA keyboard reading and announced save/state changes;
- VoiceOver keyboard reading and announced save/state changes.

Any later commit invalidates that manual matrix. Until all four rows pass on the
current exact SHA, `actualBrowserZoomClaimed` and `realScreenReaderClaimed`
remain false, #621 remains open, and parent #574 must not close.

## Rollback

Revert this slice. It adds no migration or stored-data transform. The one
synthetic Capture source and one bound rewrite created by a successful
acceptance run remain two bounded test records in the dedicated invited account.
