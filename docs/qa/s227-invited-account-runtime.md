# S227 Invited-Account Runtime Visual-Density QA

Status: the earlier S227 learner-loop matrix passed only against the exact #560 Preview revision. The #562 dependency is merged through #564, and #566 is also merged. The combined post-merge matrix is now prepared, but final #558 acceptance still requires one exact-head authenticated run and reviewed sanitized artifact.

## Scope

- Issue: #558
- Baseline: post-#564/#566 `main`
- Branch: `agent/s227-invited-runtime-qa`
- Runtime suite: `tests/e2e/s227-invited-runtime-acceptance.spec.ts`
- Dedicated Actions workflow: `.github/workflows/s227-runtime.yml`

This QA track changes tests, workflow wiring, and evidence documentation only. It does not change learner UI, calculator behavior, database schemas, migrations, APIs, payments, instructor routes, or shared shell design.

## Safety boundary

- A dedicated invited/test account is required.
- Only synthetic Korean sample data is created.
- The suite refuses known production hosts.
- A protected Vercel Preview requires `VERCEL_AUTOMATION_BYPASS_SECRET`.
- The workflow checks out the exact #565 PR head and derives both runner and target SHA from that current event.
- The approved #565 Preview alias is fixed in the workflow; runner and target SHA must be the same full 40-character value.
- Credentials and the runtime URL are redacted from captured diagnostics.
- Playwright trace, video, and implicit failure screenshots are disabled.
- The signed-in identity is masked in the DOM, visible email-like text is rejected before capture, and Tesseract runs a second fail-closed screenshot guard.
- Uploaded artifacts are limited to explicit sanitized `s227-*.png` files and a metadata-only JSON manifest.
- No raw private learner answer or copyrighted question text may be used.

## Current automated matrix

| Surface / transition | 390 | 768 | 1440 | Durable assertion |
| --- | --- | --- | --- | --- |
| `/app?mode=second` one mission | Prepared | Prepared | Prepared | Today plan remains capped at three |
| `/app/capture?mode=second` empty | Prepared | Prepared | Prepared | Fresh form state |
| rewrite input and saved confirmation | Prepared | — | — | Account-storage confirmation required |
| `/app/notes?mode=second` | Prepared | Prepared | Prepared | Synthetic source remains visible |
| detail normal | Prepared | Prepared | Prepared | Two evidence excerpts remain readable |
| detail empty-evidence | Prepared | Prepared | Prepared | Existing record shows the honest evidence-empty state |
| detail completed | Prepared | Prepared | Prepared | Rewritten paragraph survives reload |
| detail error / offline | Prepared | Prepared | Prepared | Expected invalid-ID boundary is isolated; `navigator.onLine` changes the state honestly |
| `/app/review?mode=second` | Prepared | Prepared | Prepared | Synthetic source reaches the queue |
| calculator active / completed | Prepared | Prepared | Prepared | One active step, all nine canonical steps, visible `기기 검증 전` |
| keyboard/focus | Prepared | Prepared | Prepared | Today, rewrite save, Review, and calculator continuation |
| console/page/same-origin failures | Zero required | Zero required | Zero required | Counts only in manifest |

The suite checks calculator active/completed and detail normal/empty-evidence/completed/error/offline at every viewport. It also checks one `main` learner shell indirectly through the route surfaces, horizontal overflow, unsupported authority claims, a single dominant Today action, and visible focus indication. The one deliberate invalid-UUID request used to reach the detail error boundary runs in an isolated page; the primary learner-loop page must still report zero unexpected console, page, and same-origin request failures.

## Exact deployment contract

The workflow runner SHA and target deployment SHA are different concepts:

- runner SHA: the branch revision containing this test;
- target deployment SHA: the application revision behind `E2E_BASE_URL`.

A run is not accepted unless both are full SHAs and equal. The dedicated workflow fixes the approved #565 Preview alias, checks out the exact current PR head, and records both SHAs in the manifest. The final run must target a deployment containing this branch plus merged #564 and #566; the earlier #560 Preview remains historical evidence only.

## Exact-head run

The dedicated workflow is intentionally one-shot and marker-gated:

1. Confirm Vercel reports the current #565 head as Ready at the fixed Preview alias.
2. Add `<!-- run-s227-auth-e2e -->` to the #565 body.
3. Synchronize the exact head so the `pull_request` workflow observes the marker.
4. Remove the marker as soon as the run appears; the already-started run keeps the exact event SHA.

The existing repository secrets are reused without inspection:

- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`
- fallback `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`
- `VERCEL_AUTOMATION_BYPASS_SECRET`

Expected artifact: `s227-invited-runtime-<run-id>`, retained for seven days.

## Remaining evidence gate

The #562 / S229 calculator dependency is merged through #564. This branch now consumes that product implementation from `main` and adds calculator active/completed plus detail normal/empty-evidence/completed/error/offline runtime coverage without duplicating or changing product code.

Until an exact deployment of the combined head passes and its artifact is reviewed:

- this PR must use `Refs #558`, not `Closes #558`;
- #558 stays open;
- no public-launch or world-class completion claim is allowed;
- no calculator/device correctness claim is allowed;
- the calculator must continue to display `기기 검증 전` and the manifest must record `realDeviceVerified: false`;
- merge remains human-approved only.

## Attempt history

- Run 29326975617: safe prerequisites and exact host/SHA binding passed; no evidence accepted because authentication was non-2xx and the initial Capture assertion targeted an obsolete test id.
- Run 29327208505: exact target `48df4437fea8853250fcab00f7250c41f8d93a23` reached authenticated durable source/rewrite creation, comparison reload, Review, and six sanitized screenshots. The run is not accepted because a guardrail regex incorrectly rejected the explicit disclaimer `공식 채점 아님`; artifact 8308472156 is diagnostic-only.
- Run 29327563789: the primary attempt reached durable save/reload and six screenshots, then exposed an over-eager mobile viewport assertion after the Review action had received keyboard focus. The retry was rejected by login HTTP 400. Artifact 8308601810 is diagnostic-only.
- Run 29328078708: **passed**. The first Playwright attempt was rejected by login HTTP 400; the unchanged bounded-auth policy did not retry that non-transient response. Playwright's isolated retry then completed the full matrix. Artifact 8308839274 contains the pass manifest and 18 sanitized screenshots; digest `sha256:09ad382e572501e789cde3acb53f63d48b2ecdcde538bc9535c1533efc9ae1a9`. Treat the initial 400 as an authentication flake to monitor, not as evidence of stable first-attempt login.
- The successful PR check executed merge SHA `4e255699d06d34e10a913180182911fbb7a8ec86`, generated from branch head `e3417a6c9dd915d65213eb78c376b9f1076df210` and baseline `e054485201f6671dfc28bca4fc940cb30cd65f18`. The target deployment was independently pinned to `48df4437fea8853250fcab00f7250c41f8d93a23`.

## Evidence ledger

| Item | Required value | Current value |
| --- | --- | --- |
| Runner SHA | Exact branch head | `e3417a6c9dd915d65213eb78c376b9f1076df210` (executed PR merge: `4e255699d06d34e10a913180182911fbb7a8ec86`) |
| Target deployment SHA | Exact deployed app head | `48df4437fea8853250fcab00f7250c41f8d93a23` |
| Actions run | Passing run URL | [29328078708](https://github.com/chachathecat/inverge/actions/runs/29328078708) |
| 390/768/1440 screenshots | Sanitized artifact | 18 PNGs in artifact 8308839274 |
| Keyboard/focus | Manifest stop counts | Pass — detail 10, save 11, Today 8 each, Review 9 |
| Console errors | 0 | 0 |
| Page errors | 0 | 0 |
| Same-origin request failures | 0 | 0 |
| Durable save/reload | Pass | Pass |
| Notes / Review visibility | Pass | Pass |
| Post-merge combined runner/target SHA | Exact and equal to deployed head | Pending new run |
| Detail normal/empty-evidence/completed/error/offline | Pass at 390/768/1440 | Prepared; pending new run |
| S229 calculator active/completed | Pass at 390/768/1440 | Prepared from merged #564; pending new run |
| Physical-device claim | Must remain unverified | `기기 검증 전`; no calculator/device correctness claim |
