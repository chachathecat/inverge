# APP-1 validation

## Frozen scope

- Base SHA: `761b7f6b7648d19845ab3385665e92046165dddd`
- Base tree: `c6c6a8ad876c2f40b5276a26485b088656addf49`
- Tracking issue: `#874`
- APP-1 core changed paths: 13
- Aggregate PR changed paths: 14 (`13` APP-1 core paths plus the separately governed `tests/s232f2-access-availability.test.mjs` access-inventory correction)
- New API, migration, database, RLS, auth, package, lockfile, workflow and public-navigation paths: 0

## Focused contract evidence

Run:

```text
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/app1-owner-capture-repair-vertical-v1.test.mjs tests/answer-submission-ocr-save-contract.test.mjs tests/s225x-founder-grade-visual-taste-reset.test.mjs tests/ux-surface-reset-v1-answer-road.test.mjs
```

The APP-1 suite uses only author-created synthetic records. The final candidate run passed `32/32`, including `APP1-PERMISSION-001` and `APP1-UI-003`. The permission regression binds `canConfirmInput` to valid Capture input while keeping APP-1 quick save disabled, preserves unauthorized/non-APP-1 behavior, and keeps the 13-path core contract separate from the shared access-inventory correction. The route regression proves that the repair transition remains behind the exact durable-receipt gate and is not raced by an immediate refresh. Focused deterministic tests also exercise all five honest verification states through the public APP-1 evaluator: confirmed, one connection still missing, guided path needed, deferred, and blocked by OCR/source uncertainty. The guided and blocked cases prove that no mastery, transfer, durable or Queue receipt is fabricated. The same suite covers the Owner/default-off gate, exact OCR warning and CTAs, editable confirmation, bounded summary, one-gap invariant, learner-entered repair, durable-receipt enforcement, dedupe conflict, queue-receipt enforcement, reload truth and forbidden-path/source boundaries.

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

The browser spec remains skipped unless `APP1_AUTH_RUNTIME=1` and the bounded local authenticated runtime inputs are present. Merely adding or typechecking the specification is not browser evidence. The final authenticated local execution passed through repository-local Playwright `1.62.1` and Playwright-managed Chromium revision `1234`, against Next.js `16.2.12` production Webpack and an ephemeral loopback-only local Supabase Owner fixture. The targeted `390x844` text/failure-injection flow passed, followed by one complete checked-in run covering `390x844` text, `768x900` photo and `1440x1024` PDF. The save-to-repair blocker was an immediate `router.refresh()` racing the APP-1 repair-route `router.push()` after an already-valid durable receipt; the APP-1 branch now pushes and returns without weakening receipt validation. The spec binds the initial click to its `/api/os/items` response, waits for the component's semantic post-failure focus state before keyboard retry, and selects the exact non-camera gallery input instead of a positional image input.

The `390` repair responses were exactly `synthetic_repair_save_503 → synthetic_dedupe_conflict → synthetic_durable_success`; `768` and `1440` each received exactly `synthetic_durable_success`. Every initial Capture save received `synthetic_source_save_success`, unknown item saves were zero, the mutation endpoint set remained exactly `/api/inverge/ocr`, `/api/answer-review/structure` and `/api/os/items`, horizontal overflow was zero, keyboard and visible-focus assertions passed, 200% reflow passed, and axe serious/critical violations were zero. Browser non-loopback application requests were fail-closed, the Next application guard recorded zero unauthorized attempts, and successful remote Supabase, Production, provider and payment contacts were zero. The sanitized metadata-only runtime receipt digest is `sha256:028b9d4467c7e2c994f3148945b5e1352da6e4bac0bb8d5a2dcd8e245783fdbe`. The ephemeral Owner and all nonce-scoped Next, Chromium, container, volume, bridge, listener and temporary-helper resources were removed. Fixture bodies remain synthetic and no raw body is retained in evidence.

## Corrective evidence inventory

- Safe learner-error boundary: focused deterministic source contract, executed and passed; arbitrary `/api/answer-review/structure` payload errors are ignored and the two exact Korean fallbacks are bound.
- `guided_path_needed`: public evaluator focused regression, executed and passed; no confirmed repair, D+7, mastery, transfer, persistence or Queue receipt is created.
- `blocked_by_ocr_or_source_uncertainty`: public evaluator plus route-boundary focused regression, executed and passed; source confirmation is the only continuation and successful repair save is excluded.
- Input-confirm versus quick-save permission: `APP1-PERMISSION-001` executed and passed `1/1`; valid APP-1 input may proceed to editable confirmation while quick save remains disabled.
- Shared access inventory: S232F.2 executed and passed `6/6`; the APP-1 repair page remains separately accounted outside the 13-path core contract.
- Authenticated HTTP repair-save failure, conflict and success: targeted `390` and complete `390/768/1440` executions passed with the exact semantic response sequences and no false completion.
- Directly adjacent Capture, persistence, Queue and trusted-repair behavior: `62/62` passed on the completed local candidate.

## Final candidate checks

- APP-1 focused and required-adjacent tests: `32/32` passed;
- directly adjacent Capture, persistence, Queue and trusted-repair tests: `62/62` passed;
- S232F.2 route-inventory tests: `6/6` passed, including `app/app/capture/repair/page.tsx`;
- changed-file lint: passed;
- typecheck: passed;
- production Webpack build: passed for the final application-source bytes;
- exact 13-path APP-1 core manifest plus one separately governed shared access-inventory path (`14` aggregate): passed;
- `git diff --check`: passed;
- repository-required exact-head CI and fresh formal review.

The linked-worktree local build used explicit Webpack; clean-checkout CI remains authoritative for the repository's default Turbopack path. The authenticated runtime used only an isolated disposable local Supabase fixture. Remote Supabase, Production, provider and payment mutation remained zero.
