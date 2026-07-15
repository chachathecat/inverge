# S232D.3 Notes List Information Architecture

## Evidence boundary

Figma V3 contains Study Ledger detail frames, but no directly observed product frame for the Notes list. This slice therefore makes no pixel-parity claim for `/app/notes`. It applies the already accepted V3 language and passive-component grammar to the persisted Notes-list information architecture.

The slice is limited to:

- `/app/notes` recent-list presentation
- the learner-shell mobile label for that route
- connected Today and trust-continuation copy
- authenticated, exact-head acceptance at 390px, 768px, and 1440px

Review and Today structure, Capture, Answer Review, ranking, and queue behavior remain outside this slice.

## Canonical Notes hierarchy

Persisted service order is preserved. The first three records remain the primary list and older records remain in the existing disclosure. Each primary Note card presents:

1. persisted subject, date, and title metadata
2. one compact `BiggestGap`
3. one next action
4. one detail link
5. quiet secondary topic, review, and learning-record connections

The canonical learner term is `학습 노트` on mobile and desktop. `교정 노트` is removed only from the connected learner surfaces in this slice.

## Authority boundary

A wrong-answer record does not prove that a review-queue row exists. Primary Notes cards therefore do not render `복습 예정` and do not introduce a `StateChip`. The neutral phrase `복습에 남길 내용` remains secondary context and does not claim a scheduled review state.

The compatibility `/app/items` presentation is unchanged, including its historical copy. D.3 selectors and runtime assertions are scoped to the `/app/notes` branch.

## Safety boundary

- No schema, API, auth, RLS, storage, persistence, ranking, queue, completion, analytics, or learner-loop change.
- No fixture is created or mutated; acceptance reads the dedicated invited account.
- Runtime evidence is one flat scalar JSON object.
- Evidence contains no learner text, title, subject, email, credential, DOM, URL, screenshot, trace, or video.
- The protected Preview deployment SHA must equal the exact PR head before and after acceptance.

## Acceptance

- one `학습 노트` page heading and current navigation state
- one to three persisted primary Note cards; never more than three
- metadata → compact BiggestGap → next action → detail link → secondary connections in every primary card
- zero `복습 예정` and zero StateChip within primary Note cards
- legacy `/app/items` is not included in the D.3 runtime or parity claim
- horizontal overflow is at most 1px at 390px, 768px, and 1440px
- the first Note detail link is reachable with real Tab navigation and has a visible focus indicator
- Axe serious/critical, console, page, and unexpected same-origin errors are zero
- exact-head runtime version matches before the viewport pass and again after it
