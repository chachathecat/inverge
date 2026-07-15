# S232B Figma V3 Passive Component Parity

Status: source implementation complete; local synthetic runtime PASS; exact-head runtime pending.

Parent: S232 App-wide Figma V3 parity (`#574`)

Delivery issue: S232B passive component parity (`#577`)

## Source contract

Figma file: `jcOKSi2WwhDOAfV2xMv9gO`

This slice implements the passive, data-independent component sets:

- StateChip: `47:28`
- BiggestGap: `50:59`
- EvidenceExcerpt: `52:42`

Reference product instances:

- Study Ledger mobile, 390px: `56:2`
- Study Ledger desktop, 1440px: `59:62`

TrustEvidenceBar `48:75`, StickyAction `51:44`, and CalculatorStep `53:129` remain separate interactive/controller slices. S232B does not change trust inference, navigation, persistence, or calculator workflow state.

## Truthful production mapping

The existing `scheduled | attention | ready | completed` value is workflow state, not evidence-backed learning stability. The production adapter therefore maps only:

- `attention` to `Unverified`
- `ready`, `scheduled`, and `completed` to `Recovering`

It never infers `Weak` from an unconfirmed record or `Stable` from one completed rewrite. `Weak` requires an explicit incorrect retrieval outcome. `Stable` requires successful retrieval evidence on at least two distinct days; that evidence is not currently present in the Study Ledger view model.

BiggestGap remains exactly one signature annotation. The existing next action stays immediately after it in a separate labelled semantic section, rather than being folded into or lost from the strict Figma component.

EvidenceExcerpt supports the exact `Learner | Official | AI` and `Default | Confirmed` matrix. Production adopts the Learner/Default variant for learner-authored text. The current reference excerpt has no typed official/AI source or confirmation flag, so it deliberately remains a neutral disclosure labelled `참고용 근거 · 원 출처 확인`; it is not auto-promoted to Official, AI, or Confirmed.

## Responsive contract

Figma library reference widths and heights are not copied as fixed production dimensions. Components fill their container and grow with Korean text:

- mobile content width: 350px inside 20px page edges
- desktop reading column: 680px
- desktop evidence rail: 288px
- StateChip: content-sized with a 38px reference height
- BiggestGap: 16px default padding, 4px semantic mark, auto height
- EvidenceExcerpt: 24px padding, 14px radius, 3px source mark, auto height

No exact component uses clipping, ellipsis, line clamp, or an internal scroll region. This preserves 200% zoom and long Korean reflow.

## Accessibility and privacy

- State is always named in visible text; color is supplemental.
- BiggestGap is a labelled `section` with an `h2`.
- EvidenceExcerpt is a `figure` with `figcaption`, `blockquote`, explicit provenance, and the Noto Serif KR evidence role.
- The passive primitives have no live region or fake interaction.
- Runtime evidence must remain metadata-only. Never capture learner answers, OCR text, question text, email, credentials, DOM dumps, screenshots, traces, or video from authenticated routes.

## Acceptance

- source contract: `tests/s232b-passive-component-parity.test.mjs`
- Preview-only synthetic matrix: `/acceptance/figma-v3-passive`
- browser contract: `tests/e2e/s232b-passive-components.spec.ts`
- local Chromium synthetic matrix: 3/3 PASS at 390px, 768px, and 1440px
- local observations: all variants present, axe critical/serious 0, clipped components 0, horizontal overflow 0, console/page/request errors 0
- existing S228 Study Ledger contract remains green
- S231B trust and S231C light/accessibility contracts remain green
- S232A foundation contract remains green
- 390px, 768px, and 1440px: overflow at most 1px; console, page, and unexpected same-origin request errors 0
- exact Preview SHA must match the PR head before authenticated integration evidence is accepted

## Rollback

Revert the S232B PR. No schema, API, auth, storage key, persisted payload, migration, or data cleanup is involved.
