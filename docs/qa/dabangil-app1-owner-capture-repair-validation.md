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

The APP-1 suite uses only author-created synthetic records. The completed candidate run passed `30/30`. Focused deterministic tests exercise all five honest verification states through the public APP-1 evaluator: confirmed, one connection still missing, guided path needed, deferred, and blocked by OCR/source uncertainty. The guided and blocked cases prove that no mastery, transfer, durable or Queue receipt is fabricated. The same suite covers the Owner/default-off gate, exact OCR warning and CTAs, editable confirmation, bounded summary, one-gap invariant, learner-entered repair, durable-receipt enforcement, dedupe conflict, queue-receipt enforcement, reload truth and forbidden-path/source boundaries.

## Representative browser evidence

`tests/e2e/app1-owner-capture-repair-vertical-v1.spec.ts` is an executable authenticated, synthetic-fixture specification. It mocks only the existing OCR, learner-private item, structure and queue seams. Its authenticated browser coverage is explicitly limited to these encoded assertions:

- text, photo and PDF Capture inputs through editable OCR confirmation, durable save and the gated repair redirect;
- exactly one gap and no prefilled repair answer;
- direct learner repair and same-session-only language;
- durable item and queue receipts before scheduling copy;
- truthful OCR, initial-analysis and direct-repair-verification failure plus unsaved-repair reload behavior;
- at 390px, the exact repair-save sequence `HTTP 503 → dedupe conflict → durable success`, with no learner-visible internal error, persistence receipt, Queue receipt, schedule claim or completed state before the final success;
- 390, 768 and 1440 pixel widths without horizontal overflow;
- 200% text scaling;
- keyboard reachability and visible focus;
- zero serious or critical axe violations;
- no external write or unregistered endpoint.

The browser spec is skipped unless the existing authenticated runtime harness enables `APP1_AUTH_RUNTIME=1` and supplies a local base URL plus dedicated Owner credentials. Merely adding or typechecking the specification is not browser evidence. In this local candidate environment those inputs were absent, so the authenticated 390/768/1440 execution remains planned but not executed locally; no runtime pass is claimed. Repository exact-head CI remains a separate required gate. Fixture bodies are synthetic and no raw body is retained in evidence.

## Corrective evidence inventory

- Safe learner-error boundary: focused deterministic source contract, executed and passed; arbitrary `/api/answer-review/structure` payload errors are ignored and the two exact Korean fallbacks are bound.
- `guided_path_needed`: public evaluator focused regression, executed and passed; no confirmed repair, D+7, mastery, transfer, persistence or Queue receipt is created.
- `blocked_by_ocr_or_source_uncertainty`: public evaluator plus route-boundary focused regression, executed and passed; source confirmation is the only continuation and successful repair save is excluded.
- Authenticated HTTP repair-save failure, conflict and success: executable Playwright coverage present; actual local browser execution pending the explicitly gated local authenticated runtime.
- Directly adjacent Capture, persistence, Queue and trusted-repair behavior: `62/62` passed on the completed local candidate.

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
