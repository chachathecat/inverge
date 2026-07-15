# S232E.1 Capture four-stage semantic shell

## Evidence boundary

The connected Figma V3 file contains no Capture product screen, dropzone, editor, or responsive Capture frame. S232E.1 therefore makes **no pixel-parity claim**. It aligns the existing authenticated Capture experience with the observed V3 staged-flow language, typography roles, semantic color/radius tokens, and learner-confirmation boundary.

The source anchors are the Figma V3 Recovery loop, TrustEvidenceBar, StickyAction, and Utilities/States contracts. The implementation does not synthesize an EvidenceExcerpt, Verified state, Confirmed state, evidence count, or official authority.

## Canonical outer flow

The existing controller stages are presented through a four-step shell. First-mode compatibility keeps the original labels:

1. 입력
2. OCR/텍스트 확인
3. 가장 큰 약점
4. 오늘 계획 반영

Second mode labels step 3 as `회상·비교·수정` and step 4 as `저장·오늘 계획`, so the active outer phase never calls recall, drafting, comparison, rewriting, or save confirmation `가장 큰 약점`. Every displayed step answers three questions: the current work, why it is needed, and the next result. The current item uses `aria-current="step"`; the active explanation is labelled by a V3 section heading and a definition list. Each controller state has its own current-work copy. In particular, the second-write route shows the real six-step position (`쟁점 회상` through `문단 다시쓰기`). The page keeps one V3 screen-role `h1` across intake, second-write, rewrite, confirmation, and saved-plan states.

The existing quick-save path is intentionally preserved. It may move from intake to the saved-plan confirmation without requiring every intermediate screen. The interface therefore promises that imported text can be edited before save; it does not claim that every quick-saved field passed through the full confirmation sequence.

## Product and data boundary

This slice changes presentation markup only. It preserves:

- `/api/inverge/ocr` and `/api/os/items`
- image/PDF/text import and editable OCR text
- learner confirmation and low-confidence checks
- browser draft persistence and durable/local fallback save
- first-mode O/X bridge
- second-write learner-first production and reference-after-production order
- Today Plan, Review, Notes, analytics, auth, profile, entitlement, and service behavior

No schema, API, provider, persistence, learner-data, billing, or instructor behavior changes are included. Existing error and offline behavior is preserved for S232F rather than redesigned here.

## Runtime acceptance

The exact-head authenticated gate checks the same Capture document at 390px, 768px, and 1440px. It verifies:

- one page `h1`, one accessibility-tree-visible four-stage list, four labelled stages, and one current step; below 640px the full list remains screen-reader available while its visual presentation is compacted into the current-work context
- the initial stage's now/why/result semantics and presence of established V3 role classes/tokens (not computed typography parity)
- current learner navigation state, one dominant intake action, and closed optional disclosures
- the full dominant intake action remains inside the viewport before scrolling
- real keyboard focus with a computed `:focus-visible` style delta
- at most 1px horizontal overflow
- Axe serious/critical, console, page, and unexpected same-origin errors are zero
- no learner action is activated and no post-render same-origin mutation request is delivered
- exact Preview deployment SHA equals the exact PR head before and after the check

The runtime artifact is a single flat scalar JSON file. It contains no learner text, OCR text, question, subject, email, credential, URL, DOM, screenshot, trace, or video. The check does not claim total database immutability because existing authenticated render paths may perform server-side access/profile bookkeeping.

The runtime does not activate an input, OCR, quick-save, or durable-save action, so it does not claim that stages 2–4 transitioned during this presentation-only check. The source contract locks the exhaustive controller-state copy inventory, the exact second-write starting-position wiring, and the focus-transfer implementation wiring; it does not execute those transitions. Interaction, focus movement after a real transition, and persistence remain covered by existing tests and the later S232E integration gate.

## Rollback

One revert removes the S232E.1 header, four-stage semantic context, selectors, source contract, and runtime gate. No data rollback is required.
