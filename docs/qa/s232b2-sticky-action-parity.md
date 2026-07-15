# S232B.2 Figma V3 StickyAction Parity

Status: source implementation complete; exact-head Preview runtime pending.

Parent: S232 App-wide Figma V3 parity (`#574`)

Delivery issue: S232B.2 StickyAction parity (`#583`)

Depends on: S232B.1 (`#582`)

## Source contract

Figma file: `jcOKSi2WwhDOAfV2xMv9gO`

- component set: `51:44`
- variants: `Mode = Dock | Inline` × `State = Ready | Saving | Offline | Disabled`
- default label: `10분 문단 다시쓰기`
- default status: `2분 전 저장됨`
- status visibility default: true
- product instances: mobile `56:47`, `57:77`; desktop `59:100`

The eight masters keep the same label and status; state changes semantic color only. Ready uses brand/inverse, Saving uses brand-soft/brand, Offline uses attention, and Disabled uses subtle/tertiary. Disabled remains at full opacity.

## Geometry and responsive placement

Dock is a 390×116 reference frame with 20px horizontal edges, 16px top padding, safe-area-aware bottom padding, an 8px gap, a top hairline, and an upward shadow. Its status is 12/18 medium and its control is at least 350×52 at the 390px reference width.

Inline is left-aligned, 300×84, transparent, and has no border or shadow. Its status is 300×18 and the control begins 26px from the top. The control radius is 12px; label typography is Noto Sans KR Bold 15/22.

Production renders exactly one responsive component:

- below 1024px: viewport-bottom Dock, full width, 20px minimum horizontal edges with left/right safe-area coverage, and safe-area-aware bottom padding
- at or above 1024px: static 300px Inline at the end of the 680px reading column

The mobile article reserves the Dock height plus safe-area space so the final content and keyboard focus are not obscured. The desktop component is not sticky and is not in the 288px evidence rail.

Figma desktop instance `59:100` follows a learner EvidenceExcerpt inside the Figma reading column. Production evidence remains in the existing evidence rail in this scoped slice; relocating all evidence is an S232D shell/information-architecture decision. StickyAction still adopts the correct reading-column ownership and Inline geometry without broadening this PR.

## Typed state boundary

Production explicitly passes `Ready` for both incomplete and completed rewrites. Completion changes only the existing label/status copy; it never implies Disabled, Verified, Stable, official grading, or device verification.

Saving, Offline, and Disabled cannot be inferred from completion or missing evidence. Their TypeScript branches require explicit controller evidence and do not accept a navigation href:

- Saving: `save-in-progress`
- Offline: `network-offline`
- Disabled: `action-disabled` with a non-empty reason

The navigation-ready branch preserves exactly:

```ts
/app/capture?mode=second&rewriteFrom=${encodeURIComponent(
  rewriteFromItemId ?? itemId
)}
```

This keeps the original rewrite source preference and existing session/ownership checks in Capture unchanged.

## Accessibility and privacy

- Ready is a semantic link; non-navigation states use a native disabled button.
- Saving exposes `aria-busy`; status changes use one polite atomic live region, never an alert.
- State has a screen-reader label in addition to color.
- The control is at least 52px high with a visible two-pixel focus ring.
- Long Korean text may grow; there is no clipping, ellipsis, line clamp, or internal scroll region.
- Preview fixtures contain only approved synthetic Figma copy and are unavailable in Production.
- Runtime evidence must be metadata-only: no learner text, IDs, routes, dates, email, credentials, screenshots, traces, or video.

## Acceptance

- source contract: `tests/s232b2-sticky-action-parity.test.mjs`
- Preview-only synthetic matrix: `/acceptance/figma-v3-sticky-action`
- browser contract: `tests/e2e/s232b2-sticky-action.spec.ts`
- authenticated contract: `tests/e2e/s232b2-authenticated-runtime.spec.ts`
- exact-head workflow: `.github/workflows/s232b2-runtime.yml`
- stable Preview alias: `inverge-git-agent-s232b2-sticky-a-8decab-chachathecats-projects.vercel.app`
- exact Cartesian matrix: both modes and all four states
- target viewports: 390px, 768px, 1440px, plus a 720px desktop-200%-reflow equivalent
- authenticated Study Ledger: one action, mobile Dock, desktop Inline, Tab focus, Enter navigation, preserved `mode=second` and `rewriteFrom`, visible rewrite context
- Axe serious/critical 0; horizontal overflow at most 1px; console, page, and unexpected same-origin request errors 0
- exact Preview SHA before and after; one allowlisted metadata JSON artifact only
- S228, S227, S231C, S232A, S232B, and S232B.1 regressions remain green

## Rollback

Revert the S232B.2 PR. No persistence, schema, API, auth, RLS, billing, OCR, calculator, storage key, migration, or learner-data cleanup is involved.
