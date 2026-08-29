# APP-1 validation

## Frozen scope

- Base SHA: `761b7f6b7648d19845ab3385665e92046165dddd`
- Base tree: `c6c6a8ad876c2f40b5276a26485b088656addf49`
- Tracking issue: `#874`
- Maximum changed paths: 13
- New API, migration, database, RLS, auth, package, lockfile, workflow and public-navigation paths: 0

## Focused contract evidence

Run:

```text
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/app1-owner-capture-repair-vertical-v1.test.mjs tests/answer-submission-ocr-save-contract.test.mjs tests/s225x-founder-grade-visual-taste-reset.test.mjs tests/ux-surface-reset-v1-answer-road.test.mjs
```

The APP-1 suite uses only author-created synthetic records. It covers the Owner/default-off gate, exact OCR warning and CTAs, editable confirmation, bounded summary, one-gap invariant, learner-entered repair, all five honest verification states, durable-receipt enforcement, dedupe conflict, queue-receipt enforcement, reload truth and forbidden-path/source boundaries.

## Representative browser evidence

`tests/e2e/app1-owner-capture-repair-vertical-v1.spec.ts` is an executable authenticated, synthetic-fixture specification. It mocks only the existing OCR, learner-private item, structure and queue seams. When the required local Owner runtime executes it successfully, it checks:

- text, photo and PDF Capture inputs through editable OCR confirmation, durable save and the gated repair redirect;
- exactly one gap and no prefilled repair answer;
- direct learner repair and same-session-only language;
- durable item and queue receipts before scheduling copy;
- truthful OCR/analysis failure, dedupe-conflict and unsaved-repair reload behavior;
- 390, 768 and 1440 pixel widths without horizontal overflow;
- 200% text scaling;
- keyboard reachability and visible focus;
- zero serious or critical axe violations;
- no external write or unregistered endpoint.

The browser spec is skipped unless the existing authenticated runtime harness enables `APP1_AUTH_RUNTIME=1`. Merely adding or typechecking the specification is not browser evidence, and this document records no runtime pass until an actual execution receipt exists. Its fixture bodies are synthetic and no raw body is retained in evidence.

## Final candidate checks

- APP-1 focused tests;
- the three narrowed adjacent UI-contract tests;
- directly adjacent Capture, Answer Review, persistence, Queue and trusted-repair tests;
- changed-file lint;
- typecheck;
- production build only when required by repository CI;
- exact 13-path manifest;
- `git diff --check`;
- repository-required exact-head CI and fresh formal review.

Do not run PostgreSQL replay, migrations, remote Supabase or Production for this source-only composition change.
