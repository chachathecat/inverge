# S230 Learning Record Timeline v3 QA

## Scope

- Route: `/app/agenda`
- Source: existing metadata-only agenda events
- No schema, service payload, analytics warehouse, OCR, provider, or shared shell changes
- Primary structure: one chronological recovery timeline, with this week and the nearest scheduled review first

## Honest-state contract

- `loading`: route loading boundary announces that the timeline is being prepared.
- `empty`: one capture action; no fabricated history.
- `offline`: already loaded metadata remains visible and navigation is disabled until reconnection.
- `error`: retry and return paths; no record is marked complete.
- `sparse`: this week may be empty while older history remains available.
- `dense`: eight recent weekly events remain visible; earlier weekly events move into a keyboard-operable disclosure.
- `completed week`: shown only when a completion event exists and no `review_due` event remains in the week.

## Metadata and link boundary

- Timeline events retain only identifiers, event type/title/date, and optional subject metadata.
- Study Ledger links render only with `noteId`.
- Review navigation renders only for a `review_due` event with `reviewItemId`.
- No OCR, answer, question, reference prose, upload content, mastery score, or pass prediction is rendered or logged.

## Runtime acceptance

Verify the Draft PR Preview with a dedicated invited account. Do not attach raw learner content to screenshots or logs.

- [ ] 390 × 844: no horizontal overflow; primary action and event links are at least 44px high.
- [ ] 768 × 1024: timeline remains primary and history disclosure is operable.
- [ ] 1440 × 1024: next review rail is subordinate to the timeline and stays readable at 200% zoom.
- [ ] Keyboard: all links, the dense-week disclosure, history disclosure, and retry action have visible focus.
- [ ] Screen reader: one page `main` from the learner shell; page heading, timeline heading, next-review `aside`, ordered lists, and status regions are announced.
- [ ] Automated accessibility scan: zero critical or serious findings.
- [ ] Console/page errors: zero.
- [ ] Typecheck, lint, focused test, full suite, learner-loop verification, and production build pass.

## Synthetic fixtures

Focused tests cover a sparse timeline with one historical item and one next review, plus a dense 14-event week. Fixture payloads contain only synthetic IDs, event types, dates, and subject labels.

## Pull request gate

- Risk classification: medium
- Merge recommendation: human approval required
- Exact-head CI and Preview runtime evidence are required before the Draft PR can be marked ready.

## Automated authenticated lane

The temporary PR marker `run-s230-auth-e2e` enables one #566-only job. The job hardcodes the branch Preview host, refuses any other host, reads credentials and the Vercel bypass only from repository secrets, disables trace/video, and uploads only masked 390/768/1440 screenshots plus a sanitized JSON manifest.
