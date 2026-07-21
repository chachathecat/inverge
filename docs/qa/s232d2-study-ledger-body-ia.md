# S232D.2 Study Ledger Body Information Architecture

## Evidence boundary

This slice is limited to the directly observed Figma V3 Study Ledger frames:

- mobile body `56:8` and continuation/action region `56:47`
- desktop reading column `59:68` at 680px
- desktop evidence rail `59:104` at 288px
- 32px desktop column gap inside the existing 1000px workspace

Figma V3 does not provide product screens for Today, Notes list, Review, Capture, or Answer Review. This slice makes no parity claim for those routes.

## Canonical ownership

The 680px reading column owns the record identity and learner task flow:

1. persisted subject/date, conservative StateChip, and an evidence-backed state subtitle
2. TrustEvidenceBar
3. BiggestGap
4. the `이번에 회복할 문장` task heading
5. learner-authored EvidenceExcerpt, or an independent learner-empty state
6. the single StickyAction immediately after learner evidence
7. persisted comparison/completion when present

The 288px evidence rail owns secondary context:

1. persisted next-review date and queue count
2. reference text as a visible, untyped disclosure
3. persisted recurrence, save, and queue context
4. one default-closed supplemental disclosure inside that same context surface; it preserves the detailed next action, application sentence, key terms, supporting evidence, and review/write/calculator links

The initial desktop rail therefore renders exactly the three V3 surfaces above. Existing secondary context remains available only after the learner opens the third surface disclosure.

Below 1024px the workspace remains one column. At 768px there is no tablet split.

## Authority boundary

`referenceExcerpt` has no verified source-type contract. It remains `참고용 근거 · 원 출처 확인` and is never rendered as an Official or Confirmed EvidenceExcerpt. When it is absent, the rail shows a neutral reference-empty state. Learner and reference empty states are independent.

No recovery-history rows are rendered because the detail contract has no persisted recovery-event list. The rail says `복습 맥락` and uses only the actual recurrence text, save date, queue count, and next action. No Figma sample date, relative time, official-evidence count, OCR status, or device result is fabricated.

## Safety boundary

- No schema, API, auth, RLS, storage, persistence, ranking, completion, analytics, or learner-loop change.
- Existing record props, links, comparison state, supporting evidence, and rewrite action are preserved.
- Runtime acceptance reads an invited-account detail but creates or mutates no fixture.
- Runtime evidence is a single flat scalar JSON object. It captures no learner text, email, credential, DOM, screenshot, trace, or video.

## Acceptance

- learner EvidenceExcerpt occurs once in the reading column and never in the rail
- TrustEvidenceBar → BiggestGap → recovery task heading → learner evidence → StickyAction document order
- next-review context occurs once in the rail and never in the reading column
- persisted recurrence context occurs once in the rail and never in the reading column
- the initial rail has exactly three surfaces; supporting evidence and linked-learning navigation are inside the default-closed third-surface disclosure
- untyped reference is neutral; Official/Confirmed promotion count is zero
- 390px and 768px use one column with horizontal overflow at most 1px
- 1440px resolves to 680px + 32px + 288px
- one main, detail, TrustEvidenceBar, BiggestGap, and StickyAction
- keyboard focus is visible on trust, action, and available reference controls
- Axe serious/critical, console, page, and unexpected same-origin errors are zero
- protected Preview deployment SHA equals the exact PR head before and after acceptance
