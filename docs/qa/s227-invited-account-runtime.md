# S227 Invited-Account Runtime Visual-Density QA

Status: automation prepared on the exact post-#560 main baseline; authenticated evidence is pending. This document does not claim #558 complete.

## Scope

- Issue: #558
- Baseline: `e054485201f6671dfc28bca4fc940cb30cd65f18`
- Branch: `agent/s227-invited-runtime-qa`
- Runtime suite: `tests/e2e/s227-invited-runtime-acceptance.spec.ts`
- Manual Actions suite: `s227-invited-runtime`

This QA track changes tests, workflow wiring, and evidence documentation only. It does not change learner UI, calculator behavior, database schemas, migrations, APIs, payments, instructor routes, or shared shell design.

## Safety boundary

- A dedicated invited/test account is required.
- Only synthetic Korean sample data is created.
- The suite refuses known production hosts.
- A protected Vercel Preview requires `VERCEL_AUTOMATION_BYPASS_SECRET`.
- The exact target deployment commit must be supplied as a 40-character `E2E_TARGET_SHA`.
- Credentials and the runtime URL are redacted from captured diagnostics.
- Playwright trace, video, and implicit failure screenshots are disabled.
- Uploaded artifacts are limited to explicit sanitized `s227-*.png` files and a count-only JSON manifest.
- No raw private learner answer or copyrighted question text may be used.

## Current automated matrix

| Surface / transition | 390 | 768 | 1440 | Durable assertion |
| --- | --- | --- | --- | --- |
| `/app?mode=second` one mission | Prepared | Prepared | Prepared | Today plan remains capped at three |
| `/app/capture?mode=second` empty | Prepared | Prepared | Prepared | Fresh form state |
| rewrite input and saved confirmation | Prepared | — | — | Account-storage confirmation required |
| `/app/notes?mode=second` | Prepared | Prepared | Prepared | Synthetic source remains visible |
| completed detail | Prepared | Prepared | Prepared | Rewritten paragraph survives reload |
| `/app/review?mode=second` | Prepared | Prepared | Prepared | Synthetic source reaches the queue |
| keyboard/focus | Prepared | Prepared | Prepared | Today, rewrite save, and Review action |
| console/page/same-origin failures | Zero required | Zero required | Zero required | Counts only in manifest |

The suite also checks one `main` learner shell indirectly through the route surfaces, horizontal overflow, unsupported authority claims, a single dominant Today action, and visible focus indication.

## Exact deployment contract

The workflow runner SHA and target deployment SHA are different concepts:

- runner SHA: the branch revision containing this test;
- target deployment SHA: the application revision behind `E2E_BASE_URL`.

A run is not accepted without both. The target URL itself stays secret and is not emitted into the artifact. If the URL still points at the merged #560 Preview, the manifest may evidence that exact deployed revision only; it must not be described as proof of later branch application code.

## Manual run

From GitHub Actions, dispatch **E2E Smoke** on the intended branch:

- `suite`: `s227-invited-runtime`
- `target_sha`: exact 40-character git SHA deployed at the configured `E2E_BASE_URL`

The existing repository secrets are reused without inspection:

- `E2E_BASE_URL`
- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`
- fallback `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`
- `VERCEL_AUTOMATION_BYPASS_SECRET`

Expected artifact: `s227-invited-runtime-<run-id>`, retained for seven days.

## Remaining dependency and honest gate

Issue #558 says the final matrix must also include the S229 calculator runner v3. That dependency is not present on this branch and is intentionally not reimplemented here. After #562 is merged, update this branch from `main`, add the active/completed calculator states and any newly required detail error/offline evidence, then run the full invited-account matrix against an exact deployment of that head.

Until that occurs and a passing artifact is reviewed:

- this PR must use `Refs #558`, not `Closes #558`;
- #558 stays open;
- no public-launch or world-class completion claim is allowed;
- no calculator/device correctness claim is allowed;
- merge remains human-approved only.

## Attempt history

- Run 29326975617: safe prerequisites and exact host/SHA binding passed; no evidence accepted because authentication was non-2xx and the initial Capture assertion targeted an obsolete test id.
- Run 29327208505: exact target `48df4437fea8853250fcab00f7250c41f8d93a23` reached authenticated durable source/rewrite creation, comparison reload, Review, and six sanitized screenshots. The run is not accepted because a guardrail regex incorrectly rejected the explicit disclaimer `공식 채점 아님`; artifact 8308472156 is diagnostic-only.
- The next run narrows only that false-positive authority regex. It still rejects affirmative official grading, score, model-answer, pass, and AI-final-judgment claims.

## Evidence ledger

| Item | Required value | Current value |
| --- | --- | --- |
| Runner SHA | Exact branch head | Pending |
| Target deployment SHA | Exact deployed app head | Pending |
| Actions run | Passing manual run URL | Pending |
| 390/768/1440 screenshots | Sanitized artifact | Pending |
| Keyboard/focus | Manifest stop counts | Pending |
| Console errors | 0 | Pending |
| Page errors | 0 | Pending |
| Same-origin request failures | 0 | Pending |
| Durable save/reload | Pass | Pending |
| Notes / Review visibility | Pass | Pending |
| S229 calculator active/completed | Pass | Blocked by #562 |
