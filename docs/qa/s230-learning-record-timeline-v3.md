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

The PR-scoped lane refuses every host except the exact PR #566 Preview and records the runner head separately from actual READY branch-alias deployment SHA `a6fddcf25a931037f92138dc54ddf2376ba215d9`. Contract head `1231389c0b45344dbc84eccb6c434c1db99438e2` is product-equivalent to that deployed target but is never labelled as the deployment. Both revisions predate the responsive next-review reorder on the current branch, so the earlier passing runtime is not final-product evidence. The lane waits for client hydration before submission and bounds sign-in response waits to 20 seconds. It repeats the submit click only once when no sign-in request was emitted, never retries 400/401/403 credential failures, disables trace/video, and publishes only masked screenshots plus a sanitized count-only manifest.

- [ ] 390 × 844: no horizontal overflow; primary action and event links are at least 44px high.
- [ ] 768 × 1024: timeline remains primary and history disclosure is operable.
- [ ] 1440 × 1024: next review rail is subordinate to the timeline and stays readable at 200% zoom.
- [ ] Keyboard: all links, the dense-week disclosure, history disclosure, and retry action have visible focus.
- [ ] Screen reader: one page `main` from the learner shell; page heading, timeline heading, next-review `aside`, ordered lists, and status regions are announced.
- [ ] Automated accessibility scan: zero critical or serious findings.
- [ ] Console/page errors: zero.
- [ ] Typecheck, lint, focused test, full suite, learner-loop verification, and production build pass.

At 390px and 768px, the next-review card and its single dominant action precede the long timeline in both visual and keyboard order. At 1440px, the same DOM order is placed into the subordinate sticky right rail. Screenshot capture masks the entire signed-in identity element, rejects any second visible email-like text node, and runs an OCR email guard before artifact upload.

## Synthetic fixtures

Focused tests cover a sparse timeline with one historical item and one next review, plus a dense 14-event week. Fixture payloads contain only synthetic IDs, event types, dates, and subject labels.

## Pull request gate

- Risk classification: medium
- Merge recommendation: human approval required
- Exact-head CI and Preview runtime evidence are required before the Draft PR can be marked ready.

## Automated authenticated lane

The temporary PR marker `run-s230-auth-e2e` enables one #566-only job. The job hardcodes the branch Preview host, refuses any other host, reads credentials and the Vercel bypass only from repository secrets, disables trace/video, and uploads only masked 390/768/1440 screenshots plus a sanitized JSON manifest.
