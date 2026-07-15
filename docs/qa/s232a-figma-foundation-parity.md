# S232A Figma V3 Foundation Parity

Status: source implementation complete; local public runtime PASS; authenticated exact-head visual runtime pending.

Parent program: S232 App-wide Figma V3 parity (`#574`)

Delivery slice: S232A Figma V3 app-wide foundations parity (`#575`)

## Source of truth

Figma file: `jcOKSi2WwhDOAfV2xMv9gO`

This slice implements only the shared foundation contract:

- Color & Theme: `43:2`
- Typography: `44:9`
- Layout & Spacing: `45:2`

The following component contracts are inventoried but intentionally deferred to the next S232 slice:

- StateChip: `47:28`
- TrustEvidenceBar: `48:75`
- BiggestGap: `50:59`
- StickyAction: `51:44`
- EvidenceExcerpt: `52:42`
- CalculatorStep: `53:129`

This separation keeps one reviewable contract per pull request. S232A must not claim component-level visual parity.

## Implemented contract

### Color

`app/globals.css` now exposes a semantic bridge for canvas, surfaces, text, borders, icons, brand, focus, attention, risk, stable, and compare states. Existing learner surfaces continue to consume compatible aliases while the exact V3 values remain centrally auditable.

The production runtime remains light-only. The dark palette visible in Figma is not enabled because S231C intentionally established a single light runtime until every authenticated route has independent contrast and state evidence.

### Typography

The app self-hosts the Figma families through pinned Fontsource packages:

- Noto Sans KR Variable for UI and headings
- Noto Serif KR Variable for learner prose and evidence excerpts
- IBM Plex Mono 500 for calculator notation and numeric progress

Exact V3 type roles are represented by `.v3-type-*`, `.v3-prose*`, and `.v3-mono-*` utilities. The first production applications are the study-ledger title, biggest-gap hierarchy, evidence prose, and calculator routine. Existing legacy type helpers remain as compatibility shims for later slices.

### Layout

The shared contract includes the 4px-based spacing scale, 20px mobile and 32px tablet/desktop page edges, 1120px content width, 680px reading column, 288px evidence rail, 44px minimum target, 52px standard control, and the V3 radius scale.

## Runtime acceptance

Authenticated runtime is intentionally recorded as runtime pending until the exact pull-request SHA has a Vercel Preview. Validate both 390px and 1440px viewports on:

- `/app?mode=second`
- a persisted study-ledger detail route
- `/app/capture?mode=second` with the calculator routine expanded

Acceptance requires:

1. The deployed `/api/runtime/version` SHA equals the pull-request head SHA.
2. Noto Sans KR, Noto Serif KR, and IBM Plex Mono load without browser console errors.
3. Keyboard Tab order and visible focus remain intact.
4. No horizontal overflow at 390px or 1440px.
5. Evidence prose is visibly distinct without reducing Korean readability.
6. Calculator-entry steps use the mono role; ordinary explanation fields retain the UI role.
7. Browser console blocking errors: 0.

## Privacy and evidence boundary

Runtime evidence must stay metadata-only. Do not place a learner answer, OCR text, question text, email, or credential into the repository, CI log, issue, artifact, screenshot, trace, or video. Any screenshot needed for human visual review stays outside CI and must use synthetic, non-identifying content.

Automated CI evidence should contain only route names, viewport sizes, loaded font-family names, layout metrics, accessibility counts, console-error counts, and the exact deployment SHA.

## Current evidence

- Source contract test: `tests/s232a-figma-foundation-parity.test.mjs`
- Public runtime foundation test: `tests/e2e/s232a-figma-foundation-runtime.spec.ts`
- Exact-head authenticated runtime test: `tests/e2e/s232a-authenticated-runtime.spec.ts`
- PR-scoped runtime workflow: `.github/workflows/s232a-runtime.yml`
- Local Chromium runtime: 2/2 PASS at 390px and 1440px; all three font roles loaded, horizontal overflow 0, browser console errors 0
- Existing S231C light/accessibility regression test retained
- Existing S228 study-ledger behavior regression retained
- Existing calculator-routine behavior regression retained
- Screenshot evidence: not committed; authenticated exact-head visual inspection remains runtime pending
