# S232E.2 second-write clarity acceptance

## Scope

S232E.2 makes the existing `/app/write?mode=second` controller truthful and scannable without changing its learner-data behavior:

1. `1/6` issue recall
2. `2/6` three-line outline
3. `3/6` learner answer before comparison
4. `4/6` reference comparison after production
5. `5/6` one biggest gap
6. `6/6` one-paragraph rewrite

The controller order, validation thresholds, route, test IDs, API calls, authentication, draft persistence, save behavior, analytics, and Problem Snap links remain in place. Each active step exposes one dominant next action; optional explanation or defer paths remain secondary.

## Design truth boundary

The available Figma V3 source does not contain direct Capture or Answer Review product frames. This slice therefore makes **no pixel-parity claim**. It aligns the live flow to established V3 semantic color, radius, typography-role, progress, and current-work language only. It does not invent official grading, confirmed evidence, or authority claims.

## Automated source gate

`tests/s232e2-second-write-clarity.test.mjs` locks:

- the six controller stages and their exact order;
- one `x/6` label, semantic heading, V3 token surface, and dominant-action contract per stage;
- the existing transition and validation boundaries;
- persistence, API, auth-sensitive, and test-ID contracts;
- privacy-safe exact-head runtime wiring.

Run locally:

```bash
npm test -- --test-concurrency=1 tests/s232e2-second-write-clarity.test.mjs tests/s232e1-capture-outer-flow.test.mjs tests/learning-science-minimal-ux-reset.test.mjs tests/answer-review-boundary.test.mjs
npm run typecheck
npx eslint app/app/write/page.tsx components/review-os/capture-form.tsx tests/e2e/s232e2-second-write-clarity.spec.ts
```

## Authenticated exact-head runtime gate

The PR body must contain:

```html
<!-- run-s232e2-auth-e2e -->
```

`.github/workflows/s232e2-runtime.yml` then discovers a successful Preview deployment for the exact PR head SHA, verifies `/api/runtime/version`, runs `tests/e2e/s232e2-second-write-clarity.spec.ts`, and rechecks the deployment SHA afterward.

The same authenticated document is resized to **390px**, **768px**, and **1440px**. The gate verifies:

- one page heading and one second-write form;
- six accessible progress items with exactly one current `1/6` stage;
- the truthful `second-issue-recall` controller state and one active panel;
- one dominant current-step action;
- optional disclosures closed by default;
- keyboard access and computed focus feedback for the learner input and local explanation disclosure;
- no horizontal overflow;
- zero serious or critical Axe findings;
- zero console errors, page errors, or same-origin request failures;
- no learner-action mutation requests, browser-storage changes, or analytics deltas during this read-only entry check.

The runtime gate aborts same-origin non-read requests after the authenticated page loads and never activates the dominant action. It does not claim total database immutability: unrelated server-side or external activity is outside this browser-local proof.

## Privacy boundary

The uploaded artifact contains scalar metadata only. It does not include credentials, raw learner content, answer text, reference text, subject text, email, URL, DOM, screenshot, trace, or video. Storage values are compared only through an in-browser digest and are not written to evidence.

Later-stage source contracts cover all six panels. The authenticated runtime deliberately checks the initial stage only so it does not enter, persist, or expose learner content.
