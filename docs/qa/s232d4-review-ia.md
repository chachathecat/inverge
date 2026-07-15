# S232D.4 Review Queue Information Architecture

## Evidence boundary

Figma V3 contains Study Ledger detail and CalculatorStep frames, but no directly observed product frame for the Review Queue. This slice therefore makes **no pixel-parity claim** for `/app/review`. It applies the accepted V3 hierarchy, type, spacing, and focus grammar to the existing Review interaction without inventing unsupported semantics.

The slice is limited to:

- the authenticated `/app/review` heading and primary queue surface
- the first persisted Review item hierarchy
- learner-facing Review reason, next-action, evidence-disclosure, and self-rating copy
- exact-head authenticated acceptance at 390px, 768px, and 1440px

Today structure, Notes detail, Capture, Answer Review, queue ranking, scheduling, completion persistence, and secondary local candidates remain outside this slice.

## Canonical Review hierarchy

The first item returned by the existing queue remains the single primary Review surface. Its order is:

1. persisted status, source, subject, and title metadata
2. `복습 이유`
3. `다음 행동`
4. `먼저 떠올리기`
5. `확인하기`
6. `자기평가`

Additional persisted queue items remain in the existing quiet `다음 복습 보기` disclosure. The service order is unchanged and no new sort or ranking is introduced.

`복습 근거 보기` replaces developer-oriented “detailed signal” terminology. The self-rating explanation describes current product behavior and does not mention a PR or future implementation step.

## Authority boundary

Review queue data does not establish a canonical biggest gap, mastery state, or official evidence status. The scoped Review IA therefore renders none of `BiggestGap`, `StateChip`, or `EvidenceExcerpt`, and never labels content `Official` or `Confirmed`.

The existing completion endpoint, action selection, metadata body, disabled state, and `router.refresh()` behavior are preserved exactly. This slice changes presentation and language only.

## Non-completing runtime acceptance

The authenticated test uses an existing persisted Review item but changes only local React state:

- type a fixed synthetic value into the recall textarea
- activate `확인하기`
- select one self-rating
- verify that the completion action becomes enabled

The authenticated acceptance **never clicks 복습 완료**. A request monitor proves that POST requests to `/api/os/review-queue/{queueId}/complete` remain zero for the entire run. No queue item is completed and no Review learning state is changed. The existing `review_queue_view` usage telemetry may still be emitted when the page loads.

## Acceptance

- one semantic `h1` named `복습`
- Review is the current learner navigation item
- one primary Review surface
- DOM order is metadata → Review reason → next action → recall
- the recall textarea and confirm action are reached from the skip link with real Tab navigation
- focused controls match `:focus-visible` and expose a computed outline, shadow, border-color, or background-color delta
- local confirm and one self-rating work without a completion POST
- no `BiggestGap`, `StateChip`, `EvidenceExcerpt`, `Official`, or `Confirmed` in the scoped Review queue
- horizontal overflow is at most 1px at 390px, 768px, and 1440px
- Axe serious/critical, console, page, and unexpected same-origin errors are zero
- the protected Preview deployment SHA matches the exact PR head before and after acceptance

## Evidence privacy

The workflow validates and uploads exactly one flat scalar JSON file. It contains only SHA equality, bounded counts, booleans, and error totals. It contains no learner content, question text, title, URL, email, credential, DOM, screenshot, trace, or video. Playwright screenshot, trace, and video capture are disabled.
