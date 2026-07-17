# S232B.1 Figma V3 TrustEvidenceBar Parity

Status: source implementation complete; exact-head Preview runtime pending.

Parent: S232 App-wide Figma V3 parity (`#574`)

Delivery issue: S232B.1 TrustEvidenceBar parity (`#581`)

Delivery pull request: `#582`

## Source contract

Figma file: `jcOKSi2WwhDOAfV2xMv9gO`

Component set: `48:75`

Exact variants:

- Verified: collapsed `48:15`, expanded `48:25`
- NeedsReview: collapsed `48:35`, expanded `48:45`
- Conflict: collapsed `48:55`, expanded `48:65`

Production implements the exact three-state and two-disclosure contract without copying sample evidence claims from the design. The bar uses 16px padding, 12px gaps and radius, a 24px evidence icon, 72px collapsed minimum height, and 170px expanded minimum height. Heights remain minimums so long Korean copy and 200% zoom can reflow without clipping.

## Typed trust mapping

The existing S231B trust provenance model remains authoritative:

- `confirmed_record` -> `Verified`
- explicit `needs_review` -> `NeedsReview`
- `conflict` -> `Conflict`
- `offline` or `unavailable` -> neutral fallback with no `data-v3-state`

The adapter never converts `!learnerConfirmed` into NeedsReview or Verified. Production does not claim an official source count, OCR completion, official grading, a confirmed score, a pass probability, calculator-device verification, or a fabricated relative timestamp. The save line uses the persisted record's real `updatedAt` metadata.

## Placement and responsive contract

Study Ledger renders exactly one TrustEvidenceBar in the reading column immediately before BiggestGap:

- mobile: 350px content width inside 20px page edges
- desktop: 680px reading column, 32px gutter, 288px evidence rail
- vertical order: identity -> 20px -> TrustEvidenceBar -> 16px -> BiggestGap; the 16px token offsets the accessible 44px disclosure target while preserving the representative V3 rhythm
- evidence rail: no TrustEvidenceBar duplicate

The component fills its container and contains no clipping, ellipsis, line clamp, fixed height, or internal scroll region.

## Interaction and accessibility

- A native `button` controls the disclosure.
- The target is at least 44px by 44px.
- Enter and Space both toggle the same control.
- `aria-expanded` and `aria-controls` track the visible details.
- Collapsed details remain in the DOM but use `hidden`, so they are not exposed to assistive technology.
- State is named in visible Korean text; color is supplemental.
- Only an actionable Conflict change may emit a polite status update; the static bar never uses `role="alert"`.

## Acceptance and privacy

- source contract: `tests/s232b1-trust-evidence-bar-parity.test.mjs`
- Preview-only synthetic matrix: `/acceptance/figma-v3-trust-evidence`
- synthetic browser contract: `tests/e2e/s232b1-trust-evidence-bar.spec.ts`
- authenticated contract: `tests/e2e/s232b1-authenticated-runtime.spec.ts`
- exact-head workflow: `.github/workflows/s232b1-runtime.yml`

The synthetic matrix covers all six variants at 390px, 768px, 1440px, and a 720px 200%-zoom equivalent. Runtime requires serious/critical Axe violations 0, overflow at most 1px, 44px controls, 72px/170px minimum heights, correct keyboard disclosure, and console/page/unexpected same-origin errors 0.

Authenticated acceptance scans the invited test account for a persisted Study Ledger detail with explicit confirmation, review, or conflict evidence. If none exists, it fails closed rather than promoting neutral data. It checks the exact Preview SHA before and after execution.

The only permitted authenticated artifact is one allowlisted metadata JSON file. It must not contain learner text, OCR text, answer/reference text, item IDs, routes, dates, email, credentials, DOM dumps, local/session storage, screenshots, traces, or video.

## Rollback

Revert the S232B.1 PR. This slice changes no schema, API, auth rule, storage key, persisted payload, migration, or learner record.
